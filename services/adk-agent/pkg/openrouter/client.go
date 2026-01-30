package openrouter

import (
    "context"
    "errors"
    
    openai "github.com/sashabaranov/go-openai"
)

const (
    BaseURL = "https://openrouter.ai/api/v1"
)

type Config struct {
    APIKey string
}

type Client struct {
    client *openai.Client
}

func NewClient(cfg Config) (*Client, error) {
    if cfg.APIKey == "" {
        return nil, errors.New("API key is required")
    }

    config := openai.DefaultConfig(cfg.APIKey)
    config.BaseURL = BaseURL
    
    // OpenRouter specific headers can be added here if needed
    
    return &Client{
        client: openai.NewClientWithConfig(config),
    }, nil
}

// ChatCompletion wraps the OpenAI ChatCompletion API
func (c *Client) ChatCompletion(ctx context.Context, req openai.ChatCompletionRequest) (openai.ChatCompletionResponse, error) {
    // Ensure streaming is handled by caller if needed, here we wrap the standard call
    // Logic for OpenRouter-specific model handling could go here
    return c.client.CreateChatCompletion(ctx, req)
}

// StreamChatCompletion wraps the OpenAI Stream API
func (c *Client) StreamChatCompletion(ctx context.Context, req openai.ChatCompletionRequest) (*openai.ChatCompletionStream, error) {
    return c.client.CreateChatCompletionStream(ctx, req)
}
