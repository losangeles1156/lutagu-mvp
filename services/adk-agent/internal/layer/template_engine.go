package layer

import (
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/lutagu/adk-agent/internal/infrastructure/weather"
)

// TemplateContext holds dynamic data for template response generation
type TemplateContext struct {
	Query      string
	Locale     string
	NodeCtx    *ResolvedContext
	WeatherCtx *weather.CurrentWeather
	L2Ctx      *L2Context
	Time       time.Time
}

// TemplateEngine provides L1 fast-path responses for high-frequency queries
type TemplateEngine struct {
	patterns     []templatePattern
	nodeHandlers map[string]string // NodeID -> Category mapping
	cache        map[string]*templateResult
	ttl          time.Duration
}

type templatePattern struct {
	regex    *regexp.Regexp
	category string
	handler  func(matches []string, ctx TemplateContext) *templateResult
}

type templateResult struct {
	Content   string
	Category  string
	Timestamp time.Time
}

// TemplateEngineConfig configures the template engine
type TemplateEngineConfig struct {
	CacheTTL time.Duration
}

// NewTemplateEngine creates a new template engine with predefined patterns
func NewTemplateEngine(cfg TemplateEngineConfig) *TemplateEngine {
	if cfg.CacheTTL == 0 {
		cfg.CacheTTL = 5 * time.Minute
	}

	e := &TemplateEngine{
		cache:        make(map[string]*templateResult),
		nodeHandlers: make(map[string]string),
		ttl:          cfg.CacheTTL,
	}

	e.initPatterns()
	return e
}

func (e *TemplateEngine) initPatterns() {
	// Node Direct Mapping (Vector-like approach)
	e.nodeHandlers["narita"] = "airport_transfer_narita"
	e.nodeHandlers["haneda"] = "airport_transfer_haneda"

	e.patterns = []templatePattern{
		// Airport transfers - Narita (Fallback regex)
		{
			regex:    regexp.MustCompile(`(?i)(成田|NRT|Narita).*(東京|新宿|澀谷|池袋|上野|Tokyo|Shinjuku|Shibuya|Ikebukuro|Ueno)`),
			category: "airport_transfer_narita",
			handler:  e.handleAirportTransfer,
		},
		// Airport transfers - Haneda (Fallback regex)
		{
			regex:    regexp.MustCompile(`(?i)(羽田|HND|Haneda).*(東京|新宿|澀谷|池袋|品川|Tokyo|Shinjuku|Shibuya|Ikebukuro|Shinagawa)`),
			category: "airport_transfer_haneda",
			handler:  e.handleAirportTransfer,
		},
		// Facility queries - toilets
		{
			regex:    regexp.MustCompile(`(?i)(廁所|トイレ|toilet|お手洗い|洗手間|restroom)`),
			category: "facility_toilet",
			handler:  e.handleToiletQuery,
		},
		// Facility queries - lockers
		{
			regex:    regexp.MustCompile(`(?i)(置物櫃|ロッカー|locker|コインロッカー|寄物|行李)`),
			category: "facility_locker",
			handler:  e.handleLockerQuery,
		},
		// Facility queries - WiFi
		{
			regex:    regexp.MustCompile(`(?i)(wifi|ワイファイ|無線|網路|internet)`),
			category: "facility_wifi",
			handler:  e.handleWifiQuery,
		},
		// Fare queries
		{
			regex:    regexp.MustCompile(`(?i)(多少錢|いくら|how much|fare|票價|運賃|料金)`),
			category: "fare",
			handler:  e.handleFareQuery,
		},
		// Last train queries
		{
			regex:    regexp.MustCompile(`(?i)(末班|終電|last train|最終|終車)`),
			category: "last_train",
			handler:  e.handleLastTrainQuery,
		},
		// First train queries
		{
			regex:    regexp.MustCompile(`(?i)(首班|始發|first train|最早|初電)`),
			category: "first_train",
			handler:  e.handleFirstTrainQuery,
		},
		// Greeting
		{
			regex:    regexp.MustCompile(`(?i)^(你好|こんにちは|hello|hi|hey|哈囉|您好)\s*$`),
			category: "greeting",
			handler:  e.handleGreeting,
		},
	}
}

