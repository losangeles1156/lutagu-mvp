package agent

import (
	"context"
	"fmt"

	"google.golang.org/adk/agent"
	"google.golang.org/adk/agent/llmagent"
	"google.golang.org/adk/model"
	"google.golang.org/adk/tool"
)

type RouteAgent struct {
	BaseAgent
	agent.Agent
}

func NewRouteAgent(modelInstance model.LLM, modelID string, routingURL string) (*RouteAgent, error) {
	routeTool := &SearchRouteTool{RoutingURL: routingURL}

	systemPrompt := `
You are the Route Agent for LUTAGU. 
Your goal is to provide accurate transit route suggestions in Tokyo.
USE THE "search_route" TOOL to find paths. Do not guess.

Structure your response clearly:
1.  **Summary**: Quick answer.
2.  **Details**: Step-by-step path.
3.  **Tips**: Provide one useful tip.
`
	inner, err := llmagent.New(llmagent.Config{
		Name:        "route_agent",
		Model:       modelInstance,
		Description: "Handles route planning and transit searches",
		Instruction: systemPrompt,
		Tools:       []tool.Tool{routeTool},
	})
	if err != nil {
		return nil, err
	}

	return &RouteAgent{
		BaseAgent: BaseAgent{
			ModelInstance: modelInstance,
			ModelID:       modelID,
		},
		Agent: inner,
	}, nil
}

func (a *RouteAgent) Process(ctx context.Context, messages []Message, reqCtx RequestContext) (<-chan string, error) {
	ch := make(chan string)

	go func() {
		defer close(ch)

		var lastContent string
		if len(messages) > 0 {
			lastContent = messages[len(messages)-1].Content
		}

		respText, err := RunAgentSync(ctx, a.Agent, lastContent)
		if err != nil {
			ch <- fmt.Sprintf("Error: %v", err)
			return
		}

		ch <- respText
	}()

	return ch, nil
}
