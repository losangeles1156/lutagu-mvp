package agent

import (
    "context"
    "fmt"

    "github.com/lutagu/adk-agent/pkg/openrouter"
    openai "github.com/sashabaranov/go-openai"
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
    
    // Tools returns the list of tools available to this agent
    Tools() []openai.Tool

    // ExecuteTool performs the logic for a tool call
    ExecuteTool(ctx context.Context, toolCall openai.ToolCall, reqCtx RequestContext) (string, error)

    // Process handles the user query and returns a response stream or single message
    // It takes the chat history and context
    Process(ctx context.Context, messages []Message, reqCtx RequestContext) (<-chan string, error)

    // Accessors for Orchestrator
    GetClient() *openrouter.Client
    GetModel() string
}

// BaseAgent holds common dependencies
type BaseAgent struct {
    Client *openrouter.Client
    Model  string
}

func (b *BaseAgent) GetClient() *openrouter.Client {
    return b.Client
}

func (b *BaseAgent) GetModel() string {
    return b.Model
}

func (b *BaseAgent) Tools() []openai.Tool {
    return []openai.Tool{}
}

func (b *BaseAgent) ExecuteTool(ctx context.Context, toolCall openai.ToolCall, reqCtx RequestContext) (string, error) {
    return "", fmt.Errorf("tool execution not implemented")
}
