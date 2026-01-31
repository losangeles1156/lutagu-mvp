package implementations

import (
	"context"
	"regexp"
	"strings"

	"github.com/lutagu/adk-agent/internal/skill"
)

// FareSkill handles fare calculation and IC card queries
type FareSkill struct {
	skill.BaseSkill
	farePatterns []*regexp.Regexp
	icPatterns   []*regexp.Regexp
}

// NewFareSkill creates a new fare skill
func NewFareSkill() *FareSkill {
	s := &FareSkill{
		BaseSkill: skill.NewBaseSkill("fare", "Handles fare calculation and IC card information", 80),
	}
	s.initPatterns()
	return s
}

func (s *FareSkill) initPatterns() {
	s.farePatterns = []*regexp.Regexp{
		regexp.MustCompile(`(?i)(多少錢|いくら|how much|fare|票價|運賃|料金)`),
		regexp.MustCompile(`(?i)(費用|cost|price|値段)`),
	}
	s.icPatterns = []*regexp.Regexp{
		regexp.MustCompile(`(?i)(suica|pasmo|icoca|toica|ic\s*card|ic卡|交通卡)`),
		regexp.MustCompile(`(?i)(西瓜卡|企鵝卡)`),
	}
}

// CanHandle checks if this skill can handle the query
func (s *FareSkill) CanHandle(ctx context.Context, query string, skillCtx skill.SkillContext) float64 {
	query = strings.ToLower(query)
	
	// Check fare patterns
	for _, p := range s.farePatterns {
		if p.MatchString(query) {
			return 0.8
		}
	}
	
	// Check IC card patterns
	for _, p := range s.icPatterns {
		if p.MatchString(query) {
			return 0.75
		}
	}
	
	return 0
}

// Execute handles the fare query
func (s *FareSkill) Execute(ctx context.Context, request skill.SkillRequest) (*skill.SkillResponse, error) {
	query := strings.ToLower(request.Query)
	
	// Check if it's an IC card query
	for _, p := range s.icPatterns {
		if p.MatchString(query) {
			return s.handleICCardQuery(request.Context.Locale)
		}
	}
	
	// Generic fare response (context-dependent)
	return s.handleGenericFareQuery(request)
}

func (s *FareSkill) handleICCardQuery(locale string) (*skill.SkillResponse, error) {
	content := map[string]string{
		"zh-TW": `💳 **IC 卡資訊**

**Suica / PASMO** 是東京最常用的交通 IC 卡，功能相同且可互通。

**購買方式：**
- JR 車站自動售票機（Suica）
- 地鐵車站自動售票機（PASMO）
- 初次購買需 ¥500 押金

**使用優勢：**
- 比單程票便宜約 ¥10-30
- 可用於便利商店、自動販賣機
- 無需每次購票

**注意：** 2023年後 Suica 暫停發售實體卡，請使用 iPhone Wallet 或 Android 版本。`,
		"ja": `💳 **IC カード情報**

Suica/PASMOは相互利用可能で、どちらも同じように使えます。

**購入方法：**
- JR駅の券売機（Suica）
- 地下鉄駅の券売機（PASMO）
- デポジット ¥500

**メリット：**
- 切符より約¥10-30安い
- コンビニ・自販機でも利用可
- 毎回切符を買う必要なし`,
		"en": `💳 **IC Card Information**

Suica and PASMO are the main IC cards in Tokyo. They work identically and are interchangeable.

**How to Get:**
- JR station ticket machines (Suica)
- Metro station ticket machines (PASMO)
- ¥500 deposit required

**Benefits:**
- ¥10-30 cheaper than single tickets
- Works at convenience stores, vending machines
- No need to buy tickets each time

**Note:** Since 2023, physical Suica cards are limited. Use iPhone Wallet or Android versions.`,
	}
	
	return &skill.SkillResponse{
		Content:    getLocalized(content, locale),
		Category:   "fare_ic_card",
		Confidence: 0.9,
		Sources: []skill.Source{
			{Title: "JR East Official", URL: "https://www.jreast.co.jp/suica/", Type: "link"},
		},
	}, nil
}

func (s *FareSkill) handleGenericFareQuery(request skill.SkillRequest) (*skill.SkillResponse, error) {
	locale := request.Context.Locale
	
	content := map[string]string{
		"zh-TW": `💴 **東京交通票價指南**

票價取決於距離和路線。常見票價範圍：
- **JR 線**: ¥140-¥1,340
- **東京 Metro**: ¥170-¥320
- **都營地下鐵**: ¥180-¥430

**省錢建議：**
1. 使用 IC 卡（Suica/PASMO）比買票便宜
2. 一日券適合密集行程
3. 購買 JR Pass 適合多日城市間移動

請告訴我您的出發站和目的站，我可以幫您查詢確切票價。`,
		"ja": `💴 **東京交通運賃ガイド**

運賃は距離と路線により異なります：
- **JR**: ¥140-¥1,340
- **東京メトロ**: ¥170-¥320
- **都営地下鉄**: ¥180-¥430

**お得情報：**
1. ICカードは切符より安い
2. 1日乗車券は観光に便利
3. JRパスは複数日の移動に最適

出発駅と目的駅を教えてください。`,
		"en": `💴 **Tokyo Transit Fare Guide**

Fares depend on distance and lines:
- **JR Lines**: ¥140-¥1,340
- **Tokyo Metro**: ¥170-¥320
- **Toei Subway**: ¥180-¥430

**Money Saving Tips:**
1. IC cards are cheaper than tickets
2. Day passes are great for sightseeing
3. JR Pass is best for multi-day travel

Tell me your origin and destination for exact fares.`,
	}
	
	return &skill.SkillResponse{
		Content:    getLocalized(content, locale),
		Category:   "fare_general",
		Confidence: 0.75,
		NeedsLLM:   true, // May need context-specific fare calculation
	}, nil
}

func getLocalized(content map[string]string, locale string) string {
	if val, ok := content[locale]; ok {
		return val
	}
	if val, ok := content["zh-TW"]; ok {
		return val
	}
	return content["en"]
}
