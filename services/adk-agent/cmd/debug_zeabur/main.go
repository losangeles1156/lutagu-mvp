package main

import (
	"context"
	"fmt"
	"strings"

	"github.com/lutagu/adk-agent/internal/config"
	"github.com/sashabaranov/go-openai"
)

func main() {
	// Load config to get key from env (must source .env first)
	cfg := config.Load()
	apiKey := cfg.Zeabur.APIKey

	if apiKey == "" {
		fmt.Println("❌ ZEABUR_API_KEY is missing")
		return
	}

	// modelID := "deepseek/deepseek-v3.2" // Not needed for listing
	fmt.Printf("🔍 Testing Zeabur AI Hub Connection with Key: %s...\n", apiKey[:5]+"***")

	baseURL := "https://hnd1.aihub.zeabur.ai/v1"
	fmt.Printf("\nTesting Model List on: %s\n", baseURL)

	cConfig := openai.DefaultConfig(apiKey)
	cConfig.BaseURL = baseURL
	client := openai.NewClientWithConfig(cConfig)

	models, err := client.ListModels(context.Background())
	if err != nil {
		fmt.Printf("❌ Failed to list models: %v\n", err)
		return
	}

	fmt.Println("✅ Available Models:")
	for _, m := range models.Models {
		if strings.Contains(strings.ToLower(m.ID), "deepseek") {
			fmt.Printf(" - %s (DeepSeek Match)\n", m.ID)
		} else {
			// Print others just in case
			// fmt.Printf(" - %s\n", m.ID)
		}
	}
}
