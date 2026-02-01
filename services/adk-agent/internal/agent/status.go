package agent

import (
	"context"
	"fmt"

	"github.com/lutagu/adk-agent/internal/infrastructure/odpt"
	"google.golang.org/adk/agent"
	"google.golang.org/adk/agent/llmagent"
	"google.golang.org/adk/model"
	"google.golang.org/adk/tool"
)

type StatusAgent struct {
	BaseAgent
	agent.Agent
}

func NewStatusAgent(modelInstance model.LLM, modelID string, odptClient *odpt.Client) (*StatusAgent, error) {
	statusTool := &GetTrainStatusTool{
		FetchFunc: func() (string, error) {
			if odptClient == nil {
				return "ODPT client not configured.", nil
			}
			statusList, err := odptClient.FetchTrainStatus()
			if err != nil {
				return "", err
			}
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
		},
	}

	systemPrompt := `
You are the Status Agent for LUTAGU.
Your role is to explain train operation status, delays, and disruptions in Tokyo.
USE THE "get_train_status" TOOL to check for delays.

Structure your response:
1.  **Current Status**: Highlight any DELAY or SUSPENDED lines found.
2.  **Details**: Explain the cause.
3.  **Advice**: Suggest alternatives if suspended.
`
	inner, err := llmagent.New(llmagent.Config{
		Name:        "status_agent",
		Model:       modelInstance,
		Description: "Handles real-time transit status and disruptions",
		Instruction: systemPrompt,
		Tools:       []tool.Tool{statusTool},
	})
	if err != nil {
		return nil, err
	}

	return &StatusAgent{
		BaseAgent: BaseAgent{
			ModelInstance: modelInstance,
			ModelID:       modelID,
		},
		Agent: inner,
	}, nil
}

func (a *StatusAgent) Process(ctx context.Context, messages []Message, reqCtx RequestContext) (<-chan string, error) {
	ch := make(chan string)

	// Convert history for ADK
	history := ToGenAIContent(messages)

	go func() {
		defer close(ch)

		_, err := RunAgentStreaming(ctx, a.Agent, history, ch)
		if err != nil {
			ch <- fmt.Sprintf("Error: %v", err)
			return
		}
	}()

	return ch, nil
}
