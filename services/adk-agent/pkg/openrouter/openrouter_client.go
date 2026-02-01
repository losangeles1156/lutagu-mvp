package openrouter

import (
	"context"
	"errors"

	openai "github.com/sashabaranov/go-openai"
)

const (
	DefaultBaseURL = "https://openrouter.ai/api/v1"
)

type Config struct {
	APIKey  string
	BaseURL string
}

type Client struct {
	client *openai.Client
}

func NewClient(cfg Config) (*Client, error) {
	if cfg.APIKey == "" {
		return nil, errors.New("API key is required")
	}

	baseURL := cfg.BaseURL
	if baseURL == "" {
		baseURL = DefaultBaseURL
	}

	config := openai.DefaultConfig(cfg.APIKey)
	config.BaseURL = baseURL

	return &Client{
		client: openai.NewClientWithConfig(config),
	}, nil
}

func (c *Client) ChatCompletion(ctx context.Context, req openai.ChatCompletionRequest) (openai.ChatCompletionResponse, error) {
	return c.client.CreateChatCompletion(ctx, req)
}

func (c *Client) StreamChatCompletion(ctx context.Context, req openai.ChatCompletionRequest) (*openai.ChatCompletionStream, error) {
	return c.client.CreateChatCompletionStream(ctx, req)
}
