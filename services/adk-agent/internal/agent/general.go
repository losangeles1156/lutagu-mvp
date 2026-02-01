package agent

import (
	"context"
	"fmt"

	"google.golang.org/adk/agent"
	"google.golang.org/adk/agent/llmagent"
	"google.golang.org/adk/model"
)

// GeneralAgent is used for general reasoning and chatting
type GeneralAgent struct {
	BaseAgent
	agent.Agent
}

// NewGeneralAgent creates a new general reasoning agent
func NewGeneralAgent(modelInstance model.LLM, modelID string) (*GeneralAgent, error) {
	inner, err := llmagent.New(llmagent.Config{
		Name:        "general_agent",
		Model:       modelInstance,
		Description: "General reasoning and conversation agent",
		Instruction: "You are a helpful Tokyo transit assistant. Provide empathetic and accurate travel advice.",
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

	go func() {
		defer close(ch)

		var lastContent string
		if len(messages) > 0 {
			lastContent = messages[len(messages)-1].Content
		}

		respText, err := RunAgentSync(ctx, a.Agent, lastContent)
		if err != nil {
			ch <- fmt.Sprintf("Error: %v", err)
			return
		}

		ch <- respText
	}()

	return ch, nil
}
