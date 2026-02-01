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
	StreamChatCompletion(ctx context.Context, req openai.ChatCompletionRequest) (*openai.ChatCompletionStream, error)
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
		var messages []openai.ChatCompletionMessage

		// Map simple content to OpenAI messages
		// This is a simplification; a robust bridge needs full multi-turn history mapping
		for _, c := range req.Contents {
			role := c.Role
			if role == "model" {
				role = "assistant"
			}
			var content string
			if len(c.Parts) > 0 {
				content = c.Parts[0].Text
			}
			messages = append(messages, openai.ChatCompletionMessage{
				Role:    role,
				Content: content,
			})
		}

		openAIReq := openai.ChatCompletionRequest{
			Model:    req.Model,
			Messages: messages,
			Stream:   stream,
		}

		if stream {
			stream, err := m.Client.StreamChatCompletion(ctx, openAIReq)
			if err != nil {
				yield(nil, err)
				return
			}
			defer stream.Close()

			for {
				resp, err := stream.Recv()
				if err != nil {
					// stream.Recv returns io.EOF when done
					if err.Error() != "EOF" {
						yield(nil, err)
					}
					return
				}

				if len(resp.Choices) > 0 {
					chunk := resp.Choices[0].Delta.Content
					if chunk != "" {
						if !yield(&model.LLMResponse{
							Content: &genai.Content{
								Role: "assistant",
								Parts: []*genai.Part{
									{Text: chunk},
								},
							},
						}, nil) {
							return
						}
					}
				}
			}
		} else {
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
}
