package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	OpenRouter struct {
		APIKey  string
		BaseURL string
	}
	Zeabur struct {
		APIKey  string
		BaseURL string
	}
	ODPT struct {
		APIKey string
		APIUrl string
	}
	Supabase struct {
		URL        string
		ServiceKey string
	}
	Voyage struct {
		APIKey string
		Model  string
	}
	Models struct {
		// Agent Models (OpenRouter with Function Calling)
		RouteAgent  string
		StatusAgent string

		// Reasoning Models (Zeabur AI Hub for General Logic/Chat)
		RootAgent     string
		FacilityAgent string
		GeneralAgent  string
		FastAgent     string
	}
	Redis struct {
		URL string
	}
	Memory struct {
		GuestTTLHours      int
		MemberHotTTLHours  int
		PersistEveryNTurns int
	}
	Token struct {
		DefaultProfile       string
		DefaultResponseMode  string
		DefaultContextTokens int
		RAGSummaryMaxChars   int
	}
	Layer struct {
		TemplateCacheTTL time.Duration
		RAGThreshold     float64
		RAGTopK          int
	}
	Monitoring struct {
		MetricsEnabled bool
		TracingEnabled bool
	}
	RoutingServiceURL  string
	L2StatusServiceURL string
	Port               string
}

func Load() *Config {
	cfg := &Config{}

	// OpenRouter (Function Calling Specialist)
	cfg.OpenRouter.APIKey = os.Getenv("OPENROUTER_API_KEY")
	cfg.OpenRouter.BaseURL = getEnv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")

	// Zeabur AI Hub (General Logic/Chat Specialist)
	cfg.Zeabur.APIKey = os.Getenv("ZEABUR_API_KEY")
	// Use regional endpoint (Tokyo) as default for better latency
	cfg.Zeabur.BaseURL = getEnv("ZEABUR_BASE_URL", "https://hnd1.aihub.zeabur.ai/v1")

	cfg.ODPT.APIKey = os.Getenv("ODPT_API_KEY")
	cfg.ODPT.APIUrl = getEnv("ODPT_API_URL", "https://api.odpt.org/api/v4/odpt:TrainInformation")

	// Supabase
	cfg.Supabase.URL = getEnv("SUPABASE_URL", os.Getenv("NEXT_PUBLIC_SUPABASE_URL"))
	cfg.Supabase.ServiceKey = os.Getenv("SUPABASE_SERVICE_KEY")

	// Voyage AI
	cfg.Voyage.APIKey = os.Getenv("VOYAGE_API_KEY")
	cfg.Voyage.Model = getEnv("VOYAGE_MODEL", "voyage-4-lite")

	// Internal Services
	cfg.RoutingServiceURL = getEnv("L4_ROUTING_SERVICE_URL", getEnv("ROUTING_SERVICE_URL", "http://localhost:8787/l4/route"))
	cfg.L2StatusServiceURL = getEnv("L2_STATUS_SERVICE_URL", "http://localhost:8083/api/status")

	// Model Definitions (Explicitly Pinned) - Updated to DeepSeek V3.2 as per user request
	// Model Definitions (Explicitly Pinned) - Updated to DeepSeek V3.2
	cfg.Models.RootAgent = getEnv("MODEL_ROOT_AGENT", "deepseek-v3.2")
	cfg.Models.RouteAgent = getEnv("MODEL_ROUTE_AGENT", "deepseek-v3.2")
	cfg.Models.StatusAgent = getEnv("MODEL_STATUS_AGENT", "deepseek-v3.2")
	cfg.Models.FacilityAgent = getEnv("MODEL_FACILITY_AGENT", "deepseek-v3.2")
	cfg.Models.GeneralAgent = getEnv("MODEL_GENERAL_AGENT", "deepseek-v3.2")
	cfg.Models.FastAgent = getEnv("MODEL_FAST_AGENT", "google/gemini-2.0-flash-001") // Lightweight SLM for standard queries

	// Redis
	cfg.Redis.URL = getEnv("REDIS_URL", "redis://localhost:6379/0")
	cfg.Memory.GuestTTLHours, _ = strconv.Atoi(getEnv("MEMORY_GUEST_TTL_HOURS", "24"))
	cfg.Memory.MemberHotTTLHours, _ = strconv.Atoi(getEnv("MEMORY_MEMBER_HOT_TTL_HOURS", "168"))
	cfg.Memory.PersistEveryNTurns, _ = strconv.Atoi(getEnv("MEMORY_PERSIST_EVERY_N_TURNS", "6"))
	cfg.Token.DefaultProfile = getEnv("TOKEN_DEFAULT_PROFILE", "balanced")
	cfg.Token.DefaultResponseMode = getEnv("TOKEN_DEFAULT_RESPONSE_MODE", "concise")
	cfg.Token.DefaultContextTokens, _ = strconv.Atoi(getEnv("TOKEN_DEFAULT_CONTEXT_TOKENS", "1000"))
	cfg.Token.RAGSummaryMaxChars, _ = strconv.Atoi(getEnv("TOKEN_RAG_SUMMARY_MAX_CHARS", "1400"))

	// Layer Configuration
	ttlMs, _ := strconv.Atoi(getEnv("TEMPLATE_CACHE_TTL_MS", "300000"))
	cfg.Layer.TemplateCacheTTL = time.Duration(ttlMs) * time.Millisecond
	cfg.Layer.RAGThreshold, _ = strconv.ParseFloat(getEnv("RAG_THRESHOLD", "0.5"), 64)
	cfg.Layer.RAGTopK, _ = strconv.Atoi(getEnv("RAG_TOP_K", "5"))

	// Monitoring
	cfg.Monitoring.MetricsEnabled = getEnv("METRICS_ENABLED", "true") == "true"
	cfg.Monitoring.TracingEnabled = getEnv("TRACING_ENABLED", "true") == "true"

	// Server Port
	cfg.Port = getEnv("PORT", "8080")

	return cfg
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
