package orchestrator

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"math"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"sync"
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
	generalProvider string
	fastProvider    string
	routeProvider   string
	statusProvider  string
	rootProvider    string
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
	GeneralProvider string
	FastProvider    string
	RouteProvider   string
	StatusProvider  string
	RootProvider    string
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
		generalProvider: engineCfg.GeneralProvider,
		fastProvider:    engineCfg.FastProvider,
		routeProvider:   engineCfg.RouteProvider,
		statusProvider:  engineCfg.StatusProvider,
		rootProvider:    engineCfg.RootProvider,
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
	toolTracePrefix      = "[[TOOL_TRACE]]"
	decisionTracePrefix  = "[[DECISION_TRACE]]"
	structuredDataPrefix = "[[STRUCTURED_DATA]]"
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

		faqHit := isFAQHit(lastMessage, req.Locale)
		intent := analyzeIntent(lastMessage)
		intentPath := intent.Route
		emitTraceChunk(outCh, decisionTracePrefix, map[string]interface{}{
			"type":           "intent_router",
			"route":          string(intentPath),
			"tags":           intent.Tags,
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
		if coercedQuery, coercedCtx, ok := e.coerceRouteQuery(lastMessage, nodeCtx); ok {
			lastMessage = coercedQuery
			nodeCtx = coercedCtx
			emitTraceChunk(outCh, decisionTracePrefix, map[string]interface{}{
				"type":        "query_rewrite",
				"rewritten":   lastMessage,
				"origin":      nodeCtx.Origin,
				"destination": nodeCtx.Destination,
			})
		}
		logs = append(logs, fmt.Sprintf("[L0] NodeResolver: primary=%s, confidence=%.2f", nodeCtx.PrimaryNodeID, nodeCtx.Confidence))
		toolPlan := buildToolPlan(lastMessage, nodeCtx.IsRouteQuery, intent)
		if nodeCtx.IsRouteQuery && !hasTag(toolPlan.IntentTags, "route") {
			toolPlan.IntentTags = append(toolPlan.IntentTags, "route")
		}
		if nodeCtx.IsRouteQuery {
			emitTraceChunk(outCh, decisionTracePrefix, map[string]interface{}{
				"type":        "route_query_detected",
				"origin":      nodeCtx.Origin,
				"destination": nodeCtx.Destination,
				"confidence":  nodeCtx.Confidence,
			})
		}
		emitTraceChunk(outCh, decisionTracePrefix, map[string]interface{}{
			"type":        "tool_plan",
			"route_tool":  toolPlan.RouteTool,
			"status_tool": toolPlan.StatusTool,
			"time_tool":   toolPlan.TimeTool,
			"tags":        toolPlan.IntentTags,
		})

		ruleConfidence := estimateRuleConfidence(lastMessage, intent.Tags)
		hasContext := hasContextFromMessages(req.Messages) || (nodeCtx.Origin != "" || nodeCtx.Destination != "")
		ladder := DecideIntentLadder(lastMessage, ruleConfidence, hasContext)
		if ladder.RequireDeepIntent && intentPath != intentLLMRequired {
			intentPath = intentLLMRequired
		}
		if e.metrics != nil {
			e.metrics.RecordIntentLadder(faqHit, ladder.RequireDeepIntent)
		}
		emitTraceChunk(outCh, decisionTracePrefix, map[string]interface{}{
			"type":             "intent_ladder",
			"complexity":       ladder.Complexity,
			"confidence":       ladder.Confidence,
			"require_deep":     ladder.RequireDeepIntent,
			"rule_confidence":  ruleConfidence,
			"context_detected": hasContext,
		})
		if toolPlan.RouteTool {
			emitTraceChunk(outCh, toolTracePrefix, map[string]interface{}{
				"tool":      "plan_route",
				"required":  true,
				"triggered": nodeCtx.IsRouteQuery,
			})
		}
		emitTraceChunk(outCh, toolTracePrefix, map[string]interface{}{
			"tool":      "get_current_time",
			"required":  toolPlan.TimeTool,
			"triggered": toolPlan.TimeTool,
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

		complexity := ladder.Complexity
		if strings.TrimSpace(complexity) == "" {
			complexity = "simple"
		}

		if e.templateEngine != nil && (faqHit || !nodeCtx.IsRouteQuery) {
			tmplCtx := layer.TemplateContext{
				Query:      lastMessage,
				Locale:     req.Locale,
				NodeCtx:    nodeCtx,
				WeatherCtx: weatherCtx,
				L2Ctx:      l2Ctx,
				Time:       time.Now(),
			}

			if layer.AllowTemplate(tmplCtx, complexity) {
				if match := e.templateEngine.Match(tmplCtx); match != nil && match.Matched {
				e.metrics.RecordLayerSuccess("L1", time.Since(templateStart))
				emitStructuredChunk(outCh, map[string]interface{}{
					"type": inferStructuredType(toolPlan, nodeCtx),
					"data": map[string]interface{}{
						"query":   lastMessage,
						"summary": truncate(match.Content, 180),
						"source":  "template",
						"node_id": nodeCtx.PrimaryNodeID,
					},
				})
				outCh <- match.Content
				e.metrics.IncCounter("tool_only_resolution_rate", 1)
				logger.Info("Responded from L1 Template", "category", match.Category, "latency", time.Since(startTime))
				return
				}
			}
		}
		logs = append(logs, "[L1] Template miss")

		// ============================
		// L2: Algorithm Layer (Route/Status Detection)
		// ============================
		e.metrics.RecordLayerAttempt("L2")
		l2Start := time.Now()

		// Route queries are handled by tool-first logic in L2.
		if nodeCtx.IsRouteQuery {
			logs = append(logs, fmt.Sprintf("[L2] Route query detected (tool-first): %s → %s", nodeCtx.Origin, nodeCtx.Destination))
			routeResp := e.runRouteToolFirst(lastMessage, req.Locale, nodeCtx, weatherCtx)
			if routeResp.Success {
				e.metrics.RecordLayerSuccess("L2", time.Since(l2Start))
				emitTraceChunk(outCh, toolTracePrefix, map[string]interface{}{
					"tool":      "plan_route",
					"required":  true,
					"triggered": true,
					"success":   true,
				})
				emitStructuredChunk(outCh, routeResp.Structured)
				outCh <- routeResp.Text
				e.metrics.IncCounter("tool_only_resolution_rate", 1)
				logger.Info("Responded from L2 RouteToolFirst", "latency", time.Since(startTime))
				return
			}
			emitTraceChunk(outCh, toolTracePrefix, map[string]interface{}{
				"tool":      "plan_route",
				"required":  true,
				"triggered": true,
				"success":   false,
				"reason":    routeResp.Reason,
			})
			logs = append(logs, "[L2] RouteToolFirst fallthrough: "+routeResp.Reason)
		}

		// Check if it's a status query
		if toolPlan.StatusTool && e.statusAgent != nil {
			logs = append(logs, "[L2] Status query detected")
			emitStructuredChunk(outCh, map[string]interface{}{
				"type": "status",
				"data": map[string]interface{}{
					"query":             lastMessage,
					"node_id":           nodeCtx.PrimaryNodeID,
					"has_disruption":    l2Ctx != nil && l2Ctx.HasDisruption,
					"disrupted_lines":   disruptionLineNames(l2Ctx),
					"status_confidence": nodeCtx.Confidence,
					"source":            "status_agent",
				},
			})

			statusReqCtx := agent.RequestContext{
				Locale:              req.Locale,
				SessionID:           req.SessionID,
				UserID:              req.UserID,
				MaxContextTokens:    req.MaxContextTokens,
				HistoryBudgetTokens: req.HistoryBudgetTokens,
				PromptProfile:       req.TokenProfile,
				ResponseMode:        req.ResponseMode,
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
				Tags:        toolPlan.IntentTags,
				L2Disrupted: l2Ctx != nil && l2Ctx.HasDisruption,
			}

			skillRequest := skill.SkillRequest{
				Query:   lastMessage,
				Context: skillCtx,
			}

			if result, err := e.skillRegistry.ExecuteWithFallback(ctx, lastMessage, skillRequest, 0.25, 3); err == nil && result != nil {
				e.metrics.RecordLayerSuccess("L3", time.Since(l3Start))
				logs = append(logs, fmt.Sprintf("[L3] Skill executed: %s (%.2f)", result.Category, result.Confidence))

				outCh <- result.Content

				// If skill needs LLM refinement, continue to L5
				if result.NeedsLLM {
					logs = append(logs, "[L3] Skill requests LLM refinement")
					// Fall through to L5
				} else {
					emitStructuredChunk(outCh, map[string]interface{}{
						"type": "knowledge",
						"data": map[string]interface{}{
							"query":      lastMessage,
							"summary":    truncate(result.Content, 180),
							"category":   result.Category,
							"confidence": result.Confidence,
							"source":     "skill",
						},
					})
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
				graphNodeIDs := expandGraphNodeIDs(nodeCtx, e.pathfinder, e.cfg.Layer.GraphRAGHops, e.cfg.Layer.GraphRAGMaxNodes)
				opts := supabase.SearchOptions{
					Limit:     e.cfg.Layer.RAGTopK,
					Threshold: e.cfg.Layer.RAGThreshold,
					NodeID:    nodeCtx.PrimaryNodeID,
					NodeIDs:   graphNodeIDs,
					Tags:      toolPlan.IntentTags,
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
			emitStructuredChunk(outCh, map[string]interface{}{
				"type": "knowledge",
				"data": map[string]interface{}{
					"query":   lastMessage,
					"summary": localizedConciseFallback(req.Locale),
					"source":  "template_fallback",
				},
			})
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
		systemPrompt := e.buildSystemPrompt(req.Locale, ragContext, l2Ctx, nodeCtx, weatherCtx, toolPlan.TimeTool, toolPlan.RequireRouteExplain, req.Timezone, req.ClientNowISO, req.TokenProfile, req.ResponseMode)
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
			selectedProvider := e.generalProvider
			selectedModel := e.cfg.Models.GeneralAgent
			selectedName := "general"
			if isFastPath {
				selectedProvider = e.fastProvider
				selectedModel = e.cfg.Models.FastAgent
				selectedName = "fast"
			}
			emitTraceChunk(outCh, decisionTracePrefix, map[string]interface{}{
				"type":              "llm_selection",
				"selected_agent":    selectedName,
				"selected_model":    selectedModel,
				"selected_provider": selectedProvider,
				"fast_path":         isFastPath,
			})

			reqCtx := agent.RequestContext{
				Locale:               req.Locale,
				SessionID:            req.SessionID,
				UserID:               req.UserID,
				IsAuthenticated:      req.IsAuthenticated,
				Timezone:             req.Timezone,
				RouteExplainRequired: toolPlan.RequireRouteExplain,
				TimeToolRequired:     toolPlan.TimeTool,
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
				emitStructuredChunk(outCh, map[string]interface{}{
					"type": inferStructuredType(toolPlan, nodeCtx),
					"data": map[string]interface{}{
						"query":      lastMessage,
						"summary":    truncate(fullResponse, 220),
						"provider":   selectedProvider,
						"model":      selectedModel,
						"fast_path":  isFastPath,
						"token_mode": req.TokenProfile,
						"source":     "llm",
					},
				})
				e.metrics.IncCounter("completion_chars_total", int64(len([]rune(fullResponse))))
				if busy, reason := detectBusyMessage(fullResponse); busy {
					emitTraceChunk(outCh, decisionTracePrefix, map[string]interface{}{
						"type":      "upstream_busy_detected",
						"reason":    reason,
						"provider":  selectedProvider,
						"model":     selectedModel,
						"fast_path": isFastPath,
					})
				}

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
		emitStructuredChunk(outCh, map[string]interface{}{
			"type": "knowledge",
			"data": map[string]interface{}{
				"query":   lastMessage,
				"summary": "抱歉，我目前無法處理您的請求。請稍後再試。",
				"source":  "ultimate_fallback",
			},
		})
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

	weatherStr := "Unknown"
	weatherAdvice := ""
	if weatherCtx != nil {
		cond := weatherCtx.GetConditionText()
		weatherStr = fmt.Sprintf("%s, %.1f°C", cond, weatherCtx.Temperature)
		if weatherCtx.IsRaining() {
			weatherAdvice = "Rain: prioritize covered/indoor transfers."
		} else if weatherCtx.Temperature > 30 {
			weatherAdvice = "Heat: reduce outdoor walking."
		}
	}

	directives := buildPromptDirectives(tokenProfile)
	prompt := fmt.Sprintf(`You are LUTAGU, Tokyo transit concierge.
Time(%s): %s%s
Weather: %s
Locale: %s
Profile: %s
Holiday: %s

Rules:
1) Tool-first. If route/status/time is needed, call tools before final answer.
2) Time policy: get_current_time required=%t.
3) Route policy: include recommended and one rejected option required=%t.
4) Mode: %s. Behavior: %s.
5) Keep final answer concise.`, timezone, timeStr, clientNowHint, weatherStr, locale, tokenProfile, holidayHint, timeToolRequired, routeExplainRequired, responseMode, directives)
	if weatherAdvice != "" {
		prompt += "\n6) " + weatherAdvice
	}

	if l2Ctx != nil && l2Ctx.HasDisruption {
		prompt += e.l2Injector.ForSystemPrompt(l2Ctx)
	}

	if nodeCtx != nil && nodeCtx.PrimaryNodeID != "" {
		prompt += fmt.Sprintf("## USER CONTEXT\nDetected Location/Station: %s\n\n", nodeCtx.PrimaryNodeName)
	}

	if ragContext != "" {
		prompt += fmt.Sprintf("## EXPERT KNOWLEDGE BASE (RAG)\n%s\n\n", ragContext)
	}

	prompt += `\nResponse guidelines:
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

func hasContextFromMessages(messages []agent.Message) bool {
	for _, msg := range messages {
		if msg.Role != "system" {
			continue
		}
		if strings.Contains(msg.Content, "Journey:") {
			return true
		}
	}
	return false
}

func routeIntent(query string) intentRoute {
	return analyzeIntent(query).Route
}

func buildPromptDirectives(profile string) string {
	switch strings.ToLower(strings.TrimSpace(profile)) {
	case "aggressive":
		return "Ultra-lean mode: final answer in <= 4 bullets, no narrative, no long comparisons unless explicitly requested."
	case "quality":
		return "Quality mode: include route rationale, risk note, and one alternative with reason; if timetable-related include explicit time feasibility check and confidence caveat."
	default:
		return "Balanced mode: concise first answer, expand only on user follow-up."
	}
}

func isLikelyCompoundIntent(query string) bool {
	q := strings.ToLower(strings.TrimSpace(query))
	if q == "" {
		return false
	}
	routeTokens := []string{"去", "到", "怎麼去", "怎么去", "how to get", "from", "to", "前往", "移動", "搭車", "route"}
	constraintTokens := []string{"行李", "大行李", "電梯", "无障碍", "無障礙", "wheelchair", "elevator", "趕時間", "赶时间"}
	return hasAnyToken(q, routeTokens) && hasAnyToken(q, constraintTokens)
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

func emitStructuredChunk(ch chan<- string, payload map[string]interface{}) {
	if len(payload) == 0 {
		return
	}
	bytes, err := json.Marshal(payload)
	if err != nil {
		return
	}
	ch <- structuredDataPrefix + string(bytes)
}

func inferStructuredType(toolPlan toolPlan, nodeCtx *layer.ResolvedContext) string {
	if nodeCtx != nil && nodeCtx.IsRouteQuery {
		return "route"
	}
	if toolPlan.StatusTool {
		return "status"
	}
	return "knowledge"
}

func disruptionLineNames(l2Ctx *layer.L2Context) []string {
	if l2Ctx == nil || len(l2Ctx.DisruptedLines) == 0 {
		return []string{}
	}
	lines := make([]string, 0, len(l2Ctx.DisruptedLines))
	for _, l := range l2Ctx.DisruptedLines {
		if strings.TrimSpace(l.Railway) != "" {
			lines = append(lines, l.Railway)
		}
	}
	return lines
}

type routeToolFirstResponse struct {
	Success    bool
	Reason     string
	Text       string
	Structured map[string]interface{}
}

type endpointCandidate struct {
	StationID      string
	StationName    string
	WalkMinutes    int
	ComplexityHint int
}

type placeSpec struct {
	ID         string
	Name       string
	Aliases    []string
	Candidates []endpointCandidate
}

var (
	placeSpecsOnce sync.Once
	placeSpecsData []placeSpec
)

func (e *LayeredEngine) runRouteToolFirst(query, locale string, nodeCtx *layer.ResolvedContext, weatherCtx *weather.CurrentWeather) routeToolFirstResponse {
	originText := normalizeEndpointQuery(nodeCtx.Origin)
	destText := normalizeEndpointQuery(nodeCtx.Destination)
	if originText == "" || destText == "" {
		return routeToolFirstResponse{Reason: "missing_origin_or_destination"}
	}

	// Airport strategy should not depend on graph availability.
	if isAirportKeyword(originText) || isAirportKeyword(destText) {
		airportData := e.buildAirportStructured(originText, destText, locale, weatherCtx)
		return routeToolFirstResponse{
			Success:    true,
			Text:       toString(airportData["summary"]),
			Structured: airportData,
		}
	}

	if e.pathfinder == nil || e.pathfinder.Graph() == nil {
		return routeToolFirstResponse{Reason: "pathfinder_unavailable"}
	}

	originCandidates, originType := e.expandEndpointCandidates(originText)
	destCandidates, destType := e.expandEndpointCandidates(destText)
	if len(originCandidates) == 0 || len(destCandidates) == 0 {
		return routeToolFirstResponse{Reason: "endpoint_resolution_failed"}
	}

	type scoredRoute struct {
		Result      *router.Result
		Origin      endpointCandidate
		Destination endpointCandidate
		Score       float64
		DurationMin int
		Transfers   int
	}

	var scored []scoredRoute
	for _, o := range originCandidates {
		for _, d := range destCandidates {
			res, err := e.pathfinder.FindPath(o.StationID, d.StationID, router.DeepContext{
				IsRaining:   weatherCtx != nil && weatherCtx.IsRaining(),
				UserUrgency: 6,
			})
			if err != nil || res == nil || len(res.Path) == 0 {
				continue
			}
			durationMin := maxInt(1, res.TotalTime/60)
			transfers := estimateTransfersFromNodes(res.Path)
			walkMinutes := o.WalkMinutes + d.WalkMinutes
			complexity := o.ComplexityHint + d.ComplexityHint
			score := float64(durationMin) + float64(walkMinutes)*1.2 + float64(transfers)*6 + float64(complexity)*0.3
			scored = append(scored, scoredRoute{
				Result:      res,
				Origin:      o,
				Destination: d,
				Score:       score,
				DurationMin: durationMin,
				Transfers:   transfers,
			})
		}
	}
	if len(scored) == 0 {
		return routeToolFirstResponse{Reason: "no_route_found"}
	}

	sort.Slice(scored, func(i, j int) bool { return scored[i].Score < scored[j].Score })
	best := scored[0]
	alts := []map[string]interface{}{}
	limit := minInt(3, len(scored))
	for i := 1; i < limit; i++ {
		s := scored[i]
		alts = append(alts, map[string]interface{}{
			"origin_station":      s.Origin.StationName,
			"destination_station": s.Destination.StationName,
			"duration_minutes":    s.DurationMin,
			"transfers":           s.Transfers,
			"score":               round2(s.Score),
		})
	}

	steps := []map[string]interface{}{}
	for _, n := range best.Result.Path {
		steps = append(steps, map[string]interface{}{
			"station": n.NameJA,
			"line":    normalizeLineName(n.RailwayID),
		})
	}

	routeType := "route"
	if originType == "poi" || destType == "poi" {
		routeType = "poi"
	}
	routeData := map[string]interface{}{
		"query": query,
		"recommendation": map[string]interface{}{
			"origin_station":      best.Origin.StationName,
			"destination_station": best.Destination.StationName,
			"duration_minutes":    best.DurationMin,
			"transfers":           best.Transfers,
			"walk_minutes":        best.Origin.WalkMinutes + best.Destination.WalkMinutes,
			"score":               round2(best.Score),
			"steps":               steps,
		},
		"alternatives": alts,
		"context": map[string]interface{}{
			"weather_rain": weatherCtx != nil && weatherCtx.IsRaining(),
		},
	}
	structured := map[string]interface{}{
		"type": routeType,
		"data": routeData,
		// backward compatible flattened fields
		"query":          routeData["query"],
		"recommendation": routeData["recommendation"],
		"alternatives":   routeData["alternatives"],
		"context":        routeData["context"],
	}

	text := buildRouteSummary(locale, best.Origin.StationName, best.Destination.StationName, best.DurationMin, best.Transfers, routeType)
	return routeToolFirstResponse{
		Success:    true,
		Text:       text,
		Structured: structured,
	}
}

func normalizeEndpointQuery(input string) string {
	s := strings.TrimSpace(input)
	if s == "" {
		return s
	}
	replacements := []string{
		"怎麼走", "怎麼去", "如何去", "路線", "路线", "請規劃", "請规划",
		"how to get", "how to go", "route", "please plan",
	}
	lower := strings.ToLower(s)
	for _, token := range replacements {
		if idx := strings.Index(lower, token); idx >= 0 {
			s = strings.TrimSpace(s[:idx])
			lower = strings.ToLower(s)
		}
	}
	s = strings.Trim(s, " ，。,.!?！？：:;；")
	return s
}

func containsRouteCue(input string) bool {
	q := strings.ToLower(strings.TrimSpace(input))
	cues := []string{
		"怎麼", "怎么", "路線", "路线", "去", "到", "從", "从",
		"from", "to", "route", "transfer", "how to get",
	}
	for _, c := range cues {
		if strings.Contains(q, strings.ToLower(c)) {
			return true
		}
	}
	return false
}

func parseRouteEndpointsFromQuery(query string) (string, string) {
	q := strings.TrimSpace(query)
	patterns := []*regexp.Regexp{
		regexp.MustCompile(`(?i)(?:我在|i am at)\s*(.+?)\s*(?:要去|想去|去|to)\s*(.+)`),
		regexp.MustCompile(`(?i)(?:從|from)\s*(.+?)\s*(?:出發|depart|departure)?\s*(?:到|去|to)\s*(.+)`),
		regexp.MustCompile(`(?i)(?:去|to)\s*(.+?)\s*[，,、 ]*(?:從|from)\s*(.+?)(?:出發|depart|departure)?`),
	}
	for i, p := range patterns {
		if m := p.FindStringSubmatch(q); m != nil {
			if i == 2 {
				return normalizeEndpointQuery(m[2]), normalizeEndpointQuery(m[1])
			}
			return normalizeEndpointQuery(m[1]), normalizeEndpointQuery(m[2])
		}
	}
	return "", ""
}

func (e *LayeredEngine) coerceRouteQuery(query string, nodeCtx *layer.ResolvedContext) (string, *layer.ResolvedContext, bool) {
	if nodeCtx == nil || !containsRouteCue(query) {
		return query, nodeCtx, false
	}
	if nodeCtx.IsRouteQuery && strings.TrimSpace(nodeCtx.Origin) != "" && strings.TrimSpace(nodeCtx.Destination) != "" {
		return query, nodeCtx, false
	}

	origin, destination := parseRouteEndpointsFromQuery(query)
	if origin == "" || destination == "" {
		if spec := matchPlaceSpec(query); spec != nil {
			destination = normalizeEndpointQuery(spec.Name)
			if strings.TrimSpace(nodeCtx.PrimaryNodeName) != "" {
				origin = normalizeEndpointQuery(nodeCtx.PrimaryNodeName)
			}
		}
	}
	if origin == "" || destination == "" {
		return query, nodeCtx, false
	}
	if strings.EqualFold(origin, destination) {
		return query, nodeCtx, false
	}

	clone := *nodeCtx
	clone.IsRouteQuery = true
	clone.Origin = origin
	clone.Destination = destination
	if clone.Confidence < 0.9 {
		clone.Confidence = 0.9
	}
	rewritten := fmt.Sprintf("從%s到%s怎麼去", origin, destination)
	return rewritten, &clone, true
}

func toString(v interface{}) string {
	if s, ok := v.(string); ok {
		return s
	}
	return ""
}

func buildRouteSummary(locale string, originName, destinationName string, durationMin, transfers int, routeType string) string {
	if strings.HasPrefix(locale, "ja") {
		if routeType == "poi" {
			return fmt.Sprintf("おすすめ経路: %s 付近は %s 駅を起点、%s 付近は %s 駅を終点にすると、約%d分（乗換%d回）です。", originName, originName, destinationName, destinationName, durationMin, transfers)
		}
		return fmt.Sprintf("おすすめ経路: %s から %s まで約%d分（乗換%d回）です。", originName, destinationName, durationMin, transfers)
	}
	if strings.HasPrefix(locale, "zh") {
		if routeType == "poi" {
			return fmt.Sprintf("推薦路線：起點建議從 %s 附近的 %s 站進站，終點建議走到 %s 附近的 %s 站，約 %d 分鐘、轉乘 %d 次。", originName, originName, destinationName, destinationName, durationMin, transfers)
		}
		return fmt.Sprintf("推薦路線：%s 到 %s 約 %d 分鐘，轉乘 %d 次。", originName, destinationName, durationMin, transfers)
	}
	return fmt.Sprintf("Recommended route: %s to %s in about %d minutes with %d transfer(s).", originName, destinationName, durationMin, transfers)
}

func (e *LayeredEngine) expandEndpointCandidates(raw string) ([]endpointCandidate, string) {
	if isAirportKeyword(raw) {
		id := e.resolveStationID(raw)
		if id == "" {
			return nil, "airport"
		}
		node := e.pathfinder.Graph().Nodes[id]
		return []endpointCandidate{{StationID: id, StationName: displayStation(node), WalkMinutes: 0, ComplexityHint: 1}}, "airport"
	}
	if id := e.resolveStationID(raw); id != "" {
		node := e.pathfinder.Graph().Nodes[id]
		return []endpointCandidate{{StationID: id, StationName: displayStation(node), WalkMinutes: 0, ComplexityHint: 1}}, "station"
	}
	if spec := matchPlaceSpec(raw); spec != nil {
		candidates := make([]endpointCandidate, 0, len(spec.Candidates))
		for _, c := range spec.Candidates {
			if id := e.resolveStationID(c.StationName); id != "" {
				n := e.pathfinder.Graph().Nodes[id]
				candidates = append(candidates, endpointCandidate{
					StationID:      id,
					StationName:    displayStation(n),
					WalkMinutes:    c.WalkMinutes,
					ComplexityHint: c.ComplexityHint,
				})
			}
		}
		return candidates, "poi"
	}
	// Fallback: try top fuzzy station candidates.
	return e.resolveFuzzyStations(raw, 3), "station"
}

func (e *LayeredEngine) resolveStationID(input string) string {
	term := strings.ToLower(strings.TrimSpace(input))
	aliases := map[string]string{
		"tokyo": "tokyo", "東京": "tokyo", "東京駅": "tokyo",
		"shinjuku": "shinjuku", "新宿": "shinjuku",
		"shibuya": "shibuya", "渋谷": "shibuya",
		"ueno": "ueno", "上野": "ueno",
		"asakusa": "asakusa", "浅草": "asakusa",
		"ginza": "ginza", "銀座": "ginza",
		"ikebukuro": "ikebukuro", "池袋": "ikebukuro",
		"narita": "narita", "成田空港": "narita", "nrt": "narita", "成田機場": "narita",
		"haneda": "haneda", "羽田空港": "haneda", "hnd": "haneda", "羽田機場": "haneda",
		"tocho": "shinjuku", "都庁前": "shinjuku", "東京都廳": "shinjuku",
	}
	if mapped, ok := aliases[term]; ok {
		term = mapped
	}
	bestID := ""
	bestScore := 9999
	for id, n := range e.pathfinder.Graph().Nodes {
		score := 100
		lid := strings.ToLower(id)
		if strings.Contains(lid, term) {
			score -= 40
		}
		if strings.Contains(strings.ToLower(n.NameJA), term) {
			score -= 30
		}
		if strings.Contains(strings.ToLower(n.NameEN), term) {
			score -= 30
		}
		if score < bestScore {
			bestScore = score
			bestID = id
		}
	}
	if bestScore > 90 {
		return ""
	}
	return bestID
}

func (e *LayeredEngine) resolveFuzzyStations(input string, max int) []endpointCandidate {
	term := strings.ToLower(strings.TrimSpace(input))
	type cand struct {
		id    string
		score int
	}
	cands := []cand{}
	for id, n := range e.pathfinder.Graph().Nodes {
		score := 100
		if strings.Contains(strings.ToLower(id), term) {
			score -= 40
		}
		if strings.Contains(strings.ToLower(n.NameJA), term) {
			score -= 30
		}
		if strings.Contains(strings.ToLower(n.NameEN), term) {
			score -= 30
		}
		if score < 95 {
			cands = append(cands, cand{id: id, score: score})
		}
	}
	sort.Slice(cands, func(i, j int) bool { return cands[i].score < cands[j].score })
	out := []endpointCandidate{}
	for i := 0; i < len(cands) && i < max; i++ {
		n := e.pathfinder.Graph().Nodes[cands[i].id]
		out = append(out, endpointCandidate{
			StationID:      cands[i].id,
			StationName:    displayStation(n),
			WalkMinutes:    4 + i*2,
			ComplexityHint: 2 + i,
		})
	}
	return out
}

func matchPlaceSpec(input string) *placeSpec {
	term := strings.ToLower(strings.TrimSpace(input))
	for _, p := range getPlaceSpecs() {
		for _, a := range p.Aliases {
			if strings.Contains(term, strings.ToLower(a)) {
				return &p
			}
		}
	}
	return nil
}

func getPlaceSpecs() []placeSpec {
	placeSpecsOnce.Do(func() {
		loaded := loadPlaceSpecsFromJSON()
		if len(loaded) > 0 {
			placeSpecsData = loaded
			return
		}
		placeSpecsData = tokyoPlaceSpecs
	})
	return placeSpecsData
}

func loadPlaceSpecsFromJSON() []placeSpec {
	candidates := []string{
		"src/data/places_tokyo.json",
		"../../src/data/places_tokyo.json",
		"../../../src/data/places_tokyo.json",
	}

	var raw []byte
	for _, c := range candidates {
		p := c
		if !filepath.IsAbs(p) {
			p = filepath.Clean(p)
		}
		b, err := os.ReadFile(p)
		if err == nil && len(b) > 0 {
			raw = b
			break
		}
	}
	if len(raw) == 0 {
		return nil
	}

	var entries []struct {
		ID         string            `json:"id"`
		Name       map[string]string `json:"name"`
		Aliases    []string          `json:"aliases"`
		Candidates []struct {
			StationName string `json:"stationName"`
			WalkMinutes int    `json:"walkMinutes"`
			Complexity  struct {
				TurnCount int `json:"turnCount"`
				ExitCount int `json:"exitCount"`
			} `json:"complexity"`
		} `json:"candidateStations"`
	}
	if err := json.Unmarshal(raw, &entries); err != nil {
		return nil
	}

	out := make([]placeSpec, 0, len(entries))
	for _, e := range entries {
		name := e.Name["en"]
		if strings.TrimSpace(name) == "" {
			name = e.Name["zh-TW"]
		}
		if strings.TrimSpace(name) == "" {
			name = e.Name["ja"]
		}
		if strings.TrimSpace(name) == "" {
			name = e.ID
		}

		aliases := append([]string{}, e.Aliases...)
		for _, v := range e.Name {
			if strings.TrimSpace(v) != "" {
				aliases = append(aliases, v)
			}
		}

		spec := placeSpec{
			ID:         e.ID,
			Name:       name,
			Aliases:    dedupeStrings(aliases),
			Candidates: make([]endpointCandidate, 0, len(e.Candidates)),
		}
		for _, c := range e.Candidates {
			hint := c.Complexity.TurnCount + c.Complexity.ExitCount/4
			if hint <= 0 {
				hint = 2
			}
			spec.Candidates = append(spec.Candidates, endpointCandidate{
				StationName:    c.StationName,
				WalkMinutes:    maxInt(c.WalkMinutes, 1),
				ComplexityHint: hint,
			})
		}
		if len(spec.Candidates) > 0 {
			out = append(out, spec)
		}
	}
	return out
}

var tokyoPlaceSpecs = []placeSpec{
	{
		ID:      "tokyo_metropolitan_gov",
		Name:    "Tokyo Metropolitan Government Building",
		Aliases: []string{"東京都廳", "東京都庁", "都庁", "tocho", "tokyo metropolitan government building"},
		Candidates: []endpointCandidate{
			{StationName: "Shinjuku", WalkMinutes: 10, ComplexityHint: 4},
			{StationName: "Nishi-Shinjuku", WalkMinutes: 6, ComplexityHint: 2},
			{StationName: "Tochomae", WalkMinutes: 4, ComplexityHint: 2},
		},
	},
	{
		ID:      "sensoji",
		Name:    "Senso-ji",
		Aliases: []string{"淺草寺", "浅草寺", "sensoji"},
		Candidates: []endpointCandidate{
			{StationName: "Asakusa", WalkMinutes: 6, ComplexityHint: 2},
			{StationName: "Tawaramachi", WalkMinutes: 8, ComplexityHint: 3},
			{StationName: "Kuramae", WalkMinutes: 12, ComplexityHint: 3},
		},
	},
	{
		ID:      "tokyo_tower",
		Name:    "Tokyo Tower",
		Aliases: []string{"東京鐵塔", "東京タワー", "tokyo tower"},
		Candidates: []endpointCandidate{
			{StationName: "Akabanebashi", WalkMinutes: 6, ComplexityHint: 2},
			{StationName: "Kamiyacho", WalkMinutes: 10, ComplexityHint: 3},
			{StationName: "Onarimon", WalkMinutes: 10, ComplexityHint: 3},
		},
	},
}

func isAirportKeyword(input string) bool {
	t := strings.ToLower(input)
	keys := []string{"narita", "nrt", "成田", "haneda", "hnd", "羽田", "airport", "機場"}
	for _, k := range keys {
		if strings.Contains(t, k) {
			return true
		}
	}
	return false
}

func (e *LayeredEngine) buildAirportStructured(origin, dest, locale string, weatherCtx *weather.CurrentWeather) map[string]interface{} {
	airport := "narita"
	airportName := "Narita Airport"
	if strings.Contains(strings.ToLower(origin+dest), "haneda") || strings.Contains(origin+dest, "羽田") {
		airport = "haneda"
		airportName = "Haneda Airport"
	}
	now := time.Now().In(time.FixedZone("JST", 9*3600))
	hour := now.Hour()
	rain := weatherCtx != nil && weatherCtx.IsRaining()

	options := []map[string]interface{}{}
	if airport == "narita" {
		options = []map[string]interface{}{
			{"mode": "rail", "name": "Skyliner/N'EX", "duration_minutes": 55, "headway_min": 20, "transfers": 1, "time_window": "05:30-23:00"},
			{"mode": "bus", "name": "Airport Limousine Bus", "duration_minutes": 90, "headway_min": 25, "transfers": 0, "time_window": "06:00-23:30"},
			{"mode": "taxi", "name": "Taxi", "duration_minutes": 80, "headway_min": 0, "transfers": 0, "time_window": "00:00-24:00"},
		}
	} else {
		options = []map[string]interface{}{
			{"mode": "rail", "name": "Keikyu/Monorail", "duration_minutes": 40, "headway_min": 8, "transfers": 1, "time_window": "05:00-24:00"},
			{"mode": "bus", "name": "Airport Limousine Bus", "duration_minutes": 55, "headway_min": 20, "transfers": 0, "time_window": "05:30-23:30"},
			{"mode": "taxi", "name": "Taxi", "duration_minutes": 45, "headway_min": 0, "transfers": 0, "time_window": "00:00-24:00"},
		}
	}

	for _, o := range options {
		headway := toInt(o["headway_min"])
		transfer := toInt(o["transfers"])
		duration := toInt(o["duration_minutes"])
		score := float64(duration) + float64(headway)*0.5 + float64(transfer)*8
		if rain && o["mode"] == "rail" {
			score += 4
		}
		if hour >= 23 || hour <= 5 {
			if o["mode"] == "taxi" {
				score -= 8
			}
			if o["mode"] == "rail" {
				score += 10
			}
		}
		o["score"] = round2(score)
	}
	sort.Slice(options, func(i, j int) bool { return toFloat(options[i]["score"]) < toFloat(options[j]["score"]) })
	recommendation := options[0]
	alts := []map[string]interface{}{}
	for i := 1; i < len(options); i++ {
		alts = append(alts, options[i])
	}

	summary := fmt.Sprintf("機場建議：%s -> 主要建議 `%s`（約 %d 分鐘）。", airportName, recommendation["name"], toInt(recommendation["duration_minutes"]))
	if strings.HasPrefix(locale, "ja") {
		summary = fmt.Sprintf("空港アクセス提案: %s -> 推奨は `%s`（約%d分）。", airportName, recommendation["name"], toInt(recommendation["duration_minutes"]))
	}
	if strings.HasPrefix(locale, "en") {
		summary = fmt.Sprintf("Airport access recommendation: %s -> `%s` (~%d min).", airportName, recommendation["name"], toInt(recommendation["duration_minutes"]))
	}

	data := map[string]interface{}{
		"origin":      origin,
		"destination": dest,
		"summary":     summary,
		"context": map[string]interface{}{
			"date_time_jst": now.Format(time.RFC3339),
			"weather_rain":  rain,
		},
		"recommendation": recommendation,
		"alternatives":   alts,
	}
	return map[string]interface{}{
		"type": "airport_access",
		"data": data,
		// backward compatible flattened fields
		"origin":         data["origin"],
		"destination":    data["destination"],
		"summary":        data["summary"],
		"context":        data["context"],
		"recommendation": data["recommendation"],
		"alternatives":   data["alternatives"],
	}
}

func displayStation(n *router.Node) string {
	if n == nil {
		return ""
	}
	if strings.TrimSpace(n.NameJA) != "" {
		return n.NameJA
	}
	return n.NameEN
}

func normalizeLineName(lineID string) string {
	switch {
	case strings.Contains(lineID, "UenoTokyo"):
		return "上野東京線"
	case strings.Contains(lineID, "Yamanote"):
		return "山手線"
	case strings.Contains(lineID, "Chuo"):
		return "中央線"
	case strings.Contains(lineID, "KeihinTohoku"):
		return "京浜東北線"
	case strings.Contains(lineID, "Ginza"):
		return "銀座線"
	case strings.Contains(lineID, "Marunouchi"):
		return "丸ノ内線"
	default:
		return lineID
	}
}

func estimateTransfersFromNodes(path []*router.Node) int {
	if len(path) < 2 {
		return 0
	}
	transfers := 0
	prevLine := path[0].RailwayID
	for i := 1; i < len(path); i++ {
		line := path[i].RailwayID
		if line != "" && prevLine != "" && line != prevLine {
			transfers++
		}
		if line != "" {
			prevLine = line
		}
	}
	return transfers
}

func round2(v float64) float64 {
	return math.Round(v*100) / 100
}

func toInt(v interface{}) int {
	switch t := v.(type) {
	case int:
		return t
	case float64:
		return int(t)
	default:
		return 0
	}
}

func toFloat(v interface{}) float64 {
	switch t := v.(type) {
	case float64:
		return t
	case int:
		return float64(t)
	default:
		return 0
	}
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func dedupeStrings(in []string) []string {
	seen := map[string]bool{}
	out := make([]string, 0, len(in))
	for _, s := range in {
		v := strings.TrimSpace(s)
		if v == "" {
			continue
		}
		k := strings.ToLower(v)
		if seen[k] {
			continue
		}
		seen[k] = true
		out = append(out, v)
	}
	return out
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

func detectBusyMessage(text string) (bool, string) {
	lc := strings.ToLower(text)
	patterns := []struct {
		rx     string
		reason string
	}{
		{rx: "busy", reason: "busy_message"},
		{rx: "混み合", reason: "busy_message"},
		{rx: "稍後再", reason: "busy_message"},
		{rx: "請稍後", reason: "busy_message"},
		{rx: "timeout", reason: "timeout_message"},
		{rx: "timed out", reason: "timeout_message"},
		{rx: "model unavailable", reason: "model_unavailable"},
		{rx: "tool error", reason: "tool_failure_message"},
	}
	for _, p := range patterns {
		if strings.Contains(lc, p.rx) {
			return true, p.reason
		}
	}
	return false, ""
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
