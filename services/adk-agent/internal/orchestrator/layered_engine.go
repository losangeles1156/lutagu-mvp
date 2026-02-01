package orchestrator

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/lutagu/adk-agent/internal/agent"
	"github.com/lutagu/adk-agent/internal/config"
	"github.com/lutagu/adk-agent/internal/infrastructure/embedding"
	"github.com/lutagu/adk-agent/internal/infrastructure/supabase"
	"github.com/lutagu/adk-agent/internal/infrastructure/weather"
	"github.com/lutagu/adk-agent/internal/layer"
	"github.com/lutagu/adk-agent/internal/skill"
	"github.com/lutagu/adk-agent/internal/validation"
)

// LayeredEngine implements multi-layer decision flow
// L1 (Template) → L2 (Algorithm) → L3/L4 (RAG/Skill) → L5 (LLM Fallback)
type LayeredEngine struct {
	cfg             *config.Config
	templateEngine  *layer.TemplateEngine
	nodeResolver    *layer.NodeResolver
	l2Injector      *layer.L2Injector
	weatherClient   *weather.Client
	skillRegistry   *skill.Registry
	vectorStore     *supabase.VectorStore
	embeddingClient *embedding.VoyageClient
	routeAgent      *agent.RouteAgent
	statusAgent     *agent.StatusAgent
	generalAgent    *agent.GeneralAgent
	fastAgent       *agent.GeneralAgent // SLM for fast answers
	rootAgent       *agent.RootAgent    // Intent Classification
	model           string
	metrics         *Metrics
	factChecker     *validation.FactChecker
}

// LayeredEngineConfig holds engine dependencies
type LayeredEngineConfig struct {
	Config          *config.Config
	TemplateEngine  *layer.TemplateEngine
	NodeResolver    *layer.NodeResolver
	L2Injector      *layer.L2Injector
	WeatherClient   *weather.Client
	SkillRegistry   *skill.Registry
	VectorStore     *supabase.VectorStore
	EmbeddingClient *embedding.VoyageClient
	RouteAgent      *agent.RouteAgent
	StatusAgent     *agent.StatusAgent
	GeneralAgent    *agent.GeneralAgent
	FastAgent       *agent.GeneralAgent
	RootAgent       *agent.RootAgent
	Model           string
	FactChecker     *validation.FactChecker
}

// NewLayeredEngine creates a new multi-layer engine
func NewLayeredEngine(engineCfg LayeredEngineConfig) *LayeredEngine {
	return &LayeredEngine{
		cfg:             engineCfg.Config,
		templateEngine:  engineCfg.TemplateEngine,
		nodeResolver:    engineCfg.NodeResolver,
		l2Injector:      engineCfg.L2Injector,
		weatherClient:   engineCfg.WeatherClient,
		skillRegistry:   engineCfg.SkillRegistry,
		vectorStore:     engineCfg.VectorStore,
		embeddingClient: engineCfg.EmbeddingClient,
		routeAgent:      engineCfg.RouteAgent,
		statusAgent:     engineCfg.StatusAgent,
		generalAgent:    engineCfg.GeneralAgent,
		fastAgent:       engineCfg.FastAgent,
		rootAgent:       engineCfg.RootAgent,
		model:           engineCfg.Model,
		metrics:         NewMetrics(),
		factChecker:     engineCfg.FactChecker,
	}
}

// ProcessRequest is the main entry point for the layered engine
type ProcessRequest struct {
	Messages  []agent.Message
	Locale    string
	TraceID   string
	SessionID string
}

// ProcessResponse contains the engine result
type ProcessResponse struct {
	Content      string
	Category     string
	Layer        string // Which layer responded
	Confidence   float64
	L2Context    *layer.L2Context
	NodeContext  *layer.ResolvedContext
	ResponseTime time.Duration
	Logs         []string
}

