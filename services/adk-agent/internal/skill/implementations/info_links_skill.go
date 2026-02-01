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
			"zh-TW": `🧳 **東京行李寄放指引**

**1. 車站置物櫃 (Coin Lockers)**
- 車站內都有置物櫃，但大型櫃位經常全滿。
- **即時狀態查詢**：[Locker Concierge](https://www.locker-concierge.com/search/)

**2. 行李預約服務 (ECBO Cloak)**
- 如果不想在車站找，可以使用 **ecbo cloak** 預約店家空間寄放（如咖啡廳、商店）。
- **官方網站 (預約制)**：[ecbo cloak](https://cloak.ecbo.io/zh-TW)

**3. 行李托運 (Hands-Free Travel)**
- 如果想直接把行李寄到機場或飯店，可以找 **Yamato (黑貓宅急便)** 或 **Sagawa** 櫃台。`,
			"ja": `🧳 **コインロッカー・手荷物預かり**

**1. コインロッカー**
- [ロッカーコンシェルジュ](https://www.locker-concierge.com/search/) で空き状況を確認できます。

**2. 予約サービス (ecbo cloak)**
- カフェや店舗に荷物を預けられる予約サービスです。
- [ecbo cloak 官網](https://cloak.ecbo.io/)`,
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
		"zh-TW": `🚲 **東京交通與叫車連結**

**1. 微型交通 (Luup / 共享單車)**
- **Luup (電動滑板車/單車)**：東京最盛行的微型交通工具。
- [Luup 官方網站](https://luup.sc/)
- **Hello Cycling**：常見的電動輔助單車。
- [Hello Cycling 官網](https://www.hellocycling.jp/)

**2. 叫車服務 (Taxi / App)**
- **GO**：日本市佔率最高的叫車 App。
- **Uber**：在東京市區也非常好用。
- [GO Taxi App](https://go.mo-t.com/)

**提示**：在東京市區近距離移動，Luup 通常比計程車更靈活且便宜。`,
		"ja": `🚲 **モビリティ・配車サービス**

**1. シェアサイクル / キックボード**
- **Luup**：[公式サイト](https://luup.sc/)
- **Hello Cycling**：[公式サイト](https://www.hellocycling.jp/)

**2. タクシー配車**
- **GO**：[公式サイト](https://go.mo-t.com/)
- **Uber**：東京で利用可能`,
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
