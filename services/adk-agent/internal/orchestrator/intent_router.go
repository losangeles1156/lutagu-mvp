package orchestrator

import (
	"regexp"
	"sort"
	"strings"
	"sync"
)

type toolPlan struct {
	RouteTool           bool
	StatusTool          bool
	TimeTool            bool
	RequireRouteExplain bool
	IntentTags          []string
}

type intentAnalysis struct {
	Route intentRoute
	Tags  []string
}

var intentFeedbackModel = newFeedbackModel()

func analyzeIntent(query string) intentAnalysis {
	q := strings.ToLower(strings.TrimSpace(query))
	if q == "" {
		return intentAnalysis{Route: intentTemplateOnly}
	}

	tags := classifyIntentTags(q)
	if hasRoutePhrase(q) && !hasTag(tags, "route") {
		tags = append([]string{"route"}, tags...)
	}
	switch {
	case hasTag(tags, "status") || hasTag(tags, "time_sensitive"):
		return intentAnalysis{Route: intentAlgoTool, Tags: tags}
	case hasTag(tags, "local_guide") && !hasTag(tags, "route"):
		return intentAnalysis{Route: intentLLMRequired, Tags: tags}
	case hasTag(tags, "fare") && !hasTag(tags, "route"):
		return intentAnalysis{Route: intentLLMRequired, Tags: tags}
	case hasTag(tags, "route"):
		return intentAnalysis{Route: intentSLMOnly, Tags: tags}
	case len(tags) == 0 && len([]rune(q)) <= 12:
		return intentAnalysis{Route: intentTemplateOnly, Tags: tags}
	default:
		return intentAnalysis{Route: intentLLMRequired, Tags: tags}
	}
}

func buildToolPlan(query string, nodeCtxRoute bool, analysis intentAnalysis) toolPlan {
	plan := toolPlan{
		RouteTool:           nodeCtxRoute || hasTag(analysis.Tags, "route"),
		StatusTool:          hasTag(analysis.Tags, "status"),
		TimeTool:            hasTag(analysis.Tags, "time_sensitive"),
		RequireRouteExplain: hasTag(analysis.Tags, "route_explain") || nodeCtxRoute,
		IntentTags:          analysis.Tags,
	}
	return plan
}

func classifyIntentTags(q string) []string {
	tags := []string{}

	addByKeywords(&tags, "route", q,
		"route", "路線", "路线", "轉乘", "換乘", "直達", "直达", "行き方", "how to get",
	)
	addByKeywords(&tags, "status", q,
		"運行", "遅延", "遅れ", "運休", "見合わせ", "delay", "status", "suspended", "誤點", "延誤", "延遲", "停駛", "運行狀況",
	)
	addByKeywords(&tags, "time_sensitive", q,
		"現在", "幾點", "today", "deadline", "來得及", "来得及", "起飛", "flight", "班次", "時刻", "timetable", "趕", "赶",
	)
	addByKeywords(&tags, "route_explain", q,
		"為何", "为什么", "why", "不推薦", "不推荐", "compare", "比較", "比较",
	)
	addByKeywords(&tags, "fare", q,
		"fare", "票價", "票价", "費用", "多少钱", "how much", "ic card", "suica", "pasmo",
	)
	addByKeywords(&tags, "accessibility", q,
		"電梯", "电梯", "elevator", "wheelchair", "無障礙", "无障碍", "accessible",
	)
	addByKeywords(&tags, "local_guide", q,
		"推薦", "推荐", "nearby", "附近", "景點", "景点", "吃", "餐廳", "restaurant",
	)

	return applyIntentFeedback(tags)
}

func addByKeywords(tags *[]string, tag string, query string, keywords ...string) {
	for _, kw := range keywords {
		if strings.Contains(query, strings.ToLower(kw)) {
			*tags = append(*tags, tag)
			return
		}
	}
}

func hasRoutePhrase(q string) bool {
	if q == "" {
		return false
	}
	patterns := []*regexp.Regexp{
		regexp.MustCompile(`(?i)(從|から|from)\s*.+\s*(到|へ|まで|to)\s*.+`),
		regexp.MustCompile(`(?i)\bfrom\b.+\bto\b`),
		regexp.MustCompile(`(?i)\bto\b.+\bfrom\b`),
	}
	for _, p := range patterns {
		if p.MatchString(q) {
			return true
		}
	}
	return false
}

func hasTag(tags []string, target string) bool {
	for _, t := range tags {
		if t == target {
			return true
		}
	}
	return false
}

type feedbackModel struct {
	mu      sync.RWMutex
	weights map[string]float64
}

func newFeedbackModel() *feedbackModel {
	return &feedbackModel{
		weights: map[string]float64{},
	}
}

func (m *feedbackModel) update(tags []string, helpful bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	delta := -0.08
	if helpful {
		delta = 0.12
	}
	for _, tag := range tags {
		if tag == "" {
			continue
		}
		next := m.weights[tag] + delta
		if next > 2 {
			next = 2
		}
		if next < -2 {
			next = -2
		}
		m.weights[tag] = next
	}
}

func (m *feedbackModel) score(tag string) float64 {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.weights[tag]
}

func (m *feedbackModel) snapshot() map[string]float64 {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := make(map[string]float64, len(m.weights))
	for k, v := range m.weights {
		out[k] = v
	}
	return out
}

func (m *feedbackModel) restore(weights map[string]float64) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.weights = make(map[string]float64, len(weights))
	for k, v := range weights {
		if strings.TrimSpace(k) == "" {
			continue
		}
		if v > 2 {
			v = 2
		}
		if v < -2 {
			v = -2
		}
		m.weights[k] = v
	}
}

func applyIntentFeedback(tags []string) []string {
	if len(tags) <= 1 {
		return tags
	}
	sort.SliceStable(tags, func(i, j int) bool {
		return intentFeedbackModel.score(tags[i]) > intentFeedbackModel.score(tags[j])
	})
	if len(tags) > 4 {
		return tags[:4]
	}
	return tags
}

// UpdateIntentTagFeedback applies user feedback to intent-tag routing priorities.
func UpdateIntentTagFeedback(tags []string, helpful bool) {
	intentFeedbackModel.update(tags, helpful)
}

// GetIntentFeedbackWeights returns current in-memory feedback weights.
func GetIntentFeedbackWeights() map[string]float64 {
	return intentFeedbackModel.snapshot()
}

// RestoreIntentFeedbackWeights replaces in-memory feedback weights with persisted values.
func RestoreIntentFeedbackWeights(weights map[string]float64) {
	intentFeedbackModel.restore(weights)
}

// AnalyzeIntentForQuery exposes intent routing for evaluation tooling.
func AnalyzeIntentForQuery(query string) (string, []string) {
	analysis := analyzeIntent(query)
	return string(analysis.Route), analysis.Tags
}
