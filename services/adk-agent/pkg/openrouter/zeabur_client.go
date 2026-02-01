package openrouter

import (
	"context"
	"errors"

	openai "github.com/sashabaranov/go-openai"
)

const (
	ZeaburBaseURL = "https://api.zeabur.com/ai/v1"
)

type ZeaburConfig struct {
	APIKey  string
	BaseURL string
}

type ZeaburClient struct {
	client *openai.Client
}

func NewZeaburClient(cfg ZeaburConfig) (*ZeaburClient, error) {
	if cfg.APIKey == "" {
		return nil, errors.New("API key is required")
	}

	config := openai.DefaultConfig(cfg.APIKey)
	if cfg.BaseURL != "" {
		config.BaseURL = cfg.BaseURL
	} else {
		config.BaseURL = "https://hnd1.aihub.zeabur.ai/v1" // Update default to Tokyo
	}

	return &ZeaburClient{
		client: openai.NewClientWithConfig(config),
	}, nil
}

// ChatCompletion wraps the OpenAI ChatCompletion API
func (c *ZeaburClient) ChatCompletion(ctx context.Context, req openai.ChatCompletionRequest) (openai.ChatCompletionResponse, error) {
	return c.client.CreateChatCompletion(ctx, req)
}

// StreamChatCompletion wraps the OpenAI Stream API
func (c *ZeaburClient) StreamChatCompletion(ctx context.Context, req openai.ChatCompletionRequest) (*openai.ChatCompletionStream, error) {
	return c.client.CreateChatCompletionStream(ctx, req)
}