// MatchResult contains the result of a template match
type MatchResult struct {
	Matched  bool
	Content  string
	Category string
	Score    float64
}

// Match attempts to match the query against templates
func (e *TemplateEngine) Match(ctx TemplateContext) *MatchResult {
	query := strings.TrimSpace(ctx.Query)
	if query == "" {
		return nil
	}

	// 1. Node-Focused Dispatch (Vector Logic)
	// If we have identified a Primary Node, check if it triggers a template directly
	if ctx.NodeCtx != nil && ctx.NodeCtx.PrimaryNodeID != "" {
		if category, ok := e.nodeHandlers[ctx.NodeCtx.PrimaryNodeID]; ok {
			// Found a direct node handler!
			// Dispatch to the correct handler based on category
			// Note: We currently hardcode dispatch here, but in a bigger system we'd use a map of funcs
			var result *templateResult
			if strings.HasPrefix(category, "airport_transfer") {
				result = e.handleAirportTransfer(nil, ctx)
			}

			if result != nil {
				return &MatchResult{
					Matched:  true,
					Content:  result.Content,
					Category: result.Category,
					Score:    0.98, // Very high confidence for Node match
				}
			}
		}
	}

	// 2. Regex Pattern Matching (Fallback)
	cacheKey := fmt.Sprintf("%s:%s", query, ctx.Locale)
	if cached, ok := e.cache[cacheKey]; ok {
		if time.Since(cached.Timestamp) < e.ttl {
			// ... (existing cache logic)
			return &MatchResult{
				Matched:  true,
				Content:  cached.Content,
				Category: cached.Category,
				Score:    1.0,
			}
		}
		delete(e.cache, cacheKey)
	}

	for _, p := range e.patterns {
		if matches := p.regex.FindStringSubmatch(query); matches != nil {
			result := p.handler(matches, ctx)
			if result != nil {
				if !strings.HasPrefix(p.category, "airport_") {
					result.Timestamp = time.Now()
					e.cache[cacheKey] = result
				}
				return &MatchResult{
					Matched:  true,
					Content:  result.Content,
					Category: result.Category,
					Score:    0.95,
				}
			}
		}
	}

	return &MatchResult{Matched: false}
}

// Handler implementations

