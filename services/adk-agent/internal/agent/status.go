package agent

import (
	"context"
	"log/slog"

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
	statusTool := NewGetTrainStatusFunctionTool(odptClient)

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

		_, err := RunAgentStreamingWithOptions(ctx, a.Agent, history, ch, RunOptions{
			SessionID:         reqCtx.SessionID,
			UserID:            reqCtx.UserID,
			AppName:           "lutagu",
			MaxHistoryTurns:   historyTurnsFromBudget(reqCtx.HistoryBudgetTokens, 2),
			MaxContextTokens:  reqCtx.MaxContextTokens,
			StripInternalTags: shouldStripInternalTags(reqCtx.PromptProfile),
		})
		if err != nil {
			slog.Error("StatusAgent processing failed", "error", err)
			ch <- friendlyAgentError(reqCtx.Locale)
			return
		}
	}()

	return ch, nil
}
