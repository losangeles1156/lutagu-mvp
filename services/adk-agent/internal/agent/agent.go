package agent

import (
	"context"

	"google.golang.org/adk/model"
)

// Message mimics the OpenAI chat message structure (for compatibility)
type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
	Name    string `json:"name,omitempty"`
}

// RequestContext holds session-specific info
type RequestContext struct {
	SessionID string
	Locale    string
	UserID    string
}

// Agent wraps the ADK logic with LUTAGU specific methods for backward compatibility
type Agent interface {
	Process(ctx context.Context, messages []Message, reqCtx RequestContext) (<-chan string, error)
	GetModel() string
}

// BaseAgent holds common dependencies using ADK types
type BaseAgent struct {
	ModelInstance model.LLM
	ModelID       string
}

func (b *BaseAgent) GetModel() string {
	return b.ModelID
}
