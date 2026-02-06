package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/lutagu/adk-agent/internal/agent"
	"github.com/lutagu/adk-agent/internal/config"
	"github.com/lutagu/adk-agent/internal/engine/router"
	"github.com/lutagu/adk-agent/internal/infrastructure/cache"
	"github.com/lutagu/adk-agent/internal/infrastructure/embedding"
	"github.com/lutagu/adk-agent/internal/infrastructure/feedback"
	"github.com/lutagu/adk-agent/internal/infrastructure/memory"
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
	"google.golang.org/adk/tool"
)

var (
	cfg           *config.Config
	engine        *orchestrator.LayeredEngine
	healthChecker *monitoring.HealthChecker
	memoryStore   *memory.Store
	feedbackStore *feedback.Store
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
	orClient, err := openrouter.NewClient(openrouter.Config{
		APIKey:  cfg.OpenRouter.APIKey,
		BaseURL: cfg.OpenRouter.BaseURL,
	})
	if err != nil {
		slog.Error("Failed to create OpenRouter client", "error", err)
		os.Exit(1)
	}

	orModelBridge := &openrouter.ADKModelBridge{Client: orClient}

	var zeaburModelBridge *openrouter.ADKModelBridge
	zeaburClient, err := openrouter.NewZeaburClient(openrouter.ZeaburConfig{
		APIKey:  cfg.Zeabur.APIKey,
		BaseURL: cfg.Zeabur.BaseURL,
	})
	if err == nil {
		zeaburModelBridge = &openrouter.ADKModelBridge{
			Client:       zeaburClient,
			DefaultModel: cfg.Models.GeneralAgent,
		}
		slog.Info("Zeabur AI Hub client initialized")
	}

	odptClient := odpt.NewClient(cfg.ODPT.APIKey, cfg.ODPT.APIUrl)

	var redisStore *cache.RedisStore
	if cfg.Redis.URL != "" {
		redisStore, err = cache.NewRedisStore(cfg.Redis.URL)
		if err == nil {
			slog.Info("Connected to Redis")
			defer redisStore.Close()
		}
	}

	var vectorStore *supabase.VectorStore
	var supabaseClient *supabase.Client
	if cfg.Supabase.URL != "" {
		supabaseClient, err = supabase.NewClient(cfg.Supabase.URL, cfg.Supabase.ServiceKey)
		if err == nil {
			vectorStore = supabase.NewVectorStore(supabaseClient)
		}
	}
	memoryStore = memory.NewStore(redisStore, supabaseClient, memory.Options{
		GuestTTLHours:      cfg.Memory.GuestTTLHours,
		MemberHotTTLHours:  cfg.Memory.MemberHotTTLHours,
		PersistEveryNTurns: cfg.Memory.PersistEveryNTurns,
	})
	feedbackStore = feedback.NewStore(supabaseClient, redisStore)
	if feedbackStore != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		if weights, err := feedbackStore.LoadWeights(ctx); err == nil && len(weights) > 0 {
			orchestrator.RestoreIntentFeedbackWeights(weights)
			slog.Info("Restored feedback weights", "count", len(weights))
		} else if err != nil {
			slog.Warn("Failed to restore feedback weights", "error", err)
		}
		cancel()
	}

	var embeddingClient *embedding.VoyageClient
	if cfg.Voyage.APIKey != "" {
		embeddingClient, _ = embedding.NewVoyageClient(cfg.Voyage.APIKey, cfg.Voyage.Model)
	}

	weatherClient := weather.NewClient()

	// 4. Initialize Core Layers
	templateEngine := layer.NewTemplateEngine(layer.TemplateEngineConfig{
		CacheTTL: 5 * time.Minute,
	})
	nodeResolver := layer.NewNodeResolver()
	l2Injector := layer.NewL2Injector(odptClient)
	factChecker, _ := validation.NewFactChecker()

	// 5. Initialize Skill Registry
	skillRegistry := skill.NewRegistry()
	skillRegistry.Register(implementations.NewFareSkill())
	skillRegistry.Register(implementations.NewAccessibilitySkill())
	skillRegistry.Register(implementations.NewMedicalSkill())
	skillRegistry.Register(implementations.NewExitStrategistSkill())
	skillRegistry.Register(implementations.NewLocalGuideSkill())
	skillRegistry.Register(implementations.NewSpatialReasonerSkill())
	skillRegistry.Register(implementations.NewInfoLinksSkill())

	// 6. Initialize Routing Engine (Phase 3)
	var pathfinder *router.Pathfinder
	var graph *router.Graph
	if supabaseClient != nil {
		loader := router.NewLoader(supabaseClient)
		g, err := loader.BuildGraph(context.Background())
		if err == nil {
			graph = g
			pathfinder = router.NewPathfinder(graph)
			slog.Info("Routing Engine (Graph) initialized")
		} else {
			slog.Warn("Routing Engine failed to initialize", "error", err)
		}
	}

	// 7. Initialize ADK Agents
	routeAgent, _ := agent.NewRouteAgent(orModelBridge, cfg.Models.RouteAgent, cfg.RoutingServiceURL)
	statusAgent, _ := agent.NewStatusAgent(orModelBridge, cfg.Models.StatusAgent, odptClient)

	reasoningBridge := orModelBridge
	generalProvider := "openrouter"
	if zeaburModelBridge != nil {
		reasoningBridge = zeaburModelBridge
		generalProvider = "zeabur"
	}

	generalAgent, _ := agent.NewGeneralAgent(reasoningBridge, cfg.Models.GeneralAgent, []tool.Tool{
		&agent.GetCurrentTimeTool{},
		&agent.SearchRouteTool{RoutingURL: cfg.RoutingServiceURL},
		&agent.GetTrainStatusTool{FetchFunc: func() (string, error) {
			statuses, err := odptClient.FetchTrainStatus()
			if err != nil {
				return "", err
			}
			bytes, err := json.Marshal(statuses)
			if err != nil {
				return "", err
			}
			return string(bytes), nil
		}},
		&agent.GetTimetableTool{Client: supabaseClient},
		agent.NewPlanRouteTool(pathfinder, weatherClient, graph),
	})
	fastAgent, _ := agent.NewGeneralAgent(orModelBridge, cfg.Models.FastAgent, nil)
	rootAgent, _ := agent.NewRootAgent(reasoningBridge, cfg.Models.GeneralAgent)

	slog.Info("ADK Agents initialized")

	// 8. Initialize Layered Engine
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
		GeneralProvider: generalProvider,
		FastProvider:    "openrouter",
		RouteProvider:   "openrouter",
		StatusProvider:  "openrouter",
		RootProvider:    generalProvider,
		FactChecker:     factChecker,
		Pathfinder:      pathfinder,
	})

	// 9. Setup HTTP Routes
	http.HandleFunc("/api/chat", handleChat)
	http.HandleFunc("/agent/chat", handleChat)
	http.HandleFunc("/agent/memory", handleMemory)
	http.HandleFunc("/agent/feedback", handleFeedback)
	http.HandleFunc("/health", healthChecker.HandleHealth)
	http.HandleFunc("/health/ready", healthChecker.HandleHealthReady)
	http.HandleFunc("/health/live", healthChecker.HandleHealthLive)
	http.HandleFunc("/metrics", handleMetrics)

	// 10. Start Server
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
		Messages            []agent.Message `json:"messages"`
		Locale              string          `json:"locale"`
		UserID              string          `json:"user_id"`
		SessionID           string          `json:"session_id"`
		IsAuthenticated     bool            `json:"is_authenticated"`
		Timezone            string          `json:"timezone"`
		ClientNowISO        string          `json:"client_now_iso"`
		ResponseMode        string          `json:"response_mode"`
		TokenProfile        string          `json:"token_profile"`
		MaxContextTokens    int             `json:"max_context_tokens"`
		HistoryBudgetTokens int             `json:"history_budget_tokens"`
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
	requestID := fmt.Sprintf("req-%d", time.Now().UnixNano())
	slog.Info("Processing chat request", "traceID", traceID, "requestID", requestID)

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

	if req.Timezone == "" {
		req.Timezone = "Asia/Tokyo"
	}
	if req.SessionID == "" {
		req.SessionID = fmt.Sprintf("guest-%d", time.Now().UnixNano())
	}
	if req.UserID == "" {
		req.UserID = req.SessionID
	}
	memoryScope := memory.GuestScope
	if req.IsAuthenticated && req.UserID != "" && req.UserID != req.SessionID {
		memoryScope = memory.MemberScope
	}

	mergedMessages := req.Messages
	if memoryStore != nil {
		if profile, err := memoryStore.LoadProfile(ctx, memoryScope, req.UserID, req.SessionID); err == nil {
			if msg := memoryStore.BuildContextMessage(profile, req.Locale); msg != nil {
				mergedMessages = append([]agent.Message{*msg}, mergedMessages...)
			}
		}
	}

	metaBytes, _ := json.Marshal(map[string]string{
		"status":     "processing",
		"trace_id":   traceID,
		"request_id": requestID,
	})
	sendEvent("meta", string(metaBytes))

	respCh := engine.Process(ctx, orchestrator.ProcessRequest{
		Messages:            mergedMessages,
		Locale:              req.Locale,
		TraceID:             traceID,
		SessionID:           req.SessionID,
		UserID:              req.UserID,
		IsAuthenticated:     req.IsAuthenticated,
		Timezone:            req.Timezone,
		ClientNowISO:        req.ClientNowISO,
		ResponseMode:        req.ResponseMode,
		TokenProfile:        req.TokenProfile,
		MaxContextTokens:    req.MaxContextTokens,
		HistoryBudgetTokens: req.HistoryBudgetTokens,
	})

	var assistantFull strings.Builder
	for chunk := range respCh {
		if strings.HasPrefix(chunk, "[[TOOL_TRACE]]") {
			sendEvent("tool_trace", strings.TrimPrefix(chunk, "[[TOOL_TRACE]]"))
			continue
		}
		if strings.HasPrefix(chunk, "[[DECISION_TRACE]]") {
			sendEvent("decision_trace", strings.TrimPrefix(chunk, "[[DECISION_TRACE]]"))
			continue
		}
		if strings.HasPrefix(chunk, "[[STRUCTURED_DATA]]") {
			sendEvent("structured_data", strings.TrimPrefix(chunk, "[[STRUCTURED_DATA]]"))
			continue
		}
		assistantFull.WriteString(chunk)
		dataBytes, _ := json.Marshal(map[string]string{"content": chunk})
		sendEvent("telem", string(dataBytes))
	}

	lastUser := ""
	for i := len(req.Messages) - 1; i >= 0; i-- {
		if req.Messages[i].Role == "user" {
			lastUser = req.Messages[i].Content
			break
		}
	}
	if memoryStore != nil {
		_ = memoryStore.SaveTurn(ctx, memory.SaveTurnInput{
			Scope:         memoryScope,
			UserID:        req.UserID,
			SessionID:     req.SessionID,
			Locale:        req.Locale,
			LastUser:      lastUser,
			LastAssistant: assistantFull.String(),
		})
	}

	sendEvent("done", "{}")
}

