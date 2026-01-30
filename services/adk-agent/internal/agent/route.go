package agent

import (
    "context"
    "fmt"

    "github.com/lutagu/adk-agent/pkg/openrouter"
    openai "github.com/sashabaranov/go-openai"
)

type RouteAgent struct {
    BaseAgent
}

func NewRouteAgent(client *openrouter.Client, model string) *RouteAgent {
    return &RouteAgent{
        BaseAgent: BaseAgent{
            Client: client,
            Model:  model,
        },
    }
}

func (a *RouteAgent) Name() string {
    return "route_agent"
}

func (a *RouteAgent) Process(ctx context.Context, messages []Message, reqCtx RequestContext) (<-chan string, error) {
    ch := make(chan string)

    go func() {
        defer close(ch)

        // System Prompt specifically for Route calculation
        sysPrompt := `
You are the Route Agent for LUTAGU. 
Your goal is to provide accurate transit route suggestions in Tokyo.
For this MVP, you are answering based on your knowledge. 
In Phase 3, you will have access to real-time tools.

Structure your response clearly:
1.  **Summary**: Quick answer (e.g., "Take the Yamanote Line").
2.  **Details**: Step-by-step path.
3.  **Tips**: Provide one useful tip (best car, exit number).

User Locale: ` + reqCtx.Locale + `
`
        openAIMessages := toOpenAIMessages(messages)
        req := openai.ChatCompletionRequest{
            Model: a.Model, // This should be DeepSeek V3.2
            Messages: append([]openai.ChatCompletionMessage{
                {Role: "system", Content: sysPrompt},
            }, openAIMessages...),
            Stream: true,
        }

        stream, err := a.Client.StreamChatCompletion(ctx, req)
        if err != nil {
            ch <- fmt.Sprintf("Error: %v", err)
            return
        }
        defer stream.Close()

        for {
            response, err := stream.Recv()
            if err != nil {
                // End of stream or error
                return
            }
            // Defensive check for empty Choices
            if len(response.Choices) == 0 {
                continue
            }
            content := response.Choices[0].Delta.Content
            if content != "" {
                ch <- content
            }
        }
    }()

    return ch, nil
}
