package orchestrator

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/lutagu/adk-agent/internal/agent"
	"github.com/lutagu/adk-agent/internal/config"
	"github.com/lutagu/adk-agent/internal/engine/router"
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
	pathfinder      *router.Pathfinder
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
	Pathfinder      *router.Pathfinder
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
		pathfinder:      engineCfg.Pathfinder,
	}
}

func (e *LayeredEngine) GetMetricsStats() MetricsStats {
	if e.metrics == nil {
		return MetricsStats{}
	}
	return e.metrics.GetStats()
}

// ProcessRequest is the main entry point for the layered engine
type ProcessRequest struct {
	Messages            []agent.Message
	Locale              string
	TraceID             string
	SessionID           string
	UserID              string
	IsAuthenticated     bool
	Timezone            string
	ClientNowISO        string
	ResponseMode        string
	TokenProfile        string
	MaxContextTokens    int
	HistoryBudgetTokens int
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

const (
	toolTracePrefix     = "[[TOOL_TRACE]]"
	decisionTracePrefix = "[[DECISION_TRACE]]"
)

type intentRoute string

const (
	intentTemplateOnly intentRoute = "TEMPLATE_ONLY"
	intentAlgoTool     intentRoute = "ALGO_TOOL"
	intentSLMOnly      intentRoute = "SLM_ONLY"
	intentLLMRequired  intentRoute = "LLM_REQUIRED"
)

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
		if strings.TrimSpace(req.TokenProfile) == "" {
			req.TokenProfile = e.cfg.Token.DefaultProfile
		}
		if strings.TrimSpace(req.ResponseMode) == "" {
			req.ResponseMode = e.cfg.Token.DefaultResponseMode
		}
		if req.MaxContextTokens <= 0 {
			req.MaxContextTokens = e.cfg.Token.DefaultContextTokens
		}
		if req.HistoryBudgetTokens <= 0 {
			req.HistoryBudgetTokens = req.MaxContextTokens
		}

		timeToolRequired := isTimeSensitiveQuery(lastMessage)
		routeExplainRequired := isRouteExplainQuery(lastMessage)
		intentPath := routeIntent(lastMessage)
		emitTraceChunk(outCh, decisionTracePrefix, map[string]interface{}{
			"type":           "intent_router",
			"route":          string(intentPath),
			"token_profile":  req.TokenProfile,
			"response_mode":  req.ResponseMode,
			"context_tokens": req.MaxContextTokens,
		})
		if intentPath == intentLLMRequired {
			e.metrics.IncCounter("llm_required_count", 1)
		}
		e.metrics.IncCounter("request_count", 1)

		// ============================
		// L0: Context Resolution
		// ============================
		nodeCtx := e.nodeResolver.Resolve(ctx, lastMessage)
		logs = append(logs, fmt.Sprintf("[L0] NodeResolver: primary=%s, confidence=%.2f", nodeCtx.PrimaryNodeID, nodeCtx.Confidence))
		if nodeCtx.IsRouteQuery {
			emitTraceChunk(outCh, decisionTracePrefix, map[string]interface{}{
				"type":        "route_query_detected",
				"origin":      nodeCtx.Origin,
				"destination": nodeCtx.Destination,
				"confidence":  nodeCtx.Confidence,
			})
			emitTraceChunk(outCh, toolTracePrefix, map[string]interface{}{
				"tool":      "plan_route",
				"required":  true,
				"triggered": true,
			})
		}
		emitTraceChunk(outCh, toolTracePrefix, map[string]interface{}{
			"tool":      "get_current_time",
			"required":  timeToolRequired,
			"triggered": timeToolRequired,
		})

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
			w, err := e.weatherClient.GetCurrentWeather(ctx)
			if err == nil {
				weatherCtx = w
				logs = append(logs, fmt.Sprintf("[L0] Weather: %s (%.1f°C)", w.GetConditionText(), w.Temperature))
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
				e.metrics.IncCounter("tool_only_resolution_rate", 1)
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

		// Route queries are handled by L5 GeneralAgent + plan_route to keep explanations consistent.
		if nodeCtx.IsRouteQuery {
			logs = append(logs, fmt.Sprintf("[L2] Route query detected (defer to L5 tool-first): %s → %s", nodeCtx.Origin, nodeCtx.Destination))
		}

		// Check if it's a status query
		if isStatusQuery(lastMessage) && e.statusAgent != nil {
			logs = append(logs, "[L2] Status query detected")

			statusReqCtx := agent.RequestContext{
				Locale:              req.Locale,
				SessionID:           req.SessionID,
				UserID:              req.UserID,
				MaxContextTokens:    req.MaxContextTokens,
				HistoryBudgetTokens: req.HistoryBudgetTokens,
			}
			statusCh, err := e.statusAgent.Process(ctx, req.Messages, statusReqCtx)
			if err == nil && statusCh != nil {
				e.metrics.RecordLayerSuccess("L2", time.Since(l2Start))
				streamWithCompletionGuard(statusCh, outCh, req.Locale, false)
				e.metrics.IncCounter("tool_only_resolution_rate", 1)

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
					e.metrics.IncCounter("tool_only_resolution_rate", 1)
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
					maxChars := e.cfg.Token.RAGSummaryMaxChars
					if maxChars <= 0 {
						maxChars = 1400
					}
					ragContext = summarizeRAGResults(results, maxChars)
				}
			}
		}

		if intentPath == intentTemplateOnly && ragContext == "" {
			outCh <- localizedConciseFallback(req.Locale)
			e.metrics.IncCounter("tool_only_resolution_rate", 1)
			logger.Info("Responded with template-only fallback", "latency", time.Since(startTime))
			return
		}

		// L5: LLM Fallback (Tiered Reasoning)
		// ============================
		e.metrics.RecordLayerAttempt("L5")
		l5Start := time.Now()

		// Decision Tier Selection: Use FastAgent (SLM) for standard tasks
		selectedAgent := e.generalAgent
		systemPrompt := e.buildSystemPrompt(req.Locale, ragContext, l2Ctx, nodeCtx, weatherCtx, timeToolRequired, routeExplainRequired || nodeCtx.IsRouteQuery, req.Timezone, req.ClientNowISO, req.TokenProfile, req.ResponseMode)
		isFastPath := false

		// Trigger SLM for high-confidence standard routing or status queries
		if intentPath == intentSLMOnly || intentPath == intentAlgoTool || (nodeCtx.IsRouteQuery && nodeCtx.Confidence > 0.8) || isStatusQuery(lastMessage) {
			if e.fastAgent != nil {
				selectedAgent = e.fastAgent
				systemPrompt = e.buildFastPrompt(req.Locale, l2Ctx, nodeCtx, weatherCtx, req.Timezone, req.ResponseMode)
				isFastPath = true
				logs = append(logs, "[L5] Tier: SLM (FastPath)")
			}
		}

		if !isFastPath {
			logs = append(logs, "[L5] Tier: LLM (Deep Reasoning)")
		}

		if selectedAgent != nil {
			reqCtx := agent.RequestContext{
				Locale:               req.Locale,
				SessionID:            req.SessionID,
				UserID:               req.UserID,
				IsAuthenticated:      req.IsAuthenticated,
				Timezone:             req.Timezone,
				RouteExplainRequired: routeExplainRequired || nodeCtx.IsRouteQuery,
				TimeToolRequired:     timeToolRequired,
				PromptProfile:        req.TokenProfile,
				ResponseMode:         req.ResponseMode,
				MaxContextTokens:     req.MaxContextTokens,
				HistoryBudgetTokens:  req.HistoryBudgetTokens,
			}

			// Prepend appropriate prompt
			msgsWithSys := append([]agent.Message{{Role: "system", Content: systemPrompt}}, req.Messages...)
			e.metrics.IncCounter("prompt_chars_total", int64(approxMessageChars(msgsWithSys)))

			respCh, err := selectedAgent.Process(ctx, msgsWithSys, reqCtx)
			if err == nil && respCh != nil {
				e.metrics.RecordLayerSuccess("L5", time.Since(l5Start))
				e.metrics.IncCounter("llm_invocation_count", 1)
				fullResponse := streamWithCompletionGuard(respCh, outCh, req.Locale, nodeCtx.IsRouteQuery)
				e.metrics.IncCounter("completion_chars_total", int64(len([]rune(fullResponse))))

				// Post-processing: Fact Check (Localized)
				if e.factChecker != nil {
					checkResult := e.factChecker.Check(lastMessage, fullResponse, req.Locale)
					if checkResult.HasHallucination {
						correction := strings.TrimPrefix(checkResult.CorrectedResponse, fullResponse)
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

func (e *LayeredEngine) buildSystemPrompt(locale, ragContext string, l2Ctx *layer.L2Context, nodeCtx *layer.ResolvedContext, weatherCtx *weather.CurrentWeather, timeToolRequired bool, routeExplainRequired bool, timezone string, clientNowISO string, tokenProfile string, responseMode string) string {
	// Standardize on JST for all decision making
	if strings.TrimSpace(timezone) == "" {
		timezone = "Asia/Tokyo"
	}
	loc, err := time.LoadLocation(timezone)
	if err != nil {
		loc, _ = time.LoadLocation("Asia/Tokyo")
		timezone = "Asia/Tokyo"
	}
	now := time.Now().In(loc)
	timeStr := now.Format("2006-01-02 15:04 (Mon)")
	clientNowHint := ""
	if strings.TrimSpace(clientNowISO) != "" {
		clientNowHint = fmt.Sprintf("\nClient Reported Time: %s", clientNowISO)
	}
	holidayHint := "No"
	if _, isHoliday := japanHoliday(now); isHoliday {
		holidayHint = "Yes"
	}

	weatherStr := "Unknown (Assume clear)"
	weatherAdvice := "" // Dynamic advice based on weather
	if weatherCtx != nil {
		cond := weatherCtx.GetConditionText()
		weatherStr = fmt.Sprintf("%s, %.1f°C", cond, weatherCtx.Temperature)
		if weatherCtx.IsRaining() {
			weatherAdvice = "\n- ☔ **RAIN ALERT**: It is currently raining. **Prioritize underground routes, indoor transfers, and covered walkways.** Suggest taxis for short distances."
		} else if weatherCtx.Temperature > 30 {
			weatherAdvice = "\n- ☀️ **HEAT ALERT**: High temperature detected. Suggest minimizing outdoor walking and staying hydrated."
		}
	}

	directives := buildPromptDirectives(tokenProfile)
	prompt := fmt.Sprintf(`You are LUTAGU, an expert Tokyo Transportation Concierge.
Current Time (%s): %s%s
Current Weather: %s
Current Locale: %s
Profile: %s
Japan Holiday Today: %s

## CORE DIRECTIVES:
1. **Dynamic Context Awareness**: ALWAYS checks the current time, weather, and disruption status before answering.
2. **Time Policy**: If query includes urgency/deadline/timetable, call get_current_time first. Required=%t.
3. **Route Explainability**: For route recommendation, explain "recommended route" and at least one "not recommended route" with clear reason. Required=%t.
4. **Execution Mode**: %s
5. **Behavior Pack**: %s
6. **Weather Adaptive**: %s

`, timezone, timeStr, clientNowHint, weatherStr, locale, tokenProfile, holidayHint, timeToolRequired, routeExplainRequired, responseMode, directives, weatherAdvice)

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
- Lead with direct answer first.
- Keep reasoning brief unless user explicitly asks "why" or requests details.
- Answer primarily in the user's language (%s).`

	return fmt.Sprintf(prompt, locale)
}

func (e *LayeredEngine) buildFastPrompt(locale string, l2Ctx *layer.L2Context, nodeCtx *layer.ResolvedContext, weatherCtx *weather.CurrentWeather, timezone string, responseMode string) string {
	if strings.TrimSpace(timezone) == "" {
		timezone = "Asia/Tokyo"
	}
	loc, err := time.LoadLocation(timezone)
	if err != nil {
		loc, _ = time.LoadLocation("Asia/Tokyo")
	}
	now := time.Now().In(loc)
	timeStr := now.Format("15:04 (Mon)")
	weatherStr := "Unknown"
	if weatherCtx != nil {
		weatherStr = fmt.Sprintf("%s, %.1f°C", weatherCtx.GetConditionText(), weatherCtx.Temperature)
	}

	prompt := fmt.Sprintf(`You are LUTAGU (Fast Task Tier).
[Context] Time: %s (%s), Weather: %s.`, timeStr, timezone, weatherStr)

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
- Response mode: %s.
- Answer in %s.`, responseMode, locale)

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

func routeIntent(query string) intentRoute {
	q := strings.ToLower(strings.TrimSpace(query))
	if q == "" {
		return intentTemplateOnly
	}
	if isStatusQuery(q) || isTimeSensitiveQuery(q) {
		return intentAlgoTool
	}
	if strings.Contains(q, "路線") || strings.Contains(q, "route") || strings.Contains(q, "轉乘") || strings.Contains(q, "直達") {
		return intentSLMOnly
	}
	if len([]rune(q)) <= 12 {
		return intentTemplateOnly
	}
	return intentLLMRequired
}

func buildPromptDirectives(profile string) string {
	switch strings.ToLower(strings.TrimSpace(profile)) {
	case "aggressive":
		return "Keep answers extremely short. Do not provide extended explanations unless asked."
	case "quality":
		return "Keep answers accurate and complete; include 1 concise reason."
	default:
		return "Balanced mode: concise first answer, expand only on user follow-up."
	}
}

func summarizeRAGResults(results []supabase.SearchResult, maxChars int) string {
	if maxChars <= 0 {
		maxChars = 1400
	}
	if len(results) == 0 {
		return ""
	}
	var b strings.Builder
	for i, r := range results {
		if b.Len() >= maxChars {
			break
		}
		title := ""
		if r.Metadata != nil {
			if v, ok := r.Metadata["title"].(string); ok {
				title = v
			}
		}
		prefix := fmt.Sprintf("[%d] ", i+1)
		if title != "" {
			prefix += title + ": "
		}
		remain := maxChars - b.Len() - len(prefix) - 16
		if remain <= 0 {
			break
		}
		snippet := truncate(r.Content, minInt(180, remain))
		line := fmt.Sprintf("%s%s (%.2f)\n", prefix, snippet, r.Similarity)
		if b.Len()+len(line) > maxChars {
			break
		}
		b.WriteString(line)
	}
	return strings.TrimSpace(b.String())
}

func localizedConciseFallback(locale string) string {
	if strings.HasPrefix(locale, "ja") {
		return "要点: もう少し具体的な目的地や条件を教えてください。最短で提案します。"
	}
	if strings.HasPrefix(locale, "zh") {
		return "重點：請再提供更明確的目的地或限制條件，我會給您最短可行方案。"
	}
	return "Summary: Please share the destination or constraints, and I will provide the fastest actionable option."
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func approxMessageChars(msgs []agent.Message) int {
	total := 0
	for _, m := range msgs {
		total += len([]rune(m.Content))
	}
	return total
}

func isTimeSensitiveQuery(query string) bool {
	patterns := []string{
		"現在", "幾點", "today", "deadline", "來得及", "起飛", "flight",
		"班次", "時刻", "timetable", "趕", "是否來得及", "幾點的車",
	}
	lc := strings.ToLower(query)
	for _, p := range patterns {
		if strings.Contains(lc, strings.ToLower(p)) {
			return true
		}
	}
	return false
}

func isRouteExplainQuery(query string) bool {
	patterns := []string{
		"為何", "为什么", "why", "不推薦", "不推荐", "直達", "直达", "換乘", "轉乘",
	}
	lc := strings.ToLower(query)
	for _, p := range patterns {
		if strings.Contains(lc, strings.ToLower(p)) {
			return true
		}
	}
	return false
}

func emitTraceChunk(ch chan<- string, prefix string, payload map[string]interface{}) {
	bytes, err := json.Marshal(payload)
	if err != nil {
		return
	}
	ch <- prefix + string(bytes)
}

func streamWithCompletionGuard(in <-chan string, out chan<- string, locale string, routeQuery bool) string {
	var fullText strings.Builder
	for chunk := range in {
		out <- chunk
		fullText.WriteString(chunk)
	}

	text := strings.TrimSpace(fullText.String())
	if text == "" {
		fallback := localizedConclusion(locale, routeQuery, true)
		out <- fallback
		fullText.WriteString(fallback)
		return fullText.String()
	}

	danglingMarkers := []string{
		"讓我查", "讓我幫您", "為了更全面比較", "請稍等", "我來幫你查",
		"let me check", "i'll check", "analyzing",
	}
	lc := strings.ToLower(text)
	needsAppend := strings.HasSuffix(text, ":")
	for _, m := range danglingMarkers {
		if strings.Contains(lc, strings.ToLower(m)) {
			needsAppend = true
			break
		}
	}
	if !strings.HasSuffix(text, "。") &&
		!strings.HasSuffix(text, ".") &&
		!strings.HasSuffix(text, "!") &&
		!strings.HasSuffix(text, "！") &&
		!strings.HasSuffix(text, "?") &&
		!strings.HasSuffix(text, "？") {
		needsAppend = true
	}

	if needsAppend {
		appendix := localizedConclusion(locale, routeQuery, false)
		out <- appendix
		fullText.WriteString(appendix)
	}

	return fullText.String()
}

func localizedConclusion(locale string, routeQuery bool, empty bool) string {
	if locale == "ja" || strings.HasPrefix(locale, "ja") {
		if empty {
			return "最終結論: 現在の条件で最適な経路を提示できます。出発地・到着地を確認して続けます。"
		}
		if routeQuery {
			return "\n\n最終結論: 推奨ルートと非推奨ルートの理由を明確化しました。必要なら直通便との比較を追加します。"
		}
		return "\n\n最終結論: 以上が現在の最適な案内です。"
	}
	if locale == "zh-TW" || locale == "zh" || strings.HasPrefix(locale, "zh") {
		if empty {
			return "最終結論：我可以依照目前條件給出可執行建議，請提供出發與目的地。"
		}
		if routeQuery {
			return "\n\n最終結論：已提供推薦與不推薦路線的原因。若需要，我可以再列出直達與轉乘的逐項比較。"
		}
		return "\n\n最終結論：以上為目前最佳建議。"
	}
	if empty {
		return "Final conclusion: I can provide an actionable plan once origin and destination are confirmed."
	}
	if routeQuery {
		return "\n\nFinal conclusion: I included both recommended and not-recommended route reasons. I can add a direct-vs-transfer comparison if needed."
	}
	return "\n\nFinal conclusion: This is the best recommendation under current conditions."
}

func japanHoliday(t time.Time) (string, bool) {
	key := t.Format("01-02")
	holidays := map[string]string{
		"01-01": "New Year's Day",
		"01-12": "Coming of Age Day",
		"02-11": "National Foundation Day",
		"02-23": "Emperor's Birthday",
		"03-20": "Vernal Equinox Day",
		"04-29": "Showa Day",
		"05-03": "Constitution Memorial Day",
		"05-04": "Greenery Day",
		"05-05": "Children's Day",
		"07-20": "Marine Day",
		"08-11": "Mountain Day",
		"09-21": "Respect for the Aged Day",
		"09-23": "Autumnal Equinox Day",
		"10-12": "Sports Day",
		"11-03": "Culture Day",
		"11-23": "Labor Thanksgiving Day",
	}
	name, ok := holidays[key]
	return name, ok
}

func truncate(s string, maxLen int) string {
	runes := []rune(s)
	if len(runes) <= maxLen {
		return s
	}
	return string(runes[:maxLen]) + "..."
}
