package agent

import (
    "context"
    "fmt"

    "github.com/lutagu/adk-agent/internal/infrastructure/odpt"
    "github.com/lutagu/adk-agent/pkg/openrouter"
    openai "github.com/sashabaranov/go-openai"
)

type StatusAgent struct {
    BaseAgent
    OdptClient *odpt.Client
}

func NewStatusAgent(client *openrouter.Client, model string, odptClient *odpt.Client) *StatusAgent {
    return &StatusAgent{
        BaseAgent: BaseAgent{
            Client: client,
            Model:  model,
        },
        OdptClient: odptClient,
    }
}

func (a *StatusAgent) Name() string {
    return "status_agent"
}

func (a *StatusAgent) Process(ctx context.Context, messages []Message, reqCtx RequestContext) (<-chan string, error) {
    ch := make(chan string)

    go func() {
        defer close(ch)

        // 1. Fetch Real-Time Data (RAG)
        dataContext := ""
        if a.OdptClient == nil {
            dataContext = "ODPT data unavailable (client not configured)."
        } else {
            statusList, err := a.OdptClient.FetchTrainStatus()
            if err != nil {
                dataContext = fmt.Sprintf("Error fetching data: %v", err)
            } else {
                // Filter only delays
                count := 0
                for _, s := range statusList {
                    if s.Status != "normal" {
                        dataContext += fmt.Sprintf("- %s: %s (Status: %s)\n", s.Railway, s.Text, s.Status)
                        count++
                    }
                }
                if count == 0 {
                    dataContext = "All lines are operating normally."
                }
            }
        }

        sysPrompt := fmt.Sprintf(`
You are the Status Agent for LUTAGU.
Your role is to explain train operation status, delays, and disruptions in Tokyo BASED ON THE REAL-TIME DATA BELOW.

--- REAL TIME DATA ---
%s
----------------------

Structure your response:
1.  **Current Status**: Highlight any DELAY or SUSPENDED lines found in the data. If none, say all normal.
2.  **Details**: Explain the cause if provided in the text.
3.  **Advice**: Suggest alternatives if suspended.

User Locale: %s
`, dataContext, reqCtx.Locale)

        openAIMessages := toOpenAIMessages(messages)
        req := openai.ChatCompletionRequest{
            Model: a.Model,
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