func (e *TemplateEngine) handleAirportTransfer(matches []string, ctx TemplateContext) *templateResult {
	isNarita := strings.Contains(strings.ToLower(ctx.Query), "成田") || strings.Contains(strings.ToLower(ctx.Query), "narita") || strings.Contains(strings.ToLower(ctx.Query), "nrt")

	dest := "東京市區"
	if ctx.NodeCtx != nil && ctx.NodeCtx.Destination != "" {
		dest = ctx.NodeCtx.Destination
	}

	// Dynamic Advice Header
	advice := "🗼 **東京交通專家建議**\n"
	if ctx.WeatherCtx != nil {
		if ctx.WeatherCtx.IsRaining {
			advice += "☔ **目前正下雨**：優先推薦直達的新幹線或特急電車，避免在戶外轉乘計程車。\n"
		} else {
			advice += fmt.Sprintf("☀️ **今日天氣良好 (%.1f°C)**：所有交通工具運行正常。\n", ctx.WeatherCtx.Temperature)
		}
	}
	if ctx.L2Ctx != nil && ctx.L2Ctx.HasDisruption {
		advice += "⚠️ **即時警告**：部分線路目前有延誤，請依下方即時建議規劃。\n"
	}

	var content map[string]string
	if isNarita {
		content = map[string]string{
			"zh-TW": fmt.Sprintf("%s從 **成田機場** 前往 **%s** 的最佳方式：\n1. **Skyliner**: 最快(41分)，到日暮里/上野轉乘。\n2. **成田特急 N'EX**: 舒適直達東京/新宿/澀谷。\n3. **利木津巴士**: 適合攜帶大件行李直達飯店。", advice, dest),
			"en":    fmt.Sprintf("%sBest ways from **Narita (NRT)** to **%s**:\n1. **Skyliner**: Fastest (41min) to Nippori/Ueno.\n2. **Narita Express (N'EX)**: Direct to Tokyo/Shinjuku.\n3. **Limousine Bus**: Best for heavy luggage direct to hotels.", advice, dest),
		}
	} else {
		content = map[string]string{
			"zh-TW": fmt.Sprintf("%s從 **羽田機場** 前往 **%s** 的最佳方式：\n1. **京急線**: 最快直達品川/銀座線方向。\n2. **東京單軌電車**: 到濱松町轉乘山手線，風景優美。\n3. **利木津巴士**: 直達各大車站與飯店。", advice, dest),
			"en":    fmt.Sprintf("%sBest ways from **Haneda (HND)** to **%s**:\n1. **Keikyu Line**: Direct to Shinagawa/Ginza line.\n2. **Tokyo Monorail**: To Hamamatsucho for Yamanote line.\n3. **Limousine Bus**: Direct to major hubs.", advice, dest),
		}
	}

	return &templateResult{Content: getLocalized(content, ctx.Locale), Category: "airport_transfer"}
}

func (e *TemplateEngine) handleToiletQuery(matches []string, ctx TemplateContext) *templateResult {
	content := map[string]string{
		"zh-TW": "🚻 廁所通常位於各車站的付費區內外都有，大型轉運站通常在月台、閘門外及地下通道都設有。建議使用 Google Maps 搜尋「トイレ」(toilet) 確認最近位置。",
		"ja":    "🚻 トイレは各駅の改札内外にあります。大きな駅ではホーム、改札外、地下通路にも設置されています。",
		"en":    "🚻 Toilets are available both inside and outside the fare gates at most stations. Large transfer stations have toilets on platforms, outside gates, and in underground passages.",
	}
	return &templateResult{Content: getLocalized(content, ctx.Locale), Category: "facility_toilet"}
}

func (e *TemplateEngine) handleLockerQuery(matches []string, ctx TemplateContext) *templateResult {
	content := map[string]string{
		"zh-TW": "🎒 置物櫃 (コインロッカー) 在大多數車站都有，通常位於閘門外。大型置物櫃 (大) 一天約 700-800 日圓，中型 (中) 約 500-600 日圓，小型 (小) 約 300-400 日圓。也可使用 Suica/PASMO 付款。",
		"ja":    "🎒 コインロッカーは主要駅の改札外にあります。大サイズは700-800円/日、中サイズは500-600円/日、小サイズは300-400円/日です。Suica/PASMOでも支払えます。",
		"en":    "🎒 Coin lockers are available outside the fare gates at most stations. Large lockers cost ¥700-800/day, medium ¥500-600/day, small ¥300-400/day. Suica/PASMO payment is accepted.",
	}
	return &templateResult{Content: getLocalized(content, ctx.Locale), Category: "facility_locker"}
}

func (e *TemplateEngine) handleWifiQuery(matches []string, ctx TemplateContext) *templateResult {
	content := map[string]string{
		"zh-TW": "📶 東京 Metro 和都營地下鐵在主要車站提供免費 WiFi「Metro_Free_Wi-Fi」。每次連線 180 分鐘，可重複登入。JR 東日本提供「JR-EAST_FREE_Wi-Fi」。",
		"ja":    "📶 東京メトロ・都営地下鉄は主要駅で「Metro_Free_Wi-Fi」を提供しています（180分/回、再ログイン可）。JR東日本は「JR-EAST_FREE_Wi-Fi」を提供しています。",
		"en":    "📶 Tokyo Metro and Toei Subway offer free WiFi 'Metro_Free_Wi-Fi' at major stations (180 min/session, re-login allowed). JR East provides 'JR-EAST_FREE_Wi-Fi'.",
	}
	return &templateResult{Content: getLocalized(content, ctx.Locale), Category: "facility_wifi"}
}

