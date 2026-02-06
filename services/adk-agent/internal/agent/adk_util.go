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

type RunOptions struct {
	SessionID         string
	UserID            string
	AppName           string
	MaxHistoryTurns   int
	MaxContextTokens  int
	StripInternalTags bool
}

// RunAgentStreaming executes an ADK agent and streams the response text to a channel.
// It also accumulates the full response text to return at the end.
func RunAgentStreaming(ctx context.Context, a agent.Agent, history []*genai.Content, outCh chan<- string) (string, error) {
	return RunAgentStreamingWithOptions(ctx, a, history, outCh, RunOptions{})
}

func RunAgentStreamingWithOptions(ctx context.Context, a agent.Agent, history []*genai.Content, outCh chan<- string, opts RunOptions) (string, error) {
	// 1. Create Memory Service
	svc := session.InMemoryService()
	sessionID := strings.TrimSpace(opts.SessionID)
	if sessionID == "" {
		sessionID = fmt.Sprintf("session-%d", time.Now().UnixNano())
	}
	userID := strings.TrimSpace(opts.UserID)
	if userID == "" {
		userID = "guest-user"
	}
	appName := strings.TrimSpace(opts.AppName)
	if appName == "" {
		appName = "lutagu"
	}

	if opts.MaxHistoryTurns <= 0 {
		opts.MaxHistoryTurns = 6
	}
	if opts.MaxContextTokens <= 0 {
		opts.MaxContextTokens = 1000
	}
	if !opts.StripInternalTags {
		opts.StripInternalTags = true
	}

	history = pruneHistory(history, opts.MaxHistoryTurns, opts.MaxContextTokens, opts.StripInternalTags)

	// 2. Pre-populate history to avoid Context Amnesia
	// We need to create the session first
	resp, err := svc.Create(ctx, &session.CreateRequest{
		SessionID: sessionID,
		UserID:    userID,
		AppName:   appName,
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
		AppName:        appName,
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

func pruneHistory(history []*genai.Content, maxTurns int, maxContextTokens int, stripInternal bool) []*genai.Content {
	if len(history) == 0 {
		return history
	}

	last := history[len(history)-1]
	base := history[:len(history)-1]

	start := len(base) - maxTurns*2
	if start < 0 {
		start = 0
	}
	window := base[start:]

	if stripInternal {
		window = sanitizeContents(window)
		last = sanitizeContent(last)
	}

	approxCharsBudget := maxContextTokens * 4
	var selected []*genai.Content
	used := 0
	for i := len(window) - 1; i >= 0; i-- {
		size := approxContentChars(window[i])
		if used+size > approxCharsBudget {
			continue
		}
		selected = append([]*genai.Content{window[i]}, selected...)
		used += size
	}

	selected = append(selected, last)
	return selected
}

func sanitizeContents(contents []*genai.Content) []*genai.Content {
	out := make([]*genai.Content, 0, len(contents))
	for _, c := range contents {
		out = append(out, sanitizeContent(c))
	}
	return out
}

func sanitizeContent(c *genai.Content) *genai.Content {
	if c == nil {
		return c
	}
	clone := &genai.Content{Role: c.Role}
	for _, p := range c.Parts {
		if p == nil {
			continue
		}
		if p.Text != "" {
			t := p.Text
			t = stripRangeTag(t, "[THINKING]", "[/THINKING]")
			t = stripRangeTag(t, "[TOOL_TRACE]", "[/TOOL_TRACE]")
			t = stripRangeTag(t, "[DECISION_TRACE]", "[/DECISION_TRACE]")
			clone.Parts = append(clone.Parts, &genai.Part{Text: strings.TrimSpace(t)})
			continue
		}
		clone.Parts = append(clone.Parts, p)
	}
	return clone
}

func stripRangeTag(text, startTag, endTag string) string {
	lower := strings.ToLower(text)
	start := strings.ToLower(startTag)
	end := strings.ToLower(endTag)
	for {
		i := strings.Index(lower, start)
		if i < 0 {
			break
		}
		j := strings.Index(lower[i:], end)
		if j < 0 {
			text = text[:i]
			break
		}
		j = i + j + len(endTag)
		text = text[:i] + text[j:]
		lower = strings.ToLower(text)
	}
	return text
}

func approxContentChars(c *genai.Content) int {
	total := 0
	if c == nil {
		return total
	}
	for _, p := range c.Parts {
		if p != nil {
			total += len([]rune(p.Text))
		}
	}
	return total
}
