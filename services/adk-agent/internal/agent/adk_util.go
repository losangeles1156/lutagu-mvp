package agent

import (
	"context"
	"fmt"
	"strings"

	"google.golang.org/adk/agent"
	"google.golang.org/adk/runner"
	"google.golang.org/adk/session"
	"google.golang.org/genai"
)

// RunAgentSync is a helper to run an ADK agent synchronously and return the final text
func RunAgentSync(ctx context.Context, a agent.Agent, text string) (string, error) {
	// 1. Create a minimal Runner
	// For LUTAGU's stateless Process calls, we use an in-memory session.
	r, err := runner.New(runner.Config{
		AppName:        "lutagu",
		Agent:          a,
		SessionService: session.InMemoryService(),
	})
	if err != nil {
		return "", fmt.Errorf("failed to create runner: %w", err)
	}

	// 2. Prepare user content
	userContent := &genai.Content{
		Role:  "user",
		Parts: []*genai.Part{{Text: text}},
	}

	// 3. Run the agent and collect events
	// UserID and SessionID can be static for synchronous stateless calls
	events := r.Run(ctx, "default_user", "default_session", userContent, agent.RunConfig{})

	var fullText strings.Builder
	for e, err := range events {
		if err != nil {
			return "", fmt.Errorf("agent run error: %w", err)
		}

		// Collect model response text
		if e.Content != nil {
			for _, p := range e.Content.Parts {
				if p.Text != "" {
					fullText.WriteString(p.Text)
				}
			}
		}
	}

	return fullText.String(), nil
}

// ToGenAIContent is a temporary bridge for legacy Message formats
func ToGenAIContent(msgs []Message) []*genai.Content {
	var res []*genai.Content
	for _, m := range msgs {
		role := m.Role
		if role == "assistant" {
			role = "model"
		}
		res = append(res, &genai.Content{
			Role: role,
			Parts: []*genai.Part{
				{Text: m.Content},
			},
		})
	}
	return res
}
