package config

import (
    "os"
)

type Config struct {
    OpenRouter struct {
        APIKey string
    }
    ODPT struct {
        APIKey string
        APIUrl string
    }
    Models struct {
        RootAgent     string
        RouteAgent    string
        StatusAgent   string
        FacilityAgent string
        GeneralAgent  string
    }
    Port string
}

func Load() *Config {
    cfg := &Config{}
    
    // API Keys
    cfg.OpenRouter.APIKey = os.Getenv("OPENROUTER_API_KEY")

    cfg.ODPT.APIKey = os.Getenv("ODPT_API_KEY")
    cfg.ODPT.APIUrl = getEnv("ODPT_API_URL", "https://api.odpt.org/api/v4/odpt:TrainInformation")
    
    // Model Definitions
    cfg.Models.RootAgent = getEnv("MODEL_ROOT_AGENT", "google/gemini-3-flash-preview")
    cfg.Models.RouteAgent = getEnv("MODEL_ROUTE_AGENT", "deepseek/deepseek-chat-v3-0324")
    cfg.Models.StatusAgent = getEnv("MODEL_STATUS_AGENT", "deepseek/deepseek-chat-v3-0324")
    cfg.Models.FacilityAgent = getEnv("MODEL_FACILITY_AGENT", "google/gemini-2.5-flash-lite-preview-06-17")
    cfg.Models.GeneralAgent = getEnv("MODEL_GENERAL_AGENT", "deepseek/deepseek-chat-v3-0324")
    
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