// Process handles the request through multi-layer decision flow
func (e *LayeredEngine) Process(ctx context.Context, req ProcessRequest) <-chan string {
	outCh := make(chan string)

	go func() {
		defer close(outCh)

		startTime := time.Now()
		logs := []string{}

		traceID := req.TraceID
		if traceID == "" {
			traceID = fmt.Sprintf("trace-%d", time.Now().UnixNano())
		}

		logger := slog.With("traceID", traceID)

		// Extract last user message
		lastMessage := ""
		for i := len(req.Messages) - 1; i >= 0; i-- {
			if req.Messages[i].Role == "user" {
				lastMessage = req.Messages[i].Content
				break
			}
		}

		if lastMessage == "" {
			outCh <- "No message provided"
			return
		}

		logger.Info("Processing request", "query", truncate(lastMessage, 50), "locale", req.Locale)
		logs = append(logs, fmt.Sprintf("[Start] Query: %s", truncate(lastMessage, 30)))

		// ============================
		// L0: Context Resolution
		// ============================
		nodeCtx := e.nodeResolver.Resolve(ctx, lastMessage)
		logs = append(logs, fmt.Sprintf("[L0] NodeResolver: primary=%s, confidence=%.2f", nodeCtx.PrimaryNodeID, nodeCtx.Confidence))

		// Fetch L2 status (non-blocking with fallback)
		var l2Ctx *layer.L2Context
		if e.l2Injector != nil {
			l2Ctx, _ = e.l2Injector.Fetch(ctx)
			if l2Ctx != nil && l2Ctx.HasDisruption {
				logs = append(logs, fmt.Sprintf("[L0] L2: %d disruptions", len(l2Ctx.DisruptedLines)))
			}
		}

		// Fetch Weather (Best Effort)
		var weatherCtx *weather.CurrentWeather
		if e.weatherClient != nil {
			w, err := e.weatherClient.FetchTokyoWeather()
			if err == nil {
				weatherCtx = w
				logs = append(logs, fmt.Sprintf("[L0] Weather: %s (%.1f°C)", w.Condition, w.Temperature))
			} else {
				logs = append(logs, fmt.Sprintf("[L0] Weather fetch failed: %v", err))
			}
		}

		// ============================
		// L1: Template Engine (Fast Path)
		// ============================
		e.metrics.RecordLayerAttempt("L1")
		templateStart := time.Now()

		if e.templateEngine != nil {
			tmplCtx := layer.TemplateContext{
				Query:      lastMessage,
				Locale:     req.Locale,
				NodeCtx:    nodeCtx,
				WeatherCtx: weatherCtx,
				L2Ctx:      l2Ctx,
				Time:       time.Now(),
			}

			if match := e.templateEngine.Match(tmplCtx); match != nil && match.Matched {
				e.metrics.RecordLayerSuccess("L1", time.Since(templateStart))

				outCh <- match.Content
				logger.Info("Responded from L1 Template", "category", match.Category, "latency", time.Since(startTime))
				return
			}
		}
		logs = append(logs, "[L1] Template miss")

		// ============================
		// L2: Algorithm Layer (Route/Status Detection)
		// ============================
		e.metrics.RecordLayerAttempt("L2")
		l2Start := time.Now()

		// Check if it's a route query
		if nodeCtx.IsRouteQuery && e.routeAgent != nil {
			logs = append(logs, fmt.Sprintf("[L2] Route query detected: %s → %s", nodeCtx.Origin, nodeCtx.Destination))

			// Inject L2 disruption context
			routeReqCtx := agent.RequestContext{
				Locale: req.Locale,
			}

			routeCh, err := e.routeAgent.Process(ctx, req.Messages, routeReqCtx)
			if err == nil && routeCh != nil {
				e.metrics.RecordLayerSuccess("L2", time.Since(l2Start))

				for chunk := range routeCh {
					outCh <- chunk
				}

				// Append L2 warning if disruptions exist
				if l2Ctx != nil && l2Ctx.HasDisruption {
					outCh <- "\n\n" + l2Ctx.Summary
				}

				logger.Info("Responded from L2 RouteAgent", "latency", time.Since(startTime))
				return
			} else if err != nil {
				logs = append(logs, fmt.Sprintf("[L2] RouteAgent error: %v", err))
			}
		}

		// Check if it's a status query
		if isStatusQuery(lastMessage) && e.statusAgent != nil {
			logs = append(logs, "[L2] Status query detected")

			statusReqCtx := agent.RequestContext{Locale: req.Locale}
			statusCh, err := e.statusAgent.Process(ctx, req.Messages, statusReqCtx)
			if err == nil && statusCh != nil {
				e.metrics.RecordLayerSuccess("L2", time.Since(l2Start))

				for chunk := range statusCh {
					outCh <- chunk
				}

				logger.Info("Responded from L2 StatusAgent", "latency", time.Since(startTime))
				return
			}
		}
		logs = append(logs, "[L2] Algorithm fallthrough")

		// ============================
		// L3/L4: Skill + RAG Layer
		// ============================
		e.metrics.RecordLayerAttempt("L3")
		l3Start := time.Now()

		// Try skill matching
		if e.skillRegistry != nil {
			skillCtx := skill.SkillContext{
				NodeID:      nodeCtx.PrimaryNodeID,
				NodeName:    nodeCtx.PrimaryNodeName,
				Locale:      req.Locale,
				L2Disrupted: l2Ctx != nil && l2Ctx.HasDisruption,
			}

			skillRequest := skill.SkillRequest{
				Query:   lastMessage,
				Context: skillCtx,
			}

			if result, err := e.skillRegistry.Execute(ctx, lastMessage, skillRequest); err == nil && result != nil {
				e.metrics.RecordLayerSuccess("L3", time.Since(l3Start))
				logs = append(logs, fmt.Sprintf("[L3] Skill executed: %s (%.2f)", result.Category, result.Confidence))

				outCh <- result.Content

				// If skill needs LLM refinement, continue to L5
				if result.NeedsLLM {
					logs = append(logs, "[L3] Skill requests LLM refinement")
					// Fall through to L5
				} else {
					logger.Info("Responded from L3 Skill", "category", result.Category, "latency", time.Since(startTime))
					return
				}
			}
		}

		// Try RAG search
		e.metrics.RecordLayerAttempt("L4")
		var ragContext string
		if e.vectorStore != nil && e.embeddingClient != nil {
			queryEmbed, err := e.embeddingClient.EmbedQuery(ctx, lastMessage)
			if err == nil {
				opts := supabase.SearchOptions{
					Limit:     e.cfg.Layer.RAGTopK,
					Threshold: e.cfg.Layer.RAGThreshold,
					NodeID:    nodeCtx.PrimaryNodeID,
				}

				results, err := e.vectorStore.Search(ctx, queryEmbed, opts)
				if err == nil && len(results) > 0 {
					e.metrics.RecordLayerSuccess("L4", time.Since(l3Start))
					logs = append(logs, fmt.Sprintf("[L4] RAG: found %d documents", len(results)))

					for _, r := range results {
						ragContext += fmt.Sprintf("- %s (similarity: %.2f)\n", truncate(r.Content, 200), r.Similarity)
					}
				}
			}
		}

		// L5: LLM Fallback (Tiered Reasoning)
		// ============================
		e.metrics.RecordLayerAttempt("L5")
		l5Start := time.Now()

		// Decision Tier Selection: Use FastAgent (SLM) for standard tasks
		selectedAgent := e.generalAgent
		systemPrompt := e.buildSystemPrompt(req.Locale, ragContext, l2Ctx, nodeCtx, weatherCtx)
		isFastPath := false

		// Trigger SLM for high-confidence standard routing or status queries
		if (nodeCtx.IsRouteQuery && nodeCtx.Confidence > 0.8) || isStatusQuery(lastMessage) {
			if e.fastAgent != nil {
				selectedAgent = e.fastAgent
				systemPrompt = e.buildFastPrompt(req.Locale, l2Ctx, nodeCtx, weatherCtx)
				isFastPath = true
				logs = append(logs, "[L5] Tier: SLM (FastPath)")
			}
		}

		if !isFastPath {
			logs = append(logs, "[L5] Tier: LLM (Deep Reasoning)")
		}

		if selectedAgent != nil {
			reqCtx := agent.RequestContext{
				Locale:    req.Locale,
				SessionID: req.SessionID,
			}

			// Prepend appropriate prompt
			msgsWithSys := append([]agent.Message{{Role: "system", Content: systemPrompt}}, req.Messages...)

			respCh, err := selectedAgent.Process(ctx, msgsWithSys, reqCtx)
			if err == nil && respCh != nil {
				e.metrics.RecordLayerSuccess("L5", time.Since(l5Start))

				var fullText strings.Builder
				for chunk := range respCh {
					outCh <- chunk
					fullText.WriteString(chunk)
				}

				// Post-processing: Fact Check (Localized)
				if e.factChecker != nil {
					checkResult := e.factChecker.Check(lastMessage, fullText.String(), req.Locale)
					if checkResult.HasHallucination {
						correction := strings.TrimPrefix(checkResult.CorrectedResponse, fullText.String())
						if correction != "" {
							outCh <- correction
						}
					}
				}

				logger.Info("Responded from L5 LLM (GeneralAgent)", "latency", time.Since(startTime))
				return
			}
		}

		// Ultimate fallback
		outCh <- "抱歉，我目前無法處理您的請求。請稍後再試。"
		logger.Warn("All layers failed", "logs", logs)
	}()

	return outCh
}

