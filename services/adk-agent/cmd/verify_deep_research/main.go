package main

import (
	"context"
	"fmt"
	"log"
	"strings"

	"github.com/lutagu/adk-agent/internal/agent"
	"github.com/lutagu/adk-agent/internal/config"
	"github.com/lutagu/adk-agent/internal/infrastructure/odpt"
	"github.com/lutagu/adk-agent/internal/infrastructure/weather"
	"github.com/lutagu/adk-agent/internal/layer"
	"github.com/lutagu/adk-agent/internal/orchestrator"
	"github.com/lutagu/adk-agent/pkg/openrouter"
)

func main() {
	cfg := config.Load()

	// Initialize Clients
	orClient, err := openrouter.NewClient(openrouter.Config{
		APIKey:  cfg.OpenRouter.APIKey,
		BaseURL: cfg.OpenRouter.BaseURL,
	})
	if err != nil {
		log.Fatalf("❌ Failed to create OpenRouter client: %v\nCheck if OPENROUTER_API_KEY is set in .env", err)
	}

	// Zeabur Client (Primary)
	var engineClient interface{} = orClient
	if cfg.Zeabur.APIKey != "" {
		zc, err := openrouter.NewZeaburClient(openrouter.ZeaburConfig{
			APIKey:  cfg.Zeabur.APIKey,
			BaseURL: cfg.Zeabur.BaseURL,
		})
		if err == nil {
			engineClient = zc
			fmt.Println("✅ Using Zeabur AI Hub for Reasoning")
		}
	}

	odptClient := odpt.NewClient(cfg.ODPT.APIKey, cfg.ODPT.APIUrl)
	weatherClient := weather.NewClient()
	l2Injector := layer.NewL2Injector(odptClient)
	nodeResolver := layer.NewNodeResolver()

	// Minimal Engine Setup
	engine := orchestrator.NewLayeredEngine(orchestrator.LayeredEngineConfig{
		Config:        cfg,
		L2Injector:    l2Injector,
		WeatherClient: weatherClient,
		NodeResolver:  nodeResolver,
		// Using Type Assertion wrapper for LLMClient if needed,
		// but specifically we need GeneralAgent to trigger L5
		GeneralAgent: nil, // Will init below
	})

	// Manually inject General Agent to avoid full main.go complexity
	// We need to bypass the private fields if we use NewLayeredEngine,
	// but we can just use the engine instance we created if we fully populated it.
	// Actually, let's just populate the struct directly or use the constructor?
	// The constructor uses the config struct.

	// Re-do proper setup
	generalAgent := agent.NewGeneralAgent(engineClient.(agent.LLMClient), cfg.Models.GeneralAgent)

	engine = orchestrator.NewLayeredEngine(orchestrator.LayeredEngineConfig{
		Config:        cfg,
		L2Injector:    l2Injector,
		WeatherClient: weatherClient,
		NodeResolver:  nodeResolver,
		GeneralAgent:  generalAgent,
	})

	// Test Cases
	scenarios := []struct {
		Name  string
		Query string
	}{
		{
			Name:  "1. Time Awareness Check",
			Query: "現在東京幾點？今天是禮拜幾？",
		},
		{
			Name:  "2. Weather Awareness Check",
			Query: "現在東京天氣如何？",
		},
		{
			Name:  "3. Expert Decision (Routing)",
			Query: "我現在在東京車站，想去新宿，有什麼專家的建議嗎？請考慮天氣狀況。",
		},
	}

	fmt.Println("🚀 Starting Deep Research Capability Verification...")
	fmt.Printf("Model: %s\n", cfg.Models.GeneralAgent)
	fmt.Println("------------------------------------------------")

	for _, s := range scenarios {
		fmt.Printf("\n📋 Scenario: %s\n", s.Name)
		fmt.Printf("❓ Query: %s\n", s.Query)

		ctx := context.Background()
		req := orchestrator.ProcessRequest{
			Messages: []agent.Message{{Role: "user", Content: s.Query}},
			Locale:   "zh-TW",
		}

		outCh := engine.Process(ctx, req)

		var fullResponse strings.Builder
		fmt.Print("🤖 Response: ")
		for chunk := range outCh {
			fmt.Print(chunk)
			fullResponse.WriteString(chunk)
		}
		fmt.Println("\n------------------------------------------------")
	}
}

// Minimal agent mocking/importing to make this work script-like
// We need to import 'agent' package too.
