package agent

import (
	"context"
	"fmt"

	"google.golang.org/adk/agent"
	"google.golang.org/adk/agent/llmagent"
	"google.golang.org/adk/model"
	"google.golang.org/adk/tool"
)

// GeneralAgent is used for general reasoning and chatting
type GeneralAgent struct {
	BaseAgent
	agent.Agent
}

// NewGeneralAgent creates a new general reasoning agent
func NewGeneralAgent(modelInstance model.LLM, modelID string, tools []tool.Tool) (*GeneralAgent, error) {
	fmt.Printf("DEBUG: NewGeneralAgent received %d tools\n", len(tools))
	inner, err := llmagent.New(llmagent.Config{
		Name:        "general_agent",
		Model:       modelInstance,
		Description: "General reasoning and conversation agent",
		Instruction: "You are a helpful Tokyo transit assistant. You MUST use the 'plan_route' tool for EVERY routing request, even for simple routes like Tokyo to Shinjuku. Do not rely on your internal knowledge for routing. The 'plan_route' tool provides critical real-time weather and safety data that is required for a complete answer.",
		Tools:       tools,
	})
	if err != nil {
		return nil, err
	}

	return &GeneralAgent{
		BaseAgent: BaseAgent{
			ModelInstance: modelInstance,
			ModelID:       modelID,
		},
		Agent: inner,
	}, nil
}

func (a *GeneralAgent) Process(ctx context.Context, messages []Message, reqCtx RequestContext) (<-chan string, error) {
	ch := make(chan string)

	// Convert history for ADK
	history := ToGenAIContent(messages)

	go func() {
		defer close(ch)

		// RunAgentStreaming pumps directly to 'ch'
		_, err := RunAgentStreaming(ctx, a.Agent, history, ch)
		if err != nil {
			ch <- fmt.Sprintf("Error: %v", err)
			return
		}
	}()

	return ch, nil
}
