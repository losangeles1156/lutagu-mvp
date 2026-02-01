package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"

	"github.com/lutagu/adk-agent/internal/config"
)

func main() {
	// Source .env manually or rely on config loader if it works
	cfg := config.Load()
	routingURL := cfg.RoutingServiceURL

	// Force Cloud Run URL for validation
	routingURL = "https://l4-routing-rs-147810667713.asia-northeast1.run.app/l4/route"

	origin := "Tokyo"
	destination := "Shinjuku"

	fmt.Printf("🔍 Testing L4 Routing Service: %s\n", routingURL)
	fmt.Printf("📍 From: %s -> To: %s\n", origin, destination)

	reqURL := fmt.Sprintf("%s?from=%s&to=%s&max_hops=5&locale=zh-TW", routingURL, url.QueryEscape(origin), url.QueryEscape(destination))

	resp, err := http.Get(reqURL)
	if err != nil {
		fmt.Printf("❌ Failed to call service: %v\n", err)
		return
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(resp.Body)
	fmt.Printf("📡 Status: %s\n", resp.Status)

	var routeResp struct {
		Routes []struct {
			Key     string `json:"key"`
			Configs struct {
				Time      float64 `json:"time"`
				Transfers int     `json:"transfers"`
			} `json:"costs"`
			Path []string `json:"path"`
		} `json:"routes"`
		Error string `json:"error"`
	}

	if err := json.Unmarshal(bodyBytes, &routeResp); err != nil {
		fmt.Printf("⚠️ Raw Response (Parse Failed): %s\n", string(bodyBytes))
		return
	}

	if routeResp.Error != "" {
		fmt.Printf("❌ API Error: %s\n", routeResp.Error)
		return
	}

	fmt.Printf("✅ Found %d routes:\n", len(routeResp.Routes))
	for i, r := range routeResp.Routes {
		fmt.Printf("[%d] Time: %.1f min, Transfers: %d\n", i+1, r.Configs.Time, r.Configs.Transfers)
		fmt.Printf("    Path: %v\n", r.Path)
	}
}
