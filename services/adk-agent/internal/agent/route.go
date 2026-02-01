package agent

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"

	openai "github.com/sashabaranov/go-openai"
)

type RouteAgent struct {
	BaseAgent
	RoutingURL string
}

func NewRouteAgent(client LLMClient, model string, routingURL string) *RouteAgent {
	return &RouteAgent{
		BaseAgent: BaseAgent{
			Client: client,
			Model:  model,
		},
		RoutingURL: routingURL,
	}
}

func (a *RouteAgent) Name() string {
	return "route_agent"
}

// Tools returns the available tools for this agent
func (a *RouteAgent) Tools() []openai.Tool {
	return []openai.Tool{
		{
			Type: openai.ToolTypeFunction,
			Function: &openai.FunctionDefinition{
				Name:        "search_route",
				Description: "Find the best transit route between two stations.",
				Parameters: json.RawMessage(`{
                    "type": "object",
                    "properties": {
                        "original": {"type": "string", "description": "Origin station name (e.g. Tokyo Station)"},
                        "destination": {"type": "string", "description": "Destination station name (e.g. Shinjuku Station)"}
                    },
                    "required": ["original", "destination"]
                }`),
			},
		},
	}
}

// ExecuteTool performs the logic for a tool call
func (a *RouteAgent) ExecuteTool(ctx context.Context, toolCall openai.ToolCall, reqCtx RequestContext) (string, error) {
	if toolCall.Function.Name == "search_route" {
		var args struct {
			Original    string `json:"original"`
			Destination string `json:"destination"`
		}
		if err := json.Unmarshal([]byte(toolCall.Function.Arguments), &args); err != nil {
			return "", fmt.Errorf("invalid arguments: %v", err)
		}

		// Call External Routing Service (Rust L4)
		// GET /l4/route?from={origin}&to={destination}&max_hops=5
		// Note: The service expects Station IDs or Names. It handles basic name resolution.

		reqURL := fmt.Sprintf("%s?from=%s&to=%s&max_hops=5&locale=%s", a.RoutingURL, url.QueryEscape(args.Original), url.QueryEscape(args.Destination), reqCtx.Locale)
		resp, err := http.Get(reqURL)
		if err != nil {
			return fmt.Sprintf("Error calling routing service: %v. Please try again later.", err), nil
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			return fmt.Sprintf("Routing service returned error status: %s", resp.Status), nil
		}

		bodyBytes, err := io.ReadAll(resp.Body)
		if err != nil {
			return fmt.Sprintf("Error reading routing response: %v", err), nil
		}

		// Parse and format the response for the LLM
		// The service returns JSON with "routes". We want to summarize it for the LLM to explain.
		var routeResp struct {
			Routes []struct {
				Key     string `json:"key"`
				Configs struct {
					Time      float64 `json:"time"`
					Transfers int     `json:"transfers"`
					Cost      float64 `json:"cost"` // Note: L4 might return 'cost' or similar fields
				} `json:"costs"`
				Path []string `json:"path"`
			} `json:"routes"`
			Error string `json:"error"`
		}

		if err := json.Unmarshal(bodyBytes, &routeResp); err != nil {
			// Fallback: Return raw JSON segment if parsing fails (flexible for LLM)
			return fmt.Sprintf("Route Data (JSON): %s", string(bodyBytes)), nil
		}

		if routeResp.Error != "" {
			return fmt.Sprintf("Routing Error: %s", routeResp.Error), nil
		}

		if len(routeResp.Routes) == 0 {
			return fmt.Sprintf("No routes found from %s to %s.", args.Original, args.Destination), nil
		}

		// Summarize top route
		topRoute := routeResp.Routes[0]
		summary := fmt.Sprintf("Found %d routes. Best option (%s):\n- Time: %.0f min\n- Transfers: %d\n- Path: %s",
			len(routeResp.Routes),
			topRoute.Key,
			topRoute.Configs.Time,
			topRoute.Configs.Transfers,
			strings.Join(topRoute.Path, " -> "))

		return summary, nil
	}
	return "", fmt.Errorf("unknown tool: %s", toolCall.Function.Name)
}

func (a *RouteAgent) Process(ctx context.Context, messages []Message, reqCtx RequestContext) (<-chan string, error) {
	// Determine system prompt
	sysPrompt := `
You are the Route Agent for LUTAGU. 
Your goal is to provide accurate transit route suggestions in Tokyo.
USE THE "search_route" TOOL to find paths. Do not guess.

Structure your response clearly:
1.  **Summary**: Quick answer.
2.  **Details**: Step-by-step path.
3.  **Tips**: Provide one useful tip.

User Locale: ` + reqCtx.Locale + `
`
	// Append System Prompt to the BEGINNING of messages or handle inside Orchestrator?
	// Usually Orchestrator handles Chat History. Ideally System Prompt is at index 0.
	// Let's prepend it here before passing to Orchestrator.
	msgsWithSys := append([]Message{{Role: "system", Content: sysPrompt}}, messages...)

	orchestrator := NewOrchestrator(a)
	return orchestrator.Run(ctx, msgsWithSys, reqCtx)
}
