package agent

import (
	"context"
	"fmt"

	"google.golang.org/adk/agent"
	"google.golang.org/adk/agent/llmagent"
	"google.golang.org/adk/model"
	"google.golang.org/adk/tool"
)

// GeneralAgent is used for general reasoning and chatting
type GeneralAgent struct {
	BaseAgent
	agent.Agent
}

// NewGeneralAgent creates a new general reasoning agent
func NewGeneralAgent(modelInstance model.LLM, modelID string, tools []tool.Tool) (*GeneralAgent, error) {
	fmt.Printf("DEBUG: NewGeneralAgent received %d tools\n", len(tools))
	inner, err := llmagent.New(llmagent.Config{
		Name:        "general_agent",
		Model:       modelInstance,
		Description: "General reasoning and conversation agent",
		Instruction: "You are a helpful Tokyo transit assistant. Policy: (1) Use plan_route for route questions, get_current_time for time-sensitive questions. (2) Respond with conclusion first in concise mode; only expand details when user asks why/details. (3) If user asks comparison, explain recommended and not-recommended option briefly. (4) Use exact line names when available (e.g., 上野東京線). (5) Always end with an actionable conclusion.",
		Tools:       tools,
	})
	if err != nil {
		return nil, err
	}

	return &GeneralAgent{
		BaseAgent: BaseAgent{
			ModelInstance: modelInstance,
			ModelID:       modelID,
		},
		Agent: inner,
	}, nil
}

func (a *GeneralAgent) Process(ctx context.Context, messages []Message, reqCtx RequestContext) (<-chan string, error) {
	ch := make(chan string)

	// Convert history for ADK
	history := ToGenAIContent(messages)

	go func() {
		defer close(ch)

		// RunAgentStreaming pumps directly to 'ch'
		_, err := RunAgentStreamingWithOptions(ctx, a.Agent, history, ch, RunOptions{
			SessionID:         reqCtx.SessionID,
			UserID:            reqCtx.UserID,
			AppName:           "lutagu",
			MaxHistoryTurns:   historyTurnsFromBudget(reqCtx.HistoryBudgetTokens, 3),
			MaxContextTokens:  reqCtx.MaxContextTokens,
			StripInternalTags: shouldStripInternalTags(reqCtx.PromptProfile),
		})
		if err != nil {
			ch <- fmt.Sprintf("Error: %v", err)
			return
		}
	}()

	return ch, nil
}
