package implementations

import (
	"context"
	"regexp"

	"github.com/lutagu/adk-agent/internal/skill"
)

// LocalGuideSkill handles travel guide and spot recommendation queries
type LocalGuideSkill struct {
	skill.BaseSkill
	keywords []*regexp.Regexp
}

// NewLocalGuideSkill creates a new local guide skill
func NewLocalGuideSkill() *LocalGuideSkill {
	s := &LocalGuideSkill{
		BaseSkill: skill.NewBaseSkill("local_guide", "Provides creative local travel recommendations", 85),
	}
	s.initKeywords()
	return s
}

func (s *LocalGuideSkill) initKeywords() {
	s.keywords = []*regexp.Regexp{
		regexp.MustCompile(`(?i)(推薦|好玩|景點|美食|哪裡好吃|推薦什麼|人氣|推薦地點|おすすめ|観光|グルメ|recommend|spots|best place|to visit|must see)`),
		regexp.MustCompile(`(?i)(必吃|必去|打卡)`),
	}
}

func (s *LocalGuideSkill) CanHandle(ctx context.Context, query string, skillCtx skill.SkillContext) float64 {
	for _, p := range s.keywords {
		if p.MatchString(query) {
			return 0.85
		}
	}
	return 0
}

func (s *LocalGuideSkill) Execute(ctx context.Context, request skill.SkillRequest) (*skill.SkillResponse, error) {
	locale := request.Context.Locale
	station := request.Context.NodeName
	if station == "" {
		station = "東京"
	}

	content := map[string]string{
		"zh-TW": "正在為您探索附近的在地景點與隱藏美食...\n\n我會以此站的「氣氛」為核心，為您推薦 3 個值得造訪的地方。如果您有特定的需求（例如：想要安靜的咖啡廳、道地的居酒屋），請告訴我！",
		"ja":    "周辺のローカルスポットや隠れた名店を探しています...\n\nこのエリアの雰囲気に基づいたおすすめ情報を準備中です。具体的なご要望があれば教えてください。",
		"en":    "Exploring local spots and hidden gems for you...\n\nI'll recommend 3 places based on the vibe of this area. Let me know if you have specific preferences (e.g., a quiet cafe, authentic izakaya)!",
	}

	return &skill.SkillResponse{
		Content:    getLocalized(content, locale),
		Category:   "travel_guide",
		Confidence: 0.85,
		NeedsLLM:   true, // Local Guide relies heavily on DeepSeek's creative descriptions
		Metadata: map[string]interface{}{
			"station_context": station,
		},
	}, nil
}