func (e *LayeredEngine) buildSystemPrompt(locale, ragContext string, l2Ctx *layer.L2Context, nodeCtx *layer.ResolvedContext, weatherCtx *weather.CurrentWeather) string {
	// Standardize on JST for all decision making
	loc, _ := time.LoadLocation("Asia/Tokyo")
	now := time.Now().In(loc)
	timeStr := now.Format("2006-01-02 15:04 (Mon)")

	weatherStr := "Unknown (Assume clear)"
	weatherAdvice := "" // Dynamic advice based on weather
	if weatherCtx != nil {
		weatherStr = fmt.Sprintf("%s, %.1f°C, Humidity: %d%%", weatherCtx.Condition, weatherCtx.Temperature, weatherCtx.Humidity)
		if weatherCtx.IsRaining {
			weatherAdvice = "\n- ☔ **RAIN ALERT**: It is currently raining. **Prioritize underground routes, indoor transfers, and covered walkways.** Suggest taxis for short distances."
		} else if weatherCtx.Temperature > 30 {
			weatherAdvice = "\n- ☀️ **HEAT ALERT**: High temperature detected. Suggest minimizing outdoor walking and staying hydrated."
		}
	}

	prompt := fmt.Sprintf(`You are LUTAGU, an expert Tokyo Transportation Concierge.
Current Time (JST): %s
Current Weather: %s
Current Locale: %s
Model: Deep Reasoning Mode (Zeabur AI Hub / DeepSeek V3.2)

## CORE DIRECTIVES:
1. **Dynamic Context Awareness**: ALWAYS checks the current time, weather, and disruption status before answering.
2. **Expert Routing**: When suggesting routes, consider transfers, congestion, weather impact, and "last mile" complexity.
3. **Data-Driven**: Use the provided RAG knowledge (Knowledge Base), Real-time Status (L2), and Weather as your primary truth.
4. **Expert Comparison**: Always compare **Speed** (Fastest) vs **Comfort** (Easiest) vs **Cost** (Cheapest). For example, Chuo Rapid is faster than Yamanote for cross-town trips.
5. **Safety First**: If a line is suspended (⛔) or delayed (⚠️), proactively suggest alternatives.
5. **Weather Adaptive**: %s

`, timeStr, weatherStr, locale, weatherAdvice)

	if l2Ctx != nil && l2Ctx.HasDisruption {
		prompt += e.l2Injector.ForSystemPrompt(l2Ctx)
	}

	if nodeCtx != nil && nodeCtx.PrimaryNodeID != "" {
		prompt += fmt.Sprintf("## USER CONTEXT\nDetected Location/Station: %s\n\n", nodeCtx.PrimaryNodeName)
	}

	if ragContext != "" {
		prompt += fmt.Sprintf("## EXPERT KNOWLEDGE BASE (RAG)\n%s\n\n", ragContext)
	}

	prompt += `## RESPONSE GUIDELINES:
- **Think step-by-step**: Analyze Time -> Weather -> Status -> User Intent -> Solution.
- **Show your work**: Briefly mention *why* you are suggesting something (e.g., "Since it's raining...", "Because the ginza line is delayed...").
- Respond concisely but with the authority of a local expert.
- Answer primarily in the user's language (%s).`

	return fmt.Sprintf(prompt, locale)
}

