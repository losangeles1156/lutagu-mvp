package openrouter

import (
	"context"
	"encoding/json"
	"fmt"
	"iter"
	"strings"

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
	Client       OpenAICompatibleClient
	DefaultModel string
}

func (m *ADKModelBridge) Name() string {
	if m.DefaultModel != "" {
		return m.DefaultModel
	}
	return "openrouter_bridge"
}

func (m *ADKModelBridge) GenerateContent(ctx context.Context, req *model.LLMRequest, stream bool) iter.Seq2[*model.LLMResponse, error] {
	return func(yield func(*model.LLMResponse, error) bool) {
		// Extract user message from genai.Contents
		var messages []openai.ChatCompletionMessage

		// Map simple content to OpenAI messages
		// This is a simplification; a robust bridge needs full multi-turn history mapping
		// Track pending tool calls to match responses
		pendingCalls := make(map[string][]string)

		for msgIdx, c := range req.Contents {
			role := c.Role
			switch role {
			case "model":
				role = "assistant"
			case "function", "tool":
				role = "tool"
			}

			// Handle multi-part content
			var content string
			var toolCalls []openai.ToolCall
			var toolResponses []openai.ChatCompletionMessage

			for partIdx, p := range c.Parts {
				if p.Text != "" {
					content += p.Text
				}
				if p.FunctionCall != nil {
					// Generate deterministic ID
					callID := fmt.Sprintf("call_%d_%d", msgIdx, partIdx)
					pendingCalls[p.FunctionCall.Name] = append(pendingCalls[p.FunctionCall.Name], callID)

					argsBytes, _ := json.Marshal(p.FunctionCall.Args)
					toolCalls = append(toolCalls, openai.ToolCall{
						Type: openai.ToolTypeFunction,
						Function: openai.FunctionCall{
							Name:      p.FunctionCall.Name,
							Arguments: string(argsBytes),
						},
						ID: callID,
					})
				}
				if p.FunctionResponse != nil {
					// Find matching ID
					var callID string
					if ids, ok := pendingCalls[p.FunctionResponse.Name]; ok && len(ids) > 0 {
						callID = ids[0]
						pendingCalls[p.FunctionResponse.Name] = ids[1:]
					} else {
						// Fallback if history is incomplete or mismatched
						callID = fmt.Sprintf("call_unknown_%s", p.FunctionResponse.Name)
					}

					respBytes, _ := json.Marshal(p.FunctionResponse.Response)
					toolResponses = append(toolResponses, openai.ChatCompletionMessage{
						Role:       "tool",
						Content:    clipContent(string(respBytes), "tool"),
						ToolCallID: callID,
					})
				}
			}

			// If we have tool responses, they are separate messages in OpenAI
			if len(toolResponses) > 0 {
				messages = append(messages, toolResponses...)
				continue
			}

			// Otherwise, standard message
			// (Use "user" if original role was user/model/system)
			// Note: If role was "tool" but treated as FunctionResponse loop above, we skip this
			// But check if we have remaining content/toolcalls

			// If role is tool/function but we handled it via toolResponses, we are done
			if role == "tool" && len(toolResponses) > 0 {
				continue
			}
			// What if role is "tool" but NO function response? (Shouldn't happen in valid ADK)

			msg := openai.ChatCompletionMessage{
				Role:    role,
				Content: clipContent(content, role),
			}
			if len(toolCalls) > 0 {
				msg.ToolCalls = toolCalls
			}
			messages = append(messages, msg)
		}

		modelID := req.Model
		if m.DefaultModel != "" {
			modelID = m.DefaultModel
		}

		openAIReq := openai.ChatCompletionRequest{
			Model:    modelID,
			Messages: messages,
			Stream:   stream,
		}

		fmt.Printf("DEBUG: GenContent Called. Model=%s, Tools=%d\n", modelID, len(req.Tools))
		for i, t := range req.Tools {
			fmt.Printf("DEBUG: Tool[%v] Type: %T\n", i, t)
		}

		allowedTools := inferAllowedTools(messages)
		// Map Tools
		if len(req.Tools) > 0 {
			var oTools []openai.Tool
			for _, t := range req.Tools {
				// Case 1: *genai.Tool (Standard ADK Tool)
				if gt, ok := t.(*genai.Tool); ok {
					for _, fd := range gt.FunctionDeclarations {
						if !isToolAllowed(fd.Name, allowedTools) {
							continue
						}
						// fmt.Printf("DEBUG: Schema for %s: %+v\n", fd.Name, fd.Parameters)
						oTools = append(oTools, openai.Tool{
							Type: openai.ToolTypeFunction,
							Function: &openai.FunctionDefinition{
								Name:        fd.Name,
								Description: fd.Description,
								Parameters:  fd.Parameters,
							},
						})
					}
					continue
				}

				// Case 2: functiontool (ADK Wrapper)
				// Uses Declaration() method to return *genai.FunctionDeclaration
				if dt, ok := t.(interface {
					Declaration() *genai.FunctionDeclaration
				}); ok {
					fd := dt.Declaration()
					if !isToolAllowed(fd.Name, allowedTools) {
						continue
					}
					fmt.Printf("DEBUG: Schema for %s: %+v\n", fd.Name, fd.Parameters)
					oTools = append(oTools, openai.Tool{
						Type: openai.ToolTypeFunction,
						Function: &openai.FunctionDefinition{
							Name:        fd.Name,
							Description: fd.Description,
							Parameters:  fd.Parameters,
						},
					})
					continue
				}
			}
			openAIReq.Tools = oTools
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
					// Handle Tool Calls in Stream? ADK might expect them.
					// Implementation of tool call streaming is complex.
					// For now, let's assume text-only streaming response or basic tool call chunk handling.
					// If resp.Choices[0].Delta.ToolCalls exists...
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

			// Handle Tool Calls in Response
			var parts []*genai.Part
			if len(resp.Choices[0].Message.ToolCalls) > 0 {
				for _, tc := range resp.Choices[0].Message.ToolCalls {
					var args map[string]interface{}
					fmt.Printf("DEBUG: Tool Arguments JSON: %s\n", tc.Function.Arguments)
					if err := json.Unmarshal([]byte(tc.Function.Arguments), &args); err != nil {
						// Fallback or log? For now empty map implies failure to parse
						fmt.Printf("Error unmarshaling tool args: %v\n", err)
						args = make(map[string]interface{})
					}
					parts = append(parts, &genai.Part{
						FunctionCall: &genai.FunctionCall{
							Name: tc.Function.Name,
							Args: args,
						},
					})
				}
			} else {
				parts = append(parts, &genai.Part{
					Text: resp.Choices[0].Message.Content,
				})
			}

			yield(&model.LLMResponse{
				Content: &genai.Content{
					Role:  "assistant",
					Parts: parts,
				},
			}, nil)
		}
	}
}

