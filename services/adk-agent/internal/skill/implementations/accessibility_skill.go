package implementations

import (
	"context"
	"regexp"
	"strings"

	"github.com/lutagu/adk-agent/internal/skill"
)

// AccessibilitySkill handles accessibility-related queries
type AccessibilitySkill struct {
	skill.BaseSkill
	patterns []*regexp.Regexp
}

// NewAccessibilitySkill creates a new accessibility skill
func NewAccessibilitySkill() *AccessibilitySkill {
	s := &AccessibilitySkill{
		BaseSkill: skill.NewBaseSkill("accessibility", "Handles accessibility and barrier-free information", 75),
	}
	s.initPatterns()
	return s
}

func (s *AccessibilitySkill) initPatterns() {
	s.patterns = []*regexp.Regexp{
		regexp.MustCompile(`(?i)(無障礙|バリアフリー|barrier.?free|wheelchair|輪椅|車椅子)`),
		regexp.MustCompile(`(?i)(電梯|エレベーター|elevator|lift)`),
		regexp.MustCompile(`(?i)(電扶梯|エスカレーター|escalator)`),
		regexp.MustCompile(`(?i)(嬰兒車|ベビーカー|stroller|baby|推車)`),
		regexp.MustCompile(`(?i)(行動不便|身障|disabled|handicap|special needs)`),
	}
}

// CanHandle checks if this skill can handle the query
func (s *AccessibilitySkill) CanHandle(ctx context.Context, query string, skillCtx skill.SkillContext) float64 {
	query = strings.ToLower(query)
	
	for _, p := range s.patterns {
		if p.MatchString(query) {
			return 0.85
		}
	}
	
	return 0
}

// Execute handles the accessibility query
func (s *AccessibilitySkill) Execute(ctx context.Context, request skill.SkillRequest) (*skill.SkillResponse, error) {
	locale := request.Context.Locale
	query := strings.ToLower(request.Query)
	
	// Check for elevator-specific query
	if strings.Contains(query, "電梯") || strings.Contains(query, "エレベーター") || strings.Contains(query, "elevator") {
		return s.handleElevatorQuery(locale)
	}
	
	// General accessibility response
	return s.handleGeneralAccessibility(locale)
}

func (s *AccessibilitySkill) handleElevatorQuery(locale string) (*skill.SkillResponse, error) {
	content := map[string]string{
		"zh-TW": `♿ **電梯與無障礙設施**

**大多數車站都有電梯，但：**
- 部分老舊車站可能只有一個電梯
- 月台到閘門可能需要換乘電梯
- 尖峰時段可能需要等候

**實用建議：**
1. 使用「駅すぱあと」或 Google Maps 查詢無障礙路線
2. JR 東日本 App 可查詢電梯位置
3. 有問題可詢問站務員（駅員）

**優先席：**
每列車的頭尾車廂設有優先席（優先席/Priority Seat），請讓給有需要者。`,
		"ja": `♿ **エレベーター・バリアフリー情報**

**ほとんどの駅にエレベーターがありますが：**
- 古い駅は1基のみの場合も
- ホームから改札まで乗り換えが必要な場合も
- ラッシュ時は混雑

**便利なツール：**
1. 駅すぱあと/Google Mapsでバリアフリー経路検索
2. JR東日本アプリでエレベーター位置確認
3. 困ったら駅員さんに相談を

**優先席：**
各車両の端に優先席があります。譲り合いをお願いします。`,
		"en": `♿ **Elevator & Accessibility Info**

**Most stations have elevators, but:**
- Some older stations may have only one elevator
- May need to transfer elevators from platform to gate
- Can be crowded during rush hour

**Helpful Tools:**
1. Use Ekispert or Google Maps for barrier-free routes
2. JR East App shows elevator locations
3. Ask station staff (駅員) for assistance

**Priority Seats:**
Each train has priority seats at the ends of cars for those who need them.`,
	}
	
	return &skill.SkillResponse{
		Content:    getLocalizedSkill(content, locale),
		Category:   "accessibility_elevator",
		Confidence: 0.9,
		Actions: []skill.Action{
			{Type: "link", Label: "JR East Barrier-Free Guide", Data: "https://www.jreast.co.jp/e/customer_support/accessibility.html"},
		},
	}, nil
}

func (s *AccessibilitySkill) handleGeneralAccessibility(locale string) (*skill.SkillResponse, error) {
	content := map[string]string{
		"zh-TW": `♿ **東京交通無障礙指南**

**設施概況：**
- 大多數車站有電梯和電扶梯
- 多語言觸摸屏售票機
- 點字導引設施
- 輪椅專用電梯

**服務：**
- 站務員可協助上下車
- 提前 30 分鐘致電可預約協助
- 各站設有無障礙廁所

**嬰兒車使用者：**
- 可使用電梯
- 非尖峰時段較方便
- 部分車廂設有專用空間

需要查詢特定車站的無障礙設施嗎？`,
		"ja": `♿ **東京交通バリアフリーガイド**

**設備：**
- ほとんどの駅にエレベーター・エスカレーター完備
- 多言語タッチパネル券売機
- 点字ブロック
- 車椅子対応エレベーター

**サービス：**
- 駅員が乗降を補助
- 30分前に連絡すれば介助予約可能
- 各駅に多機能トイレ

**ベビーカー利用：**
- エレベーター利用可能
- 混雑時を避けることを推奨
- 一部車両にスペースあり`,
		"en": `♿ **Tokyo Transit Accessibility Guide**

**Facilities:**
- Most stations have elevators and escalators
- Multi-language touch screen ticket machines
- Tactile paving (Braille blocks)
- Wheelchair-accessible elevators

**Services:**
- Staff assistance for boarding/alighting
- Call ahead 30 minutes for reserved assistance
- Accessible restrooms at all stations

**Stroller Users:**
- Use elevators
- Avoid rush hours if possible
- Some train cars have dedicated space`,
	}
	
	return &skill.SkillResponse{
		Content:    getLocalizedSkill(content, locale),
		Category:   "accessibility_general",
		Confidence: 0.85,
	}, nil
}

func getLocalizedSkill(content map[string]string, locale string) string {
	if val, ok := content[locale]; ok {
		return val
	}
	if val, ok := content["zh-TW"]; ok {
		return val
	}
	return content["en"]
}
