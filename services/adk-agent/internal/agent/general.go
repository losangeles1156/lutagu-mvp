package agent

import (
	"context"
)

// GeneralAgent is used for general reasoning and chatting
type GeneralAgent struct {
	BaseAgent
}

// NewGeneralAgent creates a new general reasoning agent
func NewGeneralAgent(client LLMClient, model string) *GeneralAgent {
	return &GeneralAgent{
		BaseAgent: BaseAgent{
			Client: client,
			Model:  model,
		},
	}
}

func (a *GeneralAgent) Name() string {
	return "general_agent"
}

func (a *GeneralAgent) Process(ctx context.Context, messages []Message, reqCtx RequestContext) (<-chan string, error) {
	orchestrator := NewOrchestrator(a)
	return orchestrator.Run(ctx, messages, reqCtx)
}
