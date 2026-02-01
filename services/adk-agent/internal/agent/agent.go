package agent

import (
	"context"
	"fmt"

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

// LLMClient abstracts the underlying LLM provider
type LLMClient interface {
	ChatCompletion(ctx context.Context, req openai.ChatCompletionRequest) (openai.ChatCompletionResponse, error)
	StreamChatCompletion(ctx context.Context, req openai.ChatCompletionRequest) (*openai.ChatCompletionStream, error)
}

// Agent defines the interface for all specialized agents
type Agent interface {
	Name() string
	Tools() []openai.Tool
	ExecuteTool(ctx context.Context, toolCall openai.ToolCall, reqCtx RequestContext) (string, error)
	Process(ctx context.Context, messages []Message, reqCtx RequestContext) (<-chan string, error)
	GetClient() LLMClient
	GetModel() string
}

// BaseAgent holds common dependencies
type BaseAgent struct {
	Client LLMClient
	Model  string
}

func (b *BaseAgent) GetClient() LLMClient {
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
