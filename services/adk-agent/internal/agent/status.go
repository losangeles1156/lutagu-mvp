package agent

import (
    "context"
    "encoding/json"
    "fmt"

    "github.com/lutagu/adk-agent/internal/infrastructure/odpt"
    "github.com/lutagu/adk-agent/pkg/openrouter"
    openai "github.com/sashabaranov/go-openai"
)

type StatusAgent struct {
    BaseAgent
    OdptClient *odpt.Client
}

func NewStatusAgent(client *openrouter.Client, model string, odptClient *odpt.Client) *StatusAgent {
    return &StatusAgent{
        BaseAgent: BaseAgent{
            Client: client,
            Model:  model,
        },
        OdptClient: odptClient,
    }
}

func (a *StatusAgent) Name() string {
    return "status_agent"
}

// Tools returns the available tools for this agent
func (a *StatusAgent) Tools() []openai.Tool {
    return []openai.Tool{
        {
            Type: openai.ToolTypeFunction,
            Function: &openai.FunctionDefinition{
                Name:        "get_train_status",
                Description: "Get real-time operation status of Tokyo train lines.",
                Parameters: json.RawMessage(`{
                    "type": "object",
                    "properties": {},
                    "required": []
                }`),
            },
        },
    }
}

// ExecuteTool performs the logic for a tool call
func (a *StatusAgent) ExecuteTool(ctx context.Context, toolCall openai.ToolCall, reqCtx RequestContext) (string, error) {
    if toolCall.Function.Name == "get_train_status" {
        if a.OdptClient == nil {
            return "ODPT client not configured.", nil
        }

        statusList, err := a.OdptClient.FetchTrainStatus()
        if err != nil {
            return fmt.Sprintf("Error fetching data: %v", err), nil
        }

        // Filter for delays/issues to save tokens
        var result string
        count := 0
        for _, s := range statusList {
            if s.Status != "normal" {
                result += fmt.Sprintf("- %s: %s (Status: %s)\n", s.Railway, s.Text, s.Status)
                count++
            }
        }
        if count == 0 {
            return "All lines are operating normally.", nil
        }
        return result, nil
    }
    return "", fmt.Errorf("unknown tool: %s", toolCall.Function.Name)
}

func (a *StatusAgent) Process(ctx context.Context, messages []Message, reqCtx RequestContext) (<-chan string, error) {
    sysPrompt := `
You are the Status Agent for LUTAGU.
Your role is to explain train operation status, delays, and disruptions in Tokyo.
USE THE "get_train_status" TOOL to check for delays.

Structure your response:
1.  **Current Status**: Highlight any DELAY or SUSPENDED lines found.
2.  **Details**: Explain the cause.
3.  **Advice**: Suggest alternatives if suspended.

User Locale: ` + reqCtx.Locale + `
`
    msgsWithSys := append([]Message{{Role: "system", Content: sysPrompt}}, messages...)

    orchestrator := NewOrchestrator(a)
    return orchestrator.Run(ctx, msgsWithSys, reqCtx)
}
