package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/lutagu/adk-agent/internal/agent"
	"github.com/lutagu/adk-agent/internal/config"
	"github.com/lutagu/adk-agent/internal/infrastructure/cache"
	"github.com/lutagu/adk-agent/internal/infrastructure/embedding"
	"github.com/lutagu/adk-agent/internal/infrastructure/odpt"
	"github.com/lutagu/adk-agent/internal/infrastructure/supabase"
	"github.com/lutagu/adk-agent/internal/infrastructure/weather"
	"github.com/lutagu/adk-agent/internal/layer"
	"github.com/lutagu/adk-agent/internal/monitoring"
	"github.com/lutagu/adk-agent/internal/orchestrator"
	"github.com/lutagu/adk-agent/internal/skill"
	"github.com/lutagu/adk-agent/internal/skill/implementations"
	"github.com/lutagu/adk-agent/internal/validation"
	"github.com/lutagu/adk-agent/pkg/openrouter"
)

var (
	cfg           *config.Config
	engine        *orchestrator.LayeredEngine
	healthChecker *monitoring.HealthChecker
)

func main() {
	// 1. Setup Structured Logging
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	cfg = config.Load()
	slog.Info("Configuration loaded")

	// 2. Initialize Health Checker
	healthChecker = monitoring.NewHealthChecker()

	// 3. Initialize Clients

	// OpenRouter
	orClient, err := openrouter.NewClient(openrouter.Config{
		APIKey:  cfg.OpenRouter.APIKey,
		BaseURL: cfg.OpenRouter.BaseURL,
	})
	if err != nil {
		slog.Error("Failed to create OpenRouter client", "error", err)
		os.Exit(1)
	}

	// ADK Model Bridges
	orModelBridge := &openrouter.ADKModelBridge{Client: orClient}

	// Zeabur AI Hub
	var zeaburModelBridge *openrouter.ADKModelBridge
	zeaburClient, err := openrouter.NewZeaburClient(openrouter.ZeaburConfig{
		APIKey:  cfg.Zeabur.APIKey,
		BaseURL: cfg.Zeabur.BaseURL,
	})
	if err == nil {
		zeaburModelBridge = &openrouter.ADKModelBridge{Client: zeaburClient}
		slog.Info("Zeabur AI Hub client initialized")
	}

	// ODPT
	odptClient := odpt.NewClient(cfg.ODPT.APIKey, cfg.ODPT.APIUrl)

	// Redis
	var redisStore *cache.RedisStore
	if cfg.Redis.URL != "" {
		redisStore, err = cache.NewRedisStore(cfg.Redis.URL)
		if err == nil {
			slog.Info("Connected to Redis")
			defer redisStore.Close()
		}
	}

	// Supabase
	var vectorStore *supabase.VectorStore
	var supabaseClient *supabase.Client
	if cfg.Supabase.URL != "" {
		supabaseClient, err = supabase.NewClient(cfg.Supabase.URL, cfg.Supabase.ServiceKey)
		if err == nil {
			vectorStore = supabase.NewVectorStore(supabaseClient)
		}
	}

	// Voyage AI
	var embeddingClient *embedding.VoyageClient
	if cfg.Voyage.APIKey != "" {
		embeddingClient, _ = embedding.NewVoyageClient(cfg.Voyage.APIKey, cfg.Voyage.Model)
	}

	// 4. Initialize Layers
	templateEngine := layer.NewTemplateEngine(layer.TemplateEngineConfig{
		CacheTTL: cfg.Layer.TemplateCacheTTL,
	})
	nodeResolver := layer.NewNodeResolver()
	l2Injector := layer.NewL2Injector(odptClient)
	factChecker, _ := validation.NewFactChecker()
	weatherClient := weather.NewClient()

	// 5. Initialize Skill Registry
	skillRegistry := skill.NewRegistry()
	skillRegistry.Register(implementations.NewFareSkill())
	skillRegistry.Register(implementations.NewAccessibilitySkill())
	skillRegistry.Register(implementations.NewMedicalSkill())
	skillRegistry.Register(implementations.NewExitStrategistSkill())
	skillRegistry.Register(implementations.NewLocalGuideSkill())
	skillRegistry.Register(implementations.NewSpatialReasonerSkill())
	skillRegistry.Register(implementations.NewInfoLinksSkill())

	// 6. Initialize ADK Agents
	routeAgent, _ := agent.NewRouteAgent(orModelBridge, cfg.Models.RouteAgent, cfg.RoutingServiceURL)
	statusAgent, _ := agent.NewStatusAgent(orModelBridge, cfg.Models.StatusAgent, odptClient)

	reasoningBridge := orModelBridge
	if zeaburModelBridge != nil {
		reasoningBridge = zeaburModelBridge
	}

	generalAgent, _ := agent.NewGeneralAgent(reasoningBridge, cfg.Models.GeneralAgent)
	fastAgent, _ := agent.NewGeneralAgent(orModelBridge, cfg.Models.FastAgent)
	rootAgent, _ := agent.NewRootAgent(reasoningBridge, cfg.Models.GeneralAgent)

	slog.Info("ADK Agents initialized")

	// 7. Initialize Layered Engine
	engine = orchestrator.NewLayeredEngine(orchestrator.LayeredEngineConfig{
		Config:          cfg,
		TemplateEngine:  templateEngine,
		NodeResolver:    nodeResolver,
		L2Injector:      l2Injector,
		WeatherClient:   weatherClient,
		SkillRegistry:   skillRegistry,
		VectorStore:     vectorStore,
		EmbeddingClient: embeddingClient,
		RouteAgent:      routeAgent,
		StatusAgent:     statusAgent,
		GeneralAgent:    generalAgent,
		FastAgent:       fastAgent,
		RootAgent:       rootAgent,
		Model:           cfg.Models.GeneralAgent,
		FactChecker:     factChecker,
	})

	// 8. Setup HTTP Routes
	http.HandleFunc("/api/chat", handleChat)
	http.HandleFunc("/agent/chat", handleChat)
	http.HandleFunc("/health", healthChecker.HandleHealth)
	http.HandleFunc("/health/ready", healthChecker.HandleHealthReady)
	http.HandleFunc("/health/live", healthChecker.HandleHealthLive)
	http.HandleFunc("/metrics", handleMetrics)

	// 9. Start Server
	slog.Info("Server listening", "port", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, nil); err != nil {
		slog.Error("Server failed", "error", err)
		os.Exit(1)
	}
}

func handleChat(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Messages []agent.Message `json:"messages"`
		Locale   string          `json:"locale"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Locale == "" {
		req.Locale = "zh-TW"
	}

	ctx, cancel := context.WithTimeout(r.Context(), 120*time.Second)
	defer cancel()

	traceID := fmt.Sprintf("trace-%d", time.Now().UnixNano())
	slog.Info("Processing chat request", "traceID", traceID)

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming not supported", http.StatusInternalServerError)
		return
	}

	sendEvent := func(event, data string) {
		fmt.Fprintf(w, "event: %s\ndata: %s\n\n", event, data)
		flusher.Flush()
	}

	sendEvent("meta", `{"status":"processing"}`)

	respCh := engine.Process(ctx, orchestrator.ProcessRequest{
		Messages: req.Messages,
		Locale:   req.Locale,
		TraceID:  traceID,
	})

	for chunk := range respCh {
		dataBytes, _ := json.Marshal(map[string]string{"content": chunk})
		sendEvent("telem", string(dataBytes))
	}

	sendEvent("done", "{}")
}

func handleMetrics(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"status": "ok"})
}
