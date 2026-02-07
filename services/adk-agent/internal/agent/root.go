package agent

import (
	"context"
	"fmt"
	"log/slog"
	"strings"

	"google.golang.org/adk/agent"
	"google.golang.org/adk/agent/llmagent"
	"google.golang.org/adk/model"
)

type RootAgent struct {
	BaseAgent
	agent.Agent
}

func NewRootAgent(modelInstance model.LLM, modelID string) (*RootAgent, error) {
	systemPrompt := `
You are the Root Agent for the Tokyo Transit Assistant (LUTAGU).
Your job is to specifically identifying the user's INTENT and routing it to the correct specialized agent.

Authorized Intents:
- ROUTE: User wants to go from A to B, or asks about path finding.
- STATUS: User asks about train delays, operation status, or suspended lines.
- FACILITY: User asks about lockers, toilets, WiFi, or station maps.
- GENERAL: General chat, greetings, or questions about Tokyo tourism not covered above.

Output format: ONLY the Intent Name (ROUTE, STATUS, FACILITY, GENERAL).
Do not explain your reasoning.
`
	inner, err := llmagent.New(llmagent.Config{
		Name:        "lutagu_root",
		Model:       modelInstance,
		Description: "Routes user queries to specialized agents",
		Instruction: systemPrompt,
	})
	if err != nil {
		return nil, err
	}

	return &RootAgent{
		BaseAgent: BaseAgent{
			ModelInstance: modelInstance,
			ModelID:       modelID,
		},
		Agent: inner,
	}, nil
}

func (a *RootAgent) Process(ctx context.Context, messages []Message, reqCtx RequestContext) (<-chan string, error) {
	ch := make(chan string, 1)

	// Convert history for ADK
	history := ToGenAIContent(messages)

	go func() {
		defer close(ch)
		// For RootAgent, we don't strictly need real-time streaming to the user since it's an internal classifier.
		// However, using the streaming function unifies the architecture.
		// We capture the output into a buffer to determine intent.

		internalCh := make(chan string)
		var fullResponse strings.Builder

		go func() {
			for chunk := range internalCh {
				fullResponse.WriteString(chunk)
			}
		}()

		respText, err := RunAgentStreamingWithOptions(ctx, a.Agent, history, internalCh, RunOptions{
			SessionID:         reqCtx.SessionID,
			UserID:            reqCtx.UserID,
			AppName:           "lutagu",
			MaxHistoryTurns:   historyTurnsFromBudget(reqCtx.HistoryBudgetTokens, 2),
			MaxContextTokens:  reqCtx.MaxContextTokens,
			StripInternalTags: shouldStripInternalTags(reqCtx.PromptProfile),
		})
		close(internalCh) // Close internal captured channel

		if err != nil {
			slog.Error("RootAgent processing failed", "error", err)
			ch <- friendlyAgentError(reqCtx.Locale)
			return
		}

		// Use the returned full text from RunAgentStreaming as it's reliable
		intent := strings.TrimSpace(respText)
		intent = strings.ToUpper(intent)
		ch <- fmt.Sprintf("INTENT_DETECTED:%s", intent)
	}()

	return ch, nil
}