func (e *TemplateEngine) handleFareQuery(matches []string, ctx TemplateContext) *templateResult {
	// This is a generic response; specific fare calculation requires context
	content := map[string]string{
		"zh-TW": "💴 票價計算需要知道出發站和目的站。請告訴我您想從哪裡到哪裡，我可以幫您查詢票價。使用 IC 卡 (Suica/PASMO) 通常比購買單程票便宜。",
		"ja":    "💴 運賃は出発駅と目的駅によります。どこからどこへ行きたいか教えてください。IC カード (Suica/PASMO) は切符より安いことが多いです。",
		"en":    "💴 Fare depends on origin and destination. Please tell me where you want to go. Using an IC card (Suica/PASMO) is usually cheaper than buying a single ticket.",
	}
	return &templateResult{Content: getLocalized(content, ctx.Locale), Category: "fare"}
}

func (e *TemplateEngine) handleLastTrainQuery(matches []string, ctx TemplateContext) *templateResult {
	content := map[string]string{
		"zh-TW": "🌙 東京的末班車大多在深夜 0:00-0:30 之間發車，但具體時間因路線和車站而異。請告訴我您的出發站和目的站，我可以查詢確切時間。週末和假日時刻可能不同。",
		"ja":    "🌙 終電は深夜0:00-0:30頃ですが、路線・駅により異なります。出発駅と目的駅を教えてください。週末・祝日はダイヤが異なる場合があります。",
		"en":    "🌙 Last trains in Tokyo typically depart between midnight and 0:30 AM, but times vary by line and station. Tell me your origin and destination for exact times. Weekend/holiday schedules may differ.",
	}
	return &templateResult{Content: getLocalized(content, ctx.Locale), Category: "last_train"}
}

func (e *TemplateEngine) handleFirstTrainQuery(matches []string, ctx TemplateContext) *templateResult {
	content := map[string]string{
		"zh-TW": "🌅 東京的首班車大多在清晨 5:00-5:30 之間發車。請告訴我您的出發站，我可以查詢確切時間。",
		"ja":    "🌅 始発は朝5:00-5:30頃です。出発駅を教えてください。",
		"en":    "🌅 First trains in Tokyo typically depart between 5:00-5:30 AM. Tell me your origin station for exact times.",
	}
	return &templateResult{Content: getLocalized(content, ctx.Locale), Category: "first_train"}
}

func (e *TemplateEngine) handleGreeting(matches []string, ctx TemplateContext) *templateResult {
	content := map[string]string{
		"zh-TW": "👋 你好！我是 LUTAGU 東京交通助手。我可以幫您查詢路線、票價、末班車時間，以及車站設施資訊。請問有什麼可以幫您的嗎？",
		"ja":    "👋 こんにちは！LUTAGU 東京交通アシスタントです。路線・運賃・終電・駅設備をお調べします。何かお探しですか？",
		"en":    "👋 Hello! I'm the LUTAGU Tokyo Transit Assistant. I can help with routes, fares, last trains, and station facilities. How can I help you?",
	}
	return &templateResult{Content: getLocalized(content, ctx.Locale), Category: "greeting"}
}

func getLocalized(content map[string]string, locale string) string {
	if val, ok := content[locale]; ok {
		return val
	}
	// Fallback chain: zh-TW -> ja -> en
	if val, ok := content["zh-TW"]; ok {
		return val
	}
	if val, ok := content["ja"]; ok {
		return val
	}
	return content["en"]
}
