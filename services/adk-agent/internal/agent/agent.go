package agent

import (
    "context"

    "github.com/lutagu/adk-agent/pkg/openrouter"
)

// Message mimics the OpenAI chat message structure
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

// Agent defines the interface for all specialized agents
type Agent interface {
    // Name returns the unique identifier of the agent
    Name() string
    
    // Process handles the user query and returns a response stream or single message
    // It takes the chat history and context
    Process(ctx context.Context, messages []Message, reqCtx RequestContext) (<-chan string, error)
}

// BaseAgent holds common dependencies
type BaseAgent struct {
    Client *openrouter.Client
    Model  string
}
