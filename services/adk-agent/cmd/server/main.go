package main

import (
    "context"
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "strings"
    "time"

    "github.com/lutagu/adk-agent/internal/agent"
    "github.com/lutagu/adk-agent/internal/config"
    "github.com/lutagu/adk-agent/internal/infrastructure/odpt"
    "github.com/lutagu/adk-agent/pkg/openrouter"
)

var (
    cfg         *config.Config
    rootAgent   *agent.RootAgent
    routeAgent  *agent.RouteAgent
    statusAgent *agent.StatusAgent
)

func main() {
    log.SetFlags(log.LstdFlags | log.Lshortfile)
    cfg = config.Load()

    // Initialize Clients
    orClient, err := openrouter.NewClient(openrouter.Config{APIKey: cfg.OpenRouter.APIKey})
    if err != nil {
        log.Fatalf("Failed to create OpenRouter client: %v", err)
    }
    odptClient := odpt.NewClient(cfg.ODPT.APIKey, cfg.ODPT.APIUrl)

    // Initialize Agents with configured models
    rootAgent = agent.NewRootAgent(orClient, cfg.Models.RootAgent)
    routeAgent = agent.NewRouteAgent(orClient, cfg.Models.RouteAgent)
    statusAgent = agent.NewStatusAgent(orClient, cfg.Models.StatusAgent, odptClient)
    
    log.Printf("Agents initialized: Root=%s, Route=%s, Status=%s", 
        cfg.Models.RootAgent, cfg.Models.RouteAgent, cfg.Models.StatusAgent)

    http.HandleFunc("/api/chat", handleChat)
    http.HandleFunc("/health", handleHealth)

    log.Printf("Server listening on port %s", cfg.Port)
    if err := http.ListenAndServe(":"+cfg.Port, nil); err != nil {
        log.Fatalf("Server failed: %v", err)
    }
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(http.StatusOK)
    w.Write([]byte("ok"))
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

    // 2. Setup Context
    ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
    defer cancel()

    reqCtx := agent.RequestContext{
        Locale: req.Locale,
    }

    // 3. Setup Streaming Response
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

    // 4. Intent Classification (Root Agent)
    sendEvent("meta", `{"status":"thinking", "message":"Analyzing request..."}`)
    
    intentChan, err := rootAgent.Process(ctx, req.Messages, reqCtx)
    if err != nil {
        log.Printf("Root agent failed: %v", err)
        sendEvent("error", err.Error())
        return
    }

    // Read intent
    intentMsg := <-intentChan
    intent := strings.TrimPrefix(intentMsg, "INTENT_DETECTED:")
    log.Printf("Intent detected: %s", intent)
    
    sendEvent("meta", fmt.Sprintf(`{"status":"routing", "intent":"%s"}`, intent))

    // 5. Route to Sub-Agent
    var subAgent agent.Agent
    switch intent {
    case "ROUTE":
        subAgent = routeAgent
    case "STATUS":
        subAgent = statusAgent
    default:
        // Fallback to route agent for now as general agent
        subAgent = routeAgent
    }

    // 6. Execute Sub-Agent & Stream
    respChan, err := subAgent.Process(ctx, req.Messages, reqCtx)
    if err != nil {
        log.Printf("Sub-agent failed: %v", err)
        sendEvent("error", err.Error())
        return
    }

    for chunk := range respChan {
        // Sanitize JSON chars if needed, but for now simple string
        // In reality, should JSON encode the data payload
        dataBytes, _ := json.Marshal(map[string]string{"content": chunk})
        sendEvent("telem", string(dataBytes))
    }

    sendEvent("done", "{}")
}
