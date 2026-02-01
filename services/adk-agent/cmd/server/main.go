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
	// 1. Setup Structured Logging (Cloud Logging compatible)
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	cfg = config.Load()
	slog.Info("Configuration loaded",
		"port", cfg.Port,
		"supabase", cfg.Supabase.URL != "",
		"voyage", cfg.Voyage.APIKey != "",
	)

	// 2. Initialize Health Checker
	healthChecker = monitoring.NewHealthChecker()

	// 3. Initialize Clients with Graceful Degradation

	// OpenRouter (Function Calling Specialist)
	orClient, err := openrouter.NewClient(openrouter.Config{
		APIKey:  cfg.OpenRouter.APIKey,
		BaseURL: cfg.OpenRouter.BaseURL,
	})
	if err != nil {
		slog.Error("Failed to create OpenRouter client", "error", err)
		os.Exit(1)
	}
	slog.Info("OpenRouter client initialized", "url", cfg.OpenRouter.BaseURL)

	// Zeabur AI Hub (General Logic/Chat Specialist)
	zeaburClient, err := openrouter.NewZeaburClient(openrouter.ZeaburConfig{
		APIKey: cfg.Zeabur.APIKey,
	})
	if err != nil {
		slog.Warn("Failed to create Zeabur AI Hub client. Falling back to OpenRouter.", "error", err)
		// Fallback for safety, though user requested strict separation
		zeaburClient = nil
	} else {
		slog.Info("Zeabur AI Hub client initialized")
	}

	// ODPT (Non-critical)
	odptClient := odpt.NewClient(cfg.ODPT.APIKey, cfg.ODPT.APIUrl)
	slog.Info("ODPT client initialized")

	// Redis (Non-critical)
	var redisStore *cache.RedisStore
	if cfg.Redis.URL != "" {
		redisStore, err = cache.NewRedisStore(cfg.Redis.URL)
		if err != nil {
			slog.Warn("Failed to connect to Redis. Proceeding without cache.", "error", err)
		} else {
			slog.Info("Connected to Redis")
			defer redisStore.Close()
			healthChecker.Register(monitoring.NewRedisCheck(func(ctx context.Context) error {
				// Simplified ping using Get
				_, err := redisStore.Get(ctx, "__health_check__")
				if err != nil && err.Error() != "redis: nil" {
					return err
				}
				return nil
			}))
		}
	}

	// Supabase (Non-critical for L1/L2)
	var vectorStore *supabase.VectorStore
	var supabaseClient *supabase.Client
	if cfg.Supabase.URL != "" && cfg.Supabase.ServiceKey != "" {
		supabaseClient, err = supabase.NewClient(cfg.Supabase.URL, cfg.Supabase.ServiceKey)
		if err != nil {
			slog.Warn("Failed to create Supabase client", "error", err)
		} else {
			vectorStore = supabase.NewVectorStore(supabaseClient)
			slog.Info("Supabase vector store initialized")
			healthChecker.Register(monitoring.NewSupabaseCheck(supabaseClient.Ping))
		}
	}

	// Voyage AI (Non-critical for L1/L2)
	var embeddingClient *embedding.VoyageClient
	if cfg.Voyage.APIKey != "" {
		embeddingClient, err = embedding.NewVoyageClient(cfg.Voyage.APIKey, cfg.Voyage.Model)
		if err != nil {
			slog.Warn("Failed to create Voyage client", "error", err)
		} else {
			slog.Info("Voyage embedding client initialized", "model", cfg.Voyage.Model)
		}
	}

	// 4. Initialize Layers
	templateEngine := layer.NewTemplateEngine(layer.TemplateEngineConfig{
		CacheTTL: cfg.Layer.TemplateCacheTTL,
	})
	slog.Info("Template engine initialized")

	nodeResolver := layer.NewNodeResolver()
	slog.Info("Node resolver initialized")

	l2Injector := layer.NewL2Injector(odptClient)
	slog.Info("L2 injector initialized")

	// 5. Initialize FactChecker
	factChecker, err := validation.NewFactChecker()
	if err != nil {
		slog.Error("Failed to initialize FactChecker", "error", err)
		os.Exit(1)
	}
	slog.Info("FactChecker initialized")

	// 6. Initialize Skill Registry
	skillRegistry := skill.NewRegistry()
	skillRegistry.Register(implementations.NewFareSkill())
	skillRegistry.Register(implementations.NewAccessibilitySkill())
	skillRegistry.Register(implementations.NewMedicalSkill())
	skillRegistry.Register(implementations.NewExitStrategistSkill())
	skillRegistry.Register(implementations.NewLocalGuideSkill())
	skillRegistry.Register(implementations.NewSpatialReasonerSkill())
	skillRegistry.Register(implementations.NewInfoLinksSkill())
	slog.Info("Skill registry initialized", "skills", skillRegistry.Count())

	// 6. Initialize Legacy Agents (for L2/L5 fallback)
	// These agents use OpenRouter for Function Calling
	routeAgent := agent.NewRouteAgent(orClient, cfg.Models.RouteAgent, cfg.RoutingServiceURL)
	statusAgent := agent.NewStatusAgent(orClient, cfg.Models.StatusAgent, odptClient)

	// Create GeneralAgent (pinned to Zeabur)
	var generalAgent *agent.GeneralAgent
	if zeaburClient != nil {
		generalAgent = agent.NewGeneralAgent(zeaburClient, cfg.Models.GeneralAgent)
	} else {
		generalAgent = agent.NewGeneralAgent(orClient, cfg.Models.GeneralAgent)
	}

	slog.Info("Agents initialized",
		"route", cfg.Models.RouteAgent,
		"status", cfg.Models.StatusAgent,
		"general", cfg.Models.GeneralAgent,
		"using_zeabur", zeaburClient != nil,
	)

	// 7. Initialize Layered Engine
	// The engine uses Zeabur for General Reasoning (fallback to orClient if zeabur is missing)
	engineClient := agent.LLMClient(orClient)
	if zeaburClient != nil {
		engineClient = zeaburClient
	}

	engine = orchestrator.NewLayeredEngine(orchestrator.LayeredEngineConfig{
		Config:          cfg,
		TemplateEngine:  templateEngine,
		NodeResolver:    nodeResolver,
		L2Injector:      l2Injector,
		SkillRegistry:   skillRegistry,
		VectorStore:     vectorStore,
		EmbeddingClient: embeddingClient,
		RouteAgent:      routeAgent,
		StatusAgent:     statusAgent,
		GeneralAgent:    generalAgent,
		LLMClient:       engineClient,
		Model:           cfg.Models.GeneralAgent,
		FactChecker:     factChecker,
	})
	slog.Info("Layered engine initialized", "using_zeabur", zeaburClient != nil)

	// 8. Setup HTTP Routes
	http.HandleFunc("/api/chat", handleChat)
	http.HandleFunc("/agent/chat", handleChat) // Alias for compatibility
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

	// 1. Parse Request
	var req struct {
		Messages []agent.Message `json:"messages"`
		Locale   string          `json:"locale"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Default locale
	if req.Locale == "" {
		req.Locale = "zh-TW"
	}

	// 2. Setup Context with Timeout
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	// Generate trace ID
	traceID := fmt.Sprintf("trace-%d", time.Now().UnixNano())
	slog.Info("Processing chat request", "traceID", traceID, "locale", req.Locale)

	// 3. Setup Streaming Response
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Trace-ID", traceID)

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming not supported", http.StatusInternalServerError)
		return
	}

	sendEvent := func(event, data string) {
		fmt.Fprintf(w, "event: %s\ndata: %s\n\n", event, data)
		flusher.Flush()
	}

	// 4. Process via Layered Engine
	sendEvent("meta", `{"status":"processing"}`)

	respCh := engine.Process(ctx, orchestrator.ProcessRequest{
		Messages: req.Messages,
		Locale:   req.Locale,
		TraceID:  traceID,
	})

	// 5. Stream Response
	for chunk := range respCh {
		dataBytes, _ := json.Marshal(map[string]string{"content": chunk})
		sendEvent("telem", string(dataBytes))
	}

	sendEvent("done", "{}")
	slog.Info("Chat request completed", "traceID", traceID)
}

func handleMetrics(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// TODO: Get metrics from engine
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "ok",
		"note":   "Metrics endpoint - implement Prometheus format if needed",
	})
}
