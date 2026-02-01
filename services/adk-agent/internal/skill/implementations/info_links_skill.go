package implementations

import (
	"context"
	"regexp"
	"strings"

	"github.com/lutagu/adk-agent/internal/skill"
)

// InfoLinksSkill provides quick links to essential services like lockers and mobility
type InfoLinksSkill struct {
	skill.BaseSkill
	lockerKeywords   []*regexp.Regexp
	mobilityKeywords []*regexp.Regexp
}

// NewInfoLinksSkill creates a new info links skill
func NewInfoLinksSkill() *InfoLinksSkill {
	s := &InfoLinksSkill{
		BaseSkill: skill.NewBaseSkill("info_links", "Provides links to lockers, micro-mobility, and taxis", 75),
	}
	s.initKeywords()
	return s
}

func (s *InfoLinksSkill) initKeywords() {
	s.lockerKeywords = []*regexp.Regexp{
		regexp.MustCompile(`(?i)(置物櫃|行李|寄存|寄放|寄物|locker|coin\s*locker|luggage|storage)`),
		regexp.MustCompile(`(?i)(コインロッカー|荷物預かり)`),
	}
	s.mobilityKeywords = []*regexp.Regexp{
		regexp.MustCompile(`(?i)(共享單車|滑板車|叫車|計程車|luup|hello\s*cycling|bike|scooter|taxi|uber|go\s*taxi)`),
		regexp.MustCompile(`(?i)(タクシー|シェアサイクル)`),
	}
}

func (s *InfoLinksSkill) CanHandle(ctx context.Context, query string, skillCtx skill.SkillContext) float64 {
	for _, p := range s.lockerKeywords {
		if p.MatchString(query) {
			return 0.85
		}
	}
	for _, p := range s.mobilityKeywords {
		if p.MatchString(query) {
			return 0.85
		}
	}
	return 0
}

func (s *InfoLinksSkill) Execute(ctx context.Context, request skill.SkillRequest) (*skill.SkillResponse, error) {
	locale := request.Context.Locale
	query := strings.ToLower(request.Query)

	// Check if it's more about lockers
	isLocker := false
	for _, p := range s.lockerKeywords {
		if p.MatchString(query) {
			isLocker = true
			break
		}
	}

	if isLocker {
		content := map[string]string{
			"zh-TW": `🧳 **東京行李寄放資訊連結**

**1. 車站置物櫃空位查詢**
- [Locker Concierge](https://www.locker-concierge.com/search/)

**2. 行李寄放服務**
- [ecbo cloak](https://cloak.ecbo.io/zh-TW)

**3. 行李托運服務**
- [Yamato (黑貓宅急便)](https://www.kuronekoyamato.co.jp/ytc/en/)
- [Sagawa](https://www.sagawa-exp.co.jp/english/)
`,
			"ja": `🧳 **コインロッカー・手荷物預かりリンク**

**1. ロッカー空き状況**
- [ロッカーコンシェルジュ](https://www.locker-concierge.com/search/)

**2. 荷物預かりサービス**
- [ecbo cloak](https://cloak.ecbo.io/)

**3. 荷物配送サービス**
- [ヤマト運輸](https://www.kuronekoyamato.co.jp/ytc/en/)
- [佐川急便](https://www.sagawa-exp.co.jp/english/)
`,
		}
		return &skill.SkillResponse{
			Content:    getLocalized(content, locale),
			Category:   "info_locker",
			Confidence: 0.95,
			Sources: []skill.Source{
				{Title: "ecbo cloak", URL: "https://cloak.ecbo.io/", Type: "link"},
			},
		}, nil
	}

	// Mobility Links
	content := map[string]string{
		"zh-TW": `🚲 **東京微型交通與叫車連結**

**1. 微型交通**
- [Luup 官方網站](https://luup.sc/)
- [Hello Cycling 官網](https://www.hellocycling.jp/)

**2. 叫車服務**
- [GO Taxi](https://go.mo-t.com/)
- [Uber](https://www.uber.com/jp/zh-tw/ride/)
`,
		"ja": `🚲 **モビリティ・配車リンク**

**1. シェアサイクル / キックボード**
- [Luup](https://luup.sc/)
- [Hello Cycling](https://www.hellocycling.jp/)

**2. タクシー配車**
- [GO](https://go.mo-t.com/)
- [Uber](https://www.uber.com/jp/ja/ride/)
`,
	}
	return &skill.SkillResponse{
		Content:    getLocalized(content, locale),
		Category:   "info_mobility",
		Confidence: 0.95,
		Sources: []skill.Source{
			{Title: "Luup", URL: "https://luup.sc/", Type: "link"},
			{Title: "GO Taxi", URL: "https://go.mo-t.com/", Type: "link"},
		},
	}, nil
}
