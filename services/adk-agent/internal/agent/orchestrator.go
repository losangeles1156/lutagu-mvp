package agent

import (
	"context"
	"fmt"

	openai "github.com/sashabaranov/go-openai"
)

// Orchestrator manages the ReAct loop for an Agent
type Orchestrator struct {
	Agent    Agent
	MaxSteps int
}

func NewOrchestrator(a Agent) *Orchestrator {
	return &Orchestrator{
		Agent:    a,
		MaxSteps: 5,
	}
}

// Run executes the agent loop
func (o *Orchestrator) Run(ctx context.Context, messages []Message, reqCtx RequestContext) (<-chan string, error) {
	outCh := make(chan string)

	go func() {
		defer close(outCh)

		currentMessages := toOpenAIMessages(messages)
		tools := o.Agent.Tools()
		client := o.Agent.GetClient()
		model := o.Agent.GetModel()

		step := 0
		for step < o.MaxSteps {
			// If no tools defined, skip to streaming immediately
			if len(tools) == 0 {
				break
			}

			// 1. Non-Streaming Decision Step
			req := openai.ChatCompletionRequest{
				Model:    model,
				Messages: currentMessages,
				Tools:    tools,
			}

			resp, err := client.ChatCompletion(ctx, req)
			if err != nil {
				outCh <- fmt.Sprintf("AI Error: %v", err)
				return
			}

			if len(resp.Choices) == 0 {
				outCh <- "Error: Empty response from AI"
				return
			}

			msg := resp.Choices[0].Message

			// 2. Check for Tool Calls
			if len(msg.ToolCalls) > 0 {
				// Append Assistant Message with Tool Calls
				currentMessages = append(currentMessages, formatAssistantMessage(msg))

				// Execute Tools
				for _, toolCall := range msg.ToolCalls {
					outCh <- fmt.Sprintf("[Tool] Executing %s...", toolCall.Function.Name)

					result, err := o.Agent.ExecuteTool(ctx, toolCall, reqCtx)
					if err != nil {
						result = fmt.Sprintf("Error executing tool: %v", err)
					}

					outCh <- fmt.Sprintf("[Tool] Result length: %d chars", len(result))

					// Append Tool Message
					currentMessages = append(currentMessages, openai.ChatCompletionMessage{
						Role:       openai.ChatMessageRoleTool,
						Content:    result,
						ToolCallID: toolCall.ID,
					})
				}
				step++
				continue // Loop back with new history
			} else {
				// No tool calls -> Model wants to speak.
				// The content is in msg.Content.
				// However, since we want to STREAM the final answer, we should probably
				// re-request as stream OR just yield this content if it's already full.
				// For OpenRouter, "DeepSeek" might not stream well after tool calls in the same request?
				// Actually, since we have the full content here, let's just stream it out.

				// Simulate stream
				chunkSize := 10
				runes := []rune(msg.Content)
				for i := 0; i < len(runes); i += chunkSize {
					end := i + chunkSize
					if end > len(runes) {
						end = len(runes)
					}
					outCh <- string(runes[i:end])
				}
				return
			}
		}

		// Final Step: Stream Response (if loop broke or max steps reached)
		// We use the accumulated history
		req := openai.ChatCompletionRequest{
			Model:    model,
			Messages: currentMessages, // History with tool results
			Stream:   true,
			// No tools provided here to force text generation?
			// Or keep tools but since we are at max steps or no tools, it should just talk.
			// Ideally remove tools if we want to force Final Answer.
		}

		stream, err := client.StreamChatCompletion(ctx, req)
		if err != nil {
			outCh <- fmt.Sprintf("Stream Error: %v", err)
			return
		}
		defer stream.Close()

		for {
			response, err := stream.Recv()
			if err != nil {
				return
			}
			if len(response.Choices) > 0 {
				content := response.Choices[0].Delta.Content
				if content != "" {
					outCh <- content
				}
			}
		}
	}()

	return outCh, nil
}

func formatAssistantMessage(msg openai.ChatCompletionMessage) openai.ChatCompletionMessage {
	return openai.ChatCompletionMessage{
		Role:      openai.ChatMessageRoleAssistant,
		Content:   msg.Content,
		ToolCalls: msg.ToolCalls,
	}
}
