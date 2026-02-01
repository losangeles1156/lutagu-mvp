package openrouter

import (
	"context"
	"fmt"
	"iter"

	openai "github.com/sashabaranov/go-openai"
	"google.golang.org/adk/model"
	"google.golang.org/genai"
)

// OpenAICompatibleClient is an interface for clients that support OpenAI chat completion
type OpenAICompatibleClient interface {
	ChatCompletion(ctx context.Context, req openai.ChatCompletionRequest) (openai.ChatCompletionResponse, error)
}

// ADKModelBridge wraps an OpenAICompatibleClient to implement the ADK LLM interface
type ADKModelBridge struct {
	Client OpenAICompatibleClient
}

func (m *ADKModelBridge) Name() string {
	return "openrouter_bridge"
}

func (m *ADKModelBridge) GenerateContent(ctx context.Context, req *model.LLMRequest, stream bool) iter.Seq2[*model.LLMResponse, error] {
	return func(yield func(*model.LLMResponse, error) bool) {
		// Extract user message from genai.Contents
		var userMsg string
		if len(req.Contents) > 0 && len(req.Contents[0].Parts) > 0 {
			userMsg = req.Contents[0].Parts[0].Text
		}

		openAIReq := openai.ChatCompletionRequest{
			Model: req.Model,
			Messages: []openai.ChatCompletionMessage{
				{Role: "user", Content: userMsg},
			},
		}

		resp, err := m.Client.ChatCompletion(ctx, openAIReq)
		if err != nil {
			yield(nil, err)
			return
		}

		if len(resp.Choices) == 0 {
			yield(nil, fmt.Errorf("empty response from model"))
			return
		}

		yield(&model.LLMResponse{
			Content: &genai.Content{
				Role: "assistant",
				Parts: []*genai.Part{
					{Text: resp.Choices[0].Message.Content},
				},
			},
		}, nil)
	}
}