func clipContent(content string, role string) string {
	runes := []rune(strings.TrimSpace(content))
	max := 1200
	if role == "system" {
		max = 900
	}
	if role == "user" {
		max = 1400
	}
	if len(runes) <= max {
		return string(runes)
	}
	return string(runes[:max]) + "...(truncated)"
}

func inferAllowedTools(messages []openai.ChatCompletionMessage) map[string]bool {
	allowed := map[string]bool{}
	lastUser := ""
	for i := len(messages) - 1; i >= 0; i-- {
		if messages[i].Role == "user" {
			lastUser = strings.ToLower(messages[i].Content)
			break
		}
	}
	if lastUser == "" {
		return allowed
	}
	allow := func(names ...string) {
		for _, n := range names {
			allowed[n] = true
		}
	}
	if containsAnyKeyword(lastUser, []string{"幾點", "現在", "today", "deadline", "時刻", "timetable"}) {
		allow("get_current_time", "get_timetable")
	}
	if containsAnyKeyword(lastUser, []string{"上野", "銀座", "怎麼去", "route", "from", "to", "搭", "轉乘"}) {
		allow("plan_route", "search_route", "get_train_status", "get_current_time")
	}
	if containsAnyKeyword(lastUser, []string{"delay", "status", "延誤", "誤點", "運休", "見合わせ"}) {
		allow("get_train_status")
	}
	if len(allowed) == 0 {
		// conservative fallback
		allow("get_current_time", "plan_route")
	}
	return allowed
}

func isToolAllowed(toolName string, allowed map[string]bool) bool {
	if len(allowed) == 0 {
		return true
	}
	return allowed[toolName]
}

func containsAnyKeyword(text string, keywords []string) bool {
	for _, k := range keywords {
		if strings.Contains(text, strings.ToLower(k)) {
			return true
		}
	}
	return false
}
