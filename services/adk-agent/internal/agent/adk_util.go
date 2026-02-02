package agent

import (
	"context"
	"fmt"
	"strings"
	"time"

	"google.golang.org/adk/agent"
	"google.golang.org/adk/model"
	"google.golang.org/adk/runner"
	"google.golang.org/adk/session"
	"google.golang.org/genai"
)

// RunAgentStreaming executes an ADK agent and streams the response text to a channel.
// It also accumulates the full response text to return at the end.
func RunAgentStreaming(ctx context.Context, a agent.Agent, history []*genai.Content, outCh chan<- string) (string, error) {
	// 1. Create Memory Service
	svc := session.InMemoryService()
	sessionID := "default_session"
	userID := "default_user"

	// 2. Pre-populate history to avoid Context Amnesia
	// We need to create the session first
	resp, err := svc.Create(ctx, &session.CreateRequest{
		SessionID: sessionID,
		UserID:    userID,
		AppName:   "lutagu",
	})
	if err != nil {
		return "", fmt.Errorf("failed to create session: %w", err)
	}

	// Append history events
	// Note: We skip the last message because that is the 'trigger' for Run
	for i := 0; i < len(history)-1; i++ {
		h := history[i]
		// Determine author based on role
		author := "user"
		if h.Role == "model" || h.Role == "assistant" {
			author = "model"
		}

		err := svc.AppendEvent(ctx, resp.Session, &session.Event{
			ID:        fmt.Sprintf("hist-%d", i),
			Timestamp: time.Now(), // Faked timestamp
			Author:    author,
			LLMResponse: model.LLMResponse{
				Content: h,
			},
		})
		if err != nil {
			// Log warning but continue? Or fail?
			// For debug, let's just ignore errors as history best-effort
		}
	}

	// 3. Create Runner with the populated service
	r, err := runner.New(runner.Config{
		AppName:        "lutagu",
		Agent:          a,
		SessionService: svc,
	})
	if err != nil {
		return "", fmt.Errorf("failed to create runner: %w", err)
	}

	// 4. Prepare user content (The last message is the "trigger")
	var userContent *genai.Content
	if len(history) > 0 {
		userContent = history[len(history)-1]
	} else {
		return "", fmt.Errorf("no input provided")
	}

	// 5. Run the agent and iter
	events := r.Run(ctx, userID, sessionID, userContent, agent.RunConfig{})

	var fullText strings.Builder
	for e, err := range events {
		if err != nil {
			return fullText.String(), fmt.Errorf("agent run error: %w", err)
		}

		if e.Content != nil {
			for _, p := range e.Content.Parts {
				if p.Text != "" {
					outCh <- p.Text
					fullText.WriteString(p.Text)
				}
			}
		}
	}

	return fullText.String(), nil
}

// ToGenAIContent with history preservation logic
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
