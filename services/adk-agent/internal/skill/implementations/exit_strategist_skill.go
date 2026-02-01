package implementations

import (
	"context"
	"regexp"

	"github.com/lutagu/adk-agent/internal/skill"
)

// ExitStrategistSkill handles station exit and navigation queries
type ExitStrategistSkill struct {
	skill.BaseSkill
	keywords []*regexp.Regexp
}

// NewExitStrategistSkill creates a new exit strategist skill
func NewExitStrategistSkill() *ExitStrategistSkill {
	s := &ExitStrategistSkill{
		BaseSkill: skill.NewBaseSkill("exit_strategist", "Optimizes station exit selection to minimize walking", 95),
	}
	s.initKeywords()
	return s
}

func (s *ExitStrategistSkill) initKeywords() {
	s.keywords = []*regexp.Regexp{
		regexp.MustCompile(`(?i)(哪個出口|什麼出口|怎麼走|出口在哪|最近的出口|どの出口|何番出口|which exit|best exit|how to get to)`),
		regexp.MustCompile(`(?i)(出口|exit|出口案內)`),
	}
}

func (s *ExitStrategistSkill) CanHandle(ctx context.Context, query string, skillCtx skill.SkillContext) float64 {
	for _, p := range s.keywords {
		if p.MatchString(query) {
			return 0.9
		}
	}
	return 0
}

func (s *ExitStrategistSkill) Execute(ctx context.Context, request skill.SkillRequest) (*skill.SkillResponse, error) {
	// Exit strategy is highly station-specific and usually requires LLM reasoning
	// over structural data or RAG results.

	locale := request.Context.Locale
	station := request.Context.NodeName
	if station == "" {
		station = "當前車站"
	}

	content := map[string]string{
		"zh-TW": "正在為您規劃最省力的出口路線...\n\n在東京的大型車站，選錯出口可能要多走 15 分鐘。請告訴我您的目的地（例如：大丸百貨、歌舞伎町），我將結合站體結構為您推薦最接近的出口與車廂編號。",
		"ja":    "最適な出口を特定しています...\n\n目的地を教えていただければ、最も近い出口と最適な車両番号をご案内します。",
		"en":    "Finding the most efficient exit for you...\n\nIn large Tokyo stations, choosing the wrong exit can add 15 minutes of walking. Please tell me your destination, and I'll suggest the closest exit and car number.",
	}

	return &skill.SkillResponse{
		Content:    getLocalized(content, locale),
		Category:   "navigation_exit",
		Confidence: 0.8,
		NeedsLLM:   true, // Needs LLM to reason about the destination and RAG data
		Metadata: map[string]interface{}{
			"station_context": station,
		},
	}, nil
}
