package main

import (
	"context"
	"fmt"
	"time"

	"github.com/lutagu/adk-agent/internal/agent"
	"github.com/lutagu/adk-agent/internal/infrastructure/weather"
	"github.com/lutagu/adk-agent/internal/layer"
	"github.com/lutagu/adk-agent/internal/orchestrator"
)

func main() {
	// Initialize Minimal Engine
	weatherClient := weather.NewClient()
	nodeResolver := layer.NewNodeResolver()
	templateEngine := layer.NewTemplateEngine(layer.TemplateEngineConfig{})

	// Initialize Engine
	engine := orchestrator.NewLayeredEngine(orchestrator.LayeredEngineConfig{
		TemplateEngine: templateEngine,
		NodeResolver:   nodeResolver,
		WeatherClient:  weatherClient,
	})

	scenarios := []struct {
		Name  string
		Query string
	}{
		{
			Name:  "Narita to Tokyo (Airport Template Match)",
			Query: "我想從成田機場去東京，有什麼建議？",
		},
		{
			Name:  "Haneda to Shinjuku (Airport Template Match)",
			Query: "羽田機場到新宿最快的方法？",
		},
		{
			Name:  "Toilet Query (Facility Template Match)",
			Query: "哪裡有廁所？",
		},
	}

	fmt.Println("🚀 Testing L1 Optimization (Fast-Path Templates)...")
	fmt.Println("------------------------------------------------")

	for _, s := range scenarios {
		fmt.Printf("\n📋 Scenario: %s\n", s.Name)
		fmt.Printf("❓ Query: %s\n", s.Query)

		req := orchestrator.ProcessRequest{
			Messages: []agent.Message{
				{Role: "user", Content: s.Query},
			},
			Locale: "zh-TW",
		}

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)

		start := time.Now()
		outCh := engine.Process(ctx, req)

		response := ""
		select {
		case res, ok := <-outCh:
			if ok {
				response = res
			}
		case <-ctx.Done():
			response = "❌ TIMEOUT"
		}
		cancel()

		latency := time.Since(start)
		fmt.Printf("🤖 Response:\n%s\n", response)
		fmt.Printf("⏱️  Latency: %v\n", latency)

		if latency > 100*time.Millisecond {
			fmt.Println("⚠️  Warning: Latency seems high for a template match (was it hit?)")
		} else {
			fmt.Println("✅ Success: Fast path achieved!")
		}
	}
}