func (e *LayeredEngine) buildFastPrompt(locale string, l2Ctx *layer.L2Context, nodeCtx *layer.ResolvedContext, weatherCtx *weather.CurrentWeather) string {
	now := time.Now()
	timeStr := now.Format("15:04 (Mon)")
	weatherStr := "Unknown"
	if weatherCtx != nil {
		weatherStr = fmt.Sprintf("%s, %.1f°C", weatherCtx.Condition, weatherCtx.Temperature)
	}

	prompt := fmt.Sprintf(`You are LUTAGU (Fast Task Tier).
[Context] Time: %s, Weather: %s.`, timeStr, weatherStr)

	// Inject Node Context (Vector/Focus)
	if nodeCtx != nil {
		if nodeCtx.IsRouteQuery && nodeCtx.Origin != "" && nodeCtx.Destination != "" {
			prompt += fmt.Sprintf("\n[Intent] Route: %s -> %s", nodeCtx.Origin, nodeCtx.Destination)
		} else if nodeCtx.PrimaryNodeName != "" {
			prompt += fmt.Sprintf("\n[Focus] Node: %s", nodeCtx.PrimaryNodeName)
		}
	}

	prompt += fmt.Sprintf(`
[Instructions]
- Provide a concise, expert answer for the user's transit/status question.
- Prioritize SPEED: If it's a route, give the fastest 1-2 options immediately.
- If status data is present, mention it briefly.
- Answer in %s.`, locale)

	if l2Ctx != nil && l2Ctx.HasDisruption {
		prompt += "\n[Status] " + e.l2Injector.ForSystemPrompt(l2Ctx)
	}

	return prompt
}

func isStatusQuery(query string) bool {
	statusPatterns := []string{
		"運行", "遅延", "遅れ", "運休", "見合わせ",
		"delay", "status", "suspended",
		"誤點", "延誤", "停駛", "運行狀況",
	}
	lc := strings.ToLower(query)
	for _, p := range statusPatterns {
		if strings.Contains(lc, p) {
			return true
		}
	}
	return false
}

func truncate(s string, maxLen int) string {
	runes := []rune(s)
	if len(runes) <= maxLen {
		return s
	}
	return string(runes[:maxLen]) + "..."
}
