package agent

import (
    "context"
    "fmt"
    "strings"

    "github.com/lutagu/adk-agent/pkg/openrouter"
    openai "github.com/sashabaranov/go-openai"
)

type RootAgent struct {
    BaseAgent
}

func NewRootAgent(client *openrouter.Client, model string) *RootAgent {
    return &RootAgent{
        BaseAgent: BaseAgent{
            Client: client,
            Model:  model,
        },
    }
}

func (a *RootAgent) Name() string {
    return "root_agent"
}

func (a *RootAgent) Process(ctx context.Context, messages []Message, reqCtx RequestContext) (<-chan string, error) {
    // 1. Convert messages to OpenAI format
    openAIMessages := toOpenAIMessages(messages)

    // 2. Add System Prompt for Intent Classification
    systemPrompt := `
You are the Root Agent for the Tokyo Transit Assistant (LUTAGU).
Your job is to specificly identifying the user's INTENT and routing it to the correct specialized agent.

Authorized Intents:
- ROUTE: User wants to go from A to B, or asks about path finding.
- STATUS: User asks about train delays, operation status, or suspended lines.
- FACILITY: User asks about lockers, toilets, WiFi, or station maps.
- GENERAL: General chat, greetings, or questions about Tokyo tourism not covered above.

Output format: ONLY the Intent Name (ROUTE, STATUS, FACILITY, GENERAL).
Do not explain your reasoning.
`
    // Prepend system prompt to the LAST message's context for better steering, 
    // or just assume standard chat completion structure.
    // For Root Agent, we just want a decision first.
    // Actually, in ADK pattern, Root might orchestrate. 
    // For this MVP, let's make Root return a specific "Routing Token" that the orchestrator understands,
    // OR have Root actually generate the response if it's simple.
    
    // DECISION: For this phase, Root just acts as a Classifier.
    // We will need an "Orchestrator" in main.go to use this output.
    
    // Let's create a specialized classification request
    req := openai.ChatCompletionRequest{
        Model: a.Model,
        Messages: append([]openai.ChatCompletionMessage{
            {Role: "system", Content: systemPrompt},
        }, openAIMessages...),
        MaxTokens: 10,
    }

    resp, err := a.Client.ChatCompletion(ctx, req)
    if err != nil {
        return nil, fmt.Errorf("root classification failed: %w", err)
    }

    // Defensive check for empty Choices (edge case: safety filter, rate limit)
    if len(resp.Choices) == 0 {
        return nil, fmt.Errorf("root classification returned empty choices")
    }

    intent := strings.TrimSpace(resp.Choices[0].Message.Content)
    intent = strings.ToUpper(intent)

    // Create a channel to stream the result (in this case just the intent for now)
    // The main loop will switch based on this intent.
    ch := make(chan string, 1)
    ch <- fmt.Sprintf("INTENT_DETECTED:%s", intent)
    close(ch)

    return ch, nil
}

func toOpenAIMessages(msgs []Message) []openai.ChatCompletionMessage {
    var res []openai.ChatCompletionMessage
    for _, m := range msgs {
        res = append(res, openai.ChatCompletionMessage{
            Role:    m.Role,
            Content: m.Content,
            Name:    m.Name,
        })
    }
    return res
}