func handleMetrics(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	stats := engine.GetMetricsStats()
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "ok",
		"metrics": stats,
	})
}

func handleMemory(w http.ResponseWriter, r *http.Request) {
	if memoryStore == nil {
		http.Error(w, "memory store unavailable", http.StatusServiceUnavailable)
		return
	}
	switch r.Method {
	case http.MethodGet:
		handleMemoryGet(w, r)
	case http.MethodDelete:
		handleMemoryDelete(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func handleMemoryGet(w http.ResponseWriter, r *http.Request) {
	scope := strings.TrimSpace(r.URL.Query().Get("scope"))
	if scope == "" {
		scope = memory.GuestScope
	}
	userID := strings.TrimSpace(r.URL.Query().Get("user_id"))
	sessionID := strings.TrimSpace(r.URL.Query().Get("session_id"))
	if scope == memory.MemberScope && userID == "" {
		http.Error(w, "user_id is required for member scope", http.StatusBadRequest)
		return
	}
	if scope != memory.MemberScope && sessionID == "" {
		http.Error(w, "session_id is required for guest scope", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()
	profile, err := memoryStore.LoadProfile(ctx, scope, userID, sessionID)
	if err != nil {
		http.Error(w, "failed to load memory", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"ok":      true,
		"profile": profile,
	})
}

func handleMemoryDelete(w http.ResponseWriter, r *http.Request) {
	userID := strings.TrimSpace(r.URL.Query().Get("user_id"))
	if userID == "" {
		http.Error(w, "user_id is required", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()
	if err := memoryStore.DeleteMemberMemory(ctx, userID); err != nil {
		http.Error(w, "failed to delete memory", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"ok":      true,
		"user_id": userID,
	})
}

func handleFeedback(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		TraceID    string   `json:"trace_id"`
		UserID     string   `json:"user_id"`
		SessionID  string   `json:"session_id"`
		Locale     string   `json:"locale"`
		Query      string   `json:"query"`
		Response   string   `json:"response"`
		Helpful    bool     `json:"helpful"`
		IntentTags []string `json:"intent_tags"`
		NodeID     string   `json:"node_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	if len(req.IntentTags) == 0 && strings.TrimSpace(req.Query) != "" {
		_, req.IntentTags = orchestrator.AnalyzeIntentForQuery(req.Query)
	}
	orchestrator.UpdateIntentTagFeedback(req.IntentTags, req.Helpful)

	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()
	if feedbackStore != nil {
		_ = feedbackStore.Record(ctx, feedback.Event{
			TraceID:    req.TraceID,
			UserID:     req.UserID,
			SessionID:  req.SessionID,
			Locale:     req.Locale,
			Query:      req.Query,
			Response:   req.Response,
			Helpful:    req.Helpful,
			IntentTags: req.IntentTags,
			NodeID:     req.NodeID,
		})
		_ = feedbackStore.SaveWeights(ctx, orchestrator.GetIntentFeedbackWeights())
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"ok":      true,
		"tags":    req.IntentTags,
		"helpful": req.Helpful,
		"weights": orchestrator.GetIntentFeedbackWeights(),
	})
}
