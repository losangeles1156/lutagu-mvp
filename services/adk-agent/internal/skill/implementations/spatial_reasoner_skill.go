package implementations

import (
	"context"
	"regexp"

	"github.com/lutagu/adk-agent/internal/skill"
)

// SpatialReasonerSkill handles alternative routes and detour logic during disruptions
type SpatialReasonerSkill struct {
	skill.BaseSkill
	keywords []*regexp.Regexp
}

// NewSpatialReasonerSkill creates a new spatial reasoner skill
func NewSpatialReasonerSkill() *SpatialReasonerSkill {
	s := &SpatialReasonerSkill{
		BaseSkill: skill.NewBaseSkill("spatial_reasoner", "Provides alternative routes and delay strategies", 90),
	}
	s.initKeywords()
	return s
}

func (s *SpatialReasonerSkill) initKeywords() {
	s.keywords = []*regexp.Regexp{
		regexp.MustCompile(`(?i)(替代|方案|換路|轉乘|繞路|停駛怎麼辦|改搭|alternative|detour|delay|stuck|suspended)`),
		regexp.MustCompile(`(?i)(振替|代替|ルート変更)`),
	}
}

func (s *SpatialReasonerSkill) CanHandle(ctx context.Context, query string, skillCtx skill.SkillContext) float64 {
	// Higher priority if there is an active L2 disruption
	score := 0.0
	for _, p := range s.keywords {
		if p.MatchString(query) {
			score = 0.85
			break
		}
	}

	if score > 0 && skillCtx.L2Disrupted {
		score = 0.95
	}

	return score
}

func (s *SpatialReasonerSkill) Execute(ctx context.Context, request skill.SkillRequest) (*skill.SkillResponse, error) {
	locale := request.Context.Locale

	content := map[string]string{
		"zh-TW": "正在評估空間替代路線與「等待價值」...\n\n我會分析附近其他的鐵道路線（如：從 Metro 改搭 JR），並判斷目前延誤情況下，「原地等待」還是「繞路前往」更明智。",
		"ja":    "代替ルートと「待機価値」を評価しています...\n\n現在の運行状況に基づき、振替輸送の利用かそのまま待機すべきかを判断します。",
		"en":    "Evaluating alternative routes and 'Wait Value'...\n\nI'll analyze other nearby railway lines (e.g., switching from Metro to JR) and determine whether waiting or detouring is wiser given the current delays.",
	}

	return &skill.SkillResponse{
		Content:    getLocalized(content, locale),
		Category:   "navigation_spatial",
		Confidence: 0.9,
		NeedsLLM:   true, // Complex logic requiring LLM math/reasoning
	}, nil
}
