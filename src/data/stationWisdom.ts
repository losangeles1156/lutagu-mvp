export interface StationTrap {
    type: 'depth' | 'transfer' | 'exit' | 'crowd';
    title: string;
    content: string;
    advice: string;
    severity: 'medium' | 'high' | 'critical';
}

// L3 設施資料結構 - 供 AI Agent 參照
export interface StationFacility {
    type: 'toilet' | 'locker' | 'elevator' | 'escalator' | 'wifi' | 'charging' | 'nursing' | 'atm' | 'info' | 'shopping' | 'dining' | 'leisure';
    location: string | { ja: string; en: string; zh: string };      // 精確位置描述 (Multilingual)
    floor: string;         // 'JR 3F' | 'Metro B1' | 'Metro B2' | 'JR 1F'
    operator: 'JR' | 'Metro' | 'Toei' | 'Private';
    attributes?: {
        count?: number;           // 置物櫃數量
        sizes?: string[];         // 置物櫃尺寸
        wheelchair?: boolean;     // 無障礙
        hasWashlet?: boolean;     // 溫水洗淨
        hasBabyRoom?: boolean;    // 育嬰室
        hours?: string;           // 營業時間
        ssid?: string;            // WiFi SSID
        note?: string;            // 備註
    };
    source?: string;       // 資料來源 URL
}

// 無障礙步行路線 - 基於 MLIT 歩行空間ネットワークデータ
export interface AccessibilityRoute {
    name: string;                       // 路線名稱
    from: string;                       // 起點
    to: string;                         // 終點
    rank: 'SAA' | 'SBA' | 'SBB' | 'AAA' | 'ABB'; // 無障礙等級 (S=最佳推薦)
    distance?: number;                  // 距離 (公尺)
    hasTactilePaving: boolean;          // 點字磚 (視障導引)
    hasRoof: boolean;                   // 有遮蔽 (雨天適用)
    hasElevator: boolean;               // 電梯可用
    widthLevel: 1 | 2 | 3 | 4 | 5;      // 路徑寬度 (1=狹窄, 5=寬敞)
    slopeLevel?: 1 | 2 | 3 | 4 | 5;     // 坡度 (1=平坦)
    note?: string;
    source: string;                     // 資料來源
}

export interface StationWisdomData {
    links?: { title: string; url: string; icon?: string; bg?: string }[];
    traps: StationTrap[];
    hacks?: string[];
    l3Facilities?: StationFacility[];           // L3 設施資料 - AI 可參照
    accessibilityRoutes?: AccessibilityRoute[]; // 無障礙路線 - MLIT 資料
}

export const STATION_WISDOM: Record<string, StationWisdomData> = {
    'odpt:Station:TokyoMetro.Ginza': {
        traps: [
            {
                type: 'transfer',
                title: '🤝 銀座線與日比谷線轉乘 (Ginza to Hibiya)',
                content: '雖然這兩條線路共享銀座站，但轉乘需要經過漫長的地下通道，特別是如果你在車廂兩端下車。',
                advice: '⚠️ 建議：跟隨藍色（日比谷線）或橙色（銀座線）的地面指示箭頭，並注意不要誤出站。',
                severity: 'medium'
            }
        ],
        hacks: [
            '💎 **出口陷阱**：如果你要去銀座四丁目的三越百貨，請尋找 A7 或 A8 出口，這比走 A1 快得多。',
            '🎨 **藝術地下道**：地下道內常有藝術展覽，轉乘時不妨放慢腳步欣賞。'
        ],
        l3Facilities: [
            // === 廁所 (Toilets) ===
            {
                type: 'toilet',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: '銀座四丁目交差點方面驗票口附近',
                    en: 'Near Ginza 4-chome Intersection Ticket Gate',
                    ja: '銀座四丁目交差点方面改札付近'
                },
                attributes: { wheelchair: true, hasWashlet: true },
                source: 'https://www.tokyometro.jp/lang_tcn/station/ginza/accessibility/'
            },
            {
                type: 'toilet',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: 'C8 出口附近改札外 (新設)',
                    en: 'Outside Gate near Exit C8 (New)',
                    ja: 'C8出口付近改札外（新設）'
                },
                attributes: { wheelchair: true, hasWashlet: true }
            },
            // === 置物櫃 (Lockers) ===
            {
                type: 'locker',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: '有樂町方面驗票口外 右側通路',
                    en: 'Right Passage Outside Yurakucho Gate',
                    ja: '有楽町方面改札外 右側通路'
                },
                attributes: { count: 30, sizes: ['S', 'M', 'L'] },
                source: 'https://coinlocker.click/ginza-station.php'
            },
            {
                type: 'locker',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: 'C5/C6 出口之間通路',
                    en: 'Passage between Exit C5/C6',
                    ja: 'C5/C6出口間通路'
                },
                attributes: { count: 50, sizes: ['S', 'M', 'L'] }
            },
            // === 電梯 (Elevators) ===
            {
                type: 'elevator',
                floor: 'Metro GF',
                operator: 'Metro',
                location: {
                    zh: 'A7 出口 (銀座三越)',
                    en: 'Exit A7 (Ginza Mitsukoshi)',
                    ja: 'A7出口（銀座三越）'
                },
                attributes: { wheelchair: true }
            },
            {
                type: 'elevator',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: '銀座線/丸之內線月台 → 穿堂層',
                    en: 'Ginza/Marunouchi Line Platform → Concourse',
                    ja: '銀座線/丸ノ内線ホーム → コンコース'
                },
                attributes: { wheelchair: true }
            },
            // === WiFi ===
            {
                type: 'wifi',
                floor: 'Metro GF',
                operator: 'Metro',
                location: {
                    zh: '改札內',
                    en: 'Inside Ticket Gates',
                    ja: '改札内'
                },
                attributes: { ssid: 'METRO_FREE_WiFi' }
            }
        ]
    },
    'odpt:Station:Toei.Nihombashi': {
        traps: [
            {
                type: 'transfer',
                title: '🚧 東西線與銀座線轉乘 (Tozai to Ginza)',
                content: '東西線日本橋站位置較深，轉乘銀座線需要經過數段樓梯或電梯。',
                advice: '⚠️ 注意：轉乘約需 5-8 分鐘，趕時間時請特別留意。',
                severity: 'medium'
            }
        ],
        hacks: [
            '🛍️ **高島屋直結**：B0 出口直通日本橋高島屋百貨，是逛街的最佳入口。',
            '🌉 **日本橋本體**：從 B12 出口上來即是歷史悠久的日本橋古橋。'
        ],
        l3Facilities: [
            // === 廁所 (Toilets) ===
            {
                type: 'toilet',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: '吳服橋方面驗票口內 (東西線側)',
                    en: 'Inside Gofukubashi Gate (Tozai Line Side)',
                    ja: '呉服橋方面改札内（東西線側）'
                },
                attributes: { wheelchair: true, hasWashlet: true },
                source: 'https://www.tokyometro.jp/lang_tcn/station/nihombashi/accessibility/'
            },
            {
                type: 'toilet',
                floor: 'Toei B1',
                operator: 'Toei',
                location: {
                    zh: '茅場町方面驗票口附近',
                    en: 'Near Kayabacho Direction Gate',
                    ja: '茅場町方面改札付近'
                },
                attributes: { wheelchair: true, hasWashlet: true },
                source: 'https://www.kotsu.metro.tokyo.jp/subway/stations/nihombashi.html'
            },
            // === 置物櫃 (Lockers) ===
            {
                type: 'locker',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: 'B0 出口向處 (高島屋方面)',
                    en: 'Near Exit B0 (Takashimaya Direction)',
                    ja: 'B0出口方向（高島屋方面）'
                },
                attributes: { count: 40, sizes: ['S', 'M', 'L'] },
                source: 'https://coin-locker.net/nihonbashi/'
            },
            {
                type: 'locker',
                floor: 'Toei B1',
                operator: 'Toei',
                location: {
                    zh: '改札外 茅場町方面出口通路',
                    en: 'Outside Gate, Kayabacho Exit Passage',
                    ja: '改札外 茅場町方面出口通路'
                },
                attributes: { count: 20, sizes: ['S', 'M'] }
            },
            // === 電梯 (Elevators) ===
            {
                type: 'elevator',
                floor: 'Metro GF',
                operator: 'Metro',
                location: {
                    zh: 'B0 出口電梯',
                    en: 'Exit B0 Elevator',
                    ja: 'B0出口エレベーター'
                },
                attributes: { wheelchair: true }
            },
            {
                type: 'elevator',
                floor: 'Toei GF',
                operator: 'Toei',
                location: {
                    zh: 'D1 出口電梯',
                    en: 'Exit D1 Elevator',
                    ja: 'D1出口エレベーター'
                },
                attributes: { wheelchair: true }
            },
            // === WiFi ===
            {
                type: 'wifi',
                floor: 'Metro/Toei',
                operator: 'Metro',
                location: {
                    zh: '全站',
                    en: 'Entire Station',
                    ja: '全駅'
                },
                attributes: { ssid: 'METRO_FREE_WiFi' }
            }
        ]
    },

    // Nihombashi (Metro) - Distinct from Toei
    'odpt:Station:TokyoMetro.Nihombashi': {
        traps: [
            {
                type: 'transfer',
                title: '🪜 東西線深層陷阱 (Tozai Depth)',
                content: '東西線月臺位於地下深處，轉乘銀座線需上下多層樓梯。',
                advice: '⚠️ 建議：尋找「Coredo 日本橋」方向的電梯，避開繁忙的中央樓梯。',
                severity: 'medium'
            }
        ],
        hacks: [
            '🏢 **Coredo 直結**：B12 出口直通 Coredo 日本橋，享用美食非常方便。',
            '💴 **金融歷史散步**：從 B1 出口出來，即是著名的日本銀行舊館與貨幣博物館。'
        ],
        l3Facilities: [] // Auto-populated by Scraper
    },
    // Mitsukoshimae (Metro)
    'odpt:Station:TokyoMetro.Mitsukoshimae': {
        traps: [
            {
                type: 'transfer',
                title: '🚇 半藏門線轉乘距離 (Long Transfer)',
                content: '雖然站名相同，但銀座線與半藏門線月臺相距甚遠，轉乘需步行約 5-8 分鐘。',
                advice: '⚠️ 心理建設：請預留轉乘時間，通道設有自動步道可減輕負擔。',
                severity: 'medium'
            },
            {
                type: 'transfer',
                title: '🏙️ 百貨公司陷阱 (Department Store Maze)',
                content: '三越前站與三越百貨、Coredo 室町等多家百貨直結，地下通道非常複雜。',
                advice: '⚠️ 注意：去不同分館請看準出口標號（如 A1、A4），否則在地下很容易迷路。',
                severity: 'medium'
            }
        ],
        hacks: [
            '🏛️ **三越本館直達**：A5 出口直接通往日本最古老的三越百貨本店 B1 美食街。',
            '🏮 **福德神社**：藏身於現代建築 Coredo 室町後方的歷史神社，以求中獎運聞名。',
            '🏦 **金庫街氛圍**：周邊是日本銀行總部，街道建築充滿明治時代的厚重感，適合散步拍照。',
            '🎬 **Coredo 室町**：A6 出口直通 Coredo 室町，有電影院與深夜營業的餐飲店。'
        ],
        l3Facilities: [
            // === 廁所 (Toilets) ===
            {
                type: 'toilet',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: '半藏門線 驗票口內 (近三越口)',
                    en: 'Inside Hanzomon Line Gate (near Mitsukoshi)',
                    ja: '半蔵門線 改札内（三越口付近）'
                },
                attributes: { wheelchair: true, hasWashlet: true },
                source: 'https://www.tokyometro.jp/lang_tcn/station/mitsukoshimae/accessibility/'
            },
            {
                type: 'toilet',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: '銀座線 驗票口內 (近日本橋方面改札)',
                    en: 'Inside Ginza Line Gate (near Nihonbashi)',
                    ja: '銀座線 改札内（日本橋方面改札付近）'
                },
                attributes: { wheelchair: true, hasWashlet: true }
            },
            // === 置物櫃 (Lockers) ===
            {
                type: 'locker',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: 'A9出口手前',
                    en: 'Before Exit A9',
                    ja: 'A9出口手前'
                },
                attributes: { count: 30, sizes: ['S', 'M', 'L'] },
                source: 'https://coinlocker.click/mitsukoshimae-station.php'
            },
            {
                type: 'locker',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: 'A5出口橫 (三越前)',
                    en: 'Next to Exit A5 (Mitsukoshi)',
                    ja: 'A5出口横'
                },
                attributes: { count: 20, sizes: ['S', 'M'] }
            },
            // === 電梯 (Elevators) ===
            {
                type: 'elevator',
                floor: 'Metro B1/GF',
                operator: 'Metro',
                location: {
                    zh: 'A7出口 (往日本橋室町)',
                    en: 'Exit A7 (to Nihonbashi Muromachi)',
                    ja: 'A7出口'
                },
                attributes: { wheelchair: true }
            },
            {
                type: 'elevator',
                floor: 'Metro B1/GF',
                operator: 'Metro',
                location: {
                    zh: 'A1出口 (往日本橋本町)',
                    en: 'Exit A1 (to Nihonbashi Honcho)',
                    ja: 'A1出口'
                },
                attributes: { wheelchair: true }
            }
        ]
    },
    // Tsukiji (Metro)
    'odpt:Station:TokyoMetro.Tsukiji': {
        traps: [
            {
                type: 'exit',
                title: '🐟 場外市場出口 (Exit Confusion)',
                content: '要去築地場外市場吃海鮮？請務必走 **1號出口 (本願寺方面)**。',
                advice: '⚠️ 注意：若走錯到 3/4 號出口，需要過大馬路才能抵達市場。',
                severity: 'medium'
            }
        ],
        hacks: [
            '🙏 **本願寺巡禮**：1號出口出來即是風格獨特的「築地本願寺」，建築風格融合印度與佛教元素。',
            '🍣 **晨間壽司**：場外市場許多名店清晨 5:00 就開門，建議早起避開觀光人潮。'
        ],
        l3Facilities: [] // Auto-populated by Scraper
    },
    'odpt:Station:TokyoMetro.Kayabacho': {
        traps: [],
        hacks: [
            '📈 **金融街之胃**：車站周邊有無數平價且高品質的蕎麥麵店，服務於東京證券交易所的商務人士。'
        ],
        l3Facilities: [
            // === 廁所 (Toilets) ===
            {
                type: 'toilet',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: '中央驗票口內',
                    en: 'Inside Central Gate',
                    ja: '中央改札内'
                },
                attributes: { wheelchair: true, hasWashlet: true, hasBabyRoom: true },
                source: 'https://www.tokyometro.jp/lang_tcn/station/kayabacho/accessibility/'
            },
            // === 置物櫃 (Lockers) ===
            {
                type: 'locker',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: '東西線西改札外 (10 號出口附近)',
                    en: 'Outside Tozai Line West Gate (near Exit 10)',
                    ja: '東西線西改札外（10番出口付近）'
                },
                attributes: { count: 25, sizes: ['S', 'M'] },
                source: 'https://coin-locker.net/kayabacho/'
            },
            {
                type: 'locker',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: '中央驗票口外 (5, 6 號出口通路)',
                    en: 'Outside Central Gate (Exit 5, 6 Passage)',
                    ja: '中央改札外（5・6番出口通路）'
                },
                attributes: { count: 30, sizes: ['S', 'M', 'L'] }
            },
            // === 電梯 (Elevators) ===
            {
                type: 'elevator',
                floor: 'Metro GF',
                operator: 'Metro',
                location: {
                    zh: '4a 出口旁電梯',
                    en: 'Elevator near Exit 4a',
                    ja: '4a出口横エレベーター'
                },
                attributes: { wheelchair: true }
            },
            // === WiFi ===
            {
                type: 'wifi',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: '改札內',
                    en: 'Inside Ticket Gates',
                    ja: '改札内'
                },
                attributes: { ssid: 'METRO_FREE_WiFi' }
            }
        ]
    },
    // Higashi-Ginza (Metro/Toei)
    'odpt:Station:TokyoMetro.HigashiGinza': {
        traps: [
            {
                type: 'crowd',
                title: '🎭 歌舞伎散場人潮 (Kabukiza Crowd)',
                content: '歌舞伎座就在車站上方，演出結束時（通常是下午 4:00 或晚上 8:00）車站會瞬間爆滿。',
                advice: '⚠️ 建議：避開演出散場時間，或改走地下道至銀座站搭車（步行僅 5 分鐘）。',
                severity: 'medium'
            }
        ],
        hacks: [
            '🎭 **歌舞伎座直結**：3號出口直接連通歌舞伎座地下廣場，那裡有許多特色伴手禮與便當店（不用買票也能逛）。',
            '🚶 **銀座地下連通**：從這裡可以沿著地下道一路走到銀座站甚至有樂町，雨天完全不用淋雨。'
        ],
        l3Facilities: [] // Auto-populated by Scraper
    },
    // Hatchobori (Metro/JR)
    'odpt:Station:TokyoMetro.Hatchobori': {
        traps: [
            {
                type: 'transfer',
                title: '🚂 京葉線轉乘距離 (Keiyo Transfer)',
                content: '日比谷線與 JR 京葉線的轉乘雖然比東京站近，但仍需步行約 5-7 分鐘。',
                advice: '⚠️ 注意：早晚尖峰時段轉乘通道非常擁擠，請預留充裕時間。',
                severity: 'medium'
            }
        ],
        hacks: [
            '🌉 **隅田川露台**：從 B4 出口步行 3 分鐘即可抵達隅田川河岸，是欣賞東京天際線的隱藏景點。',
            '🐢 **去迪士尼的捷徑**：比起在東京站轉乘京葉線，許多內行人喜歡搭日比谷線到八丁堀轉車，距離更短更輕鬆。'
        ],
        l3Facilities: [] // Auto-populated by Scraper
    },
    // Ueno Station (Target for verification)
    'odpt:Station:TokyoMetro.Ueno': {
        traps: [
            {
                type: 'depth',
                title: '🚄 新幹線搭乘警示 (High Depth)',
                content: '上野站的新幹線月臺位於地下四層，非常深！從上野公園/不忍口進站後，需連續搭乘 **四段長扶梯** 才能抵達。',
                advice: '⚠️ 心理建設：請務必預留 **至少 15 分鐘** 的進站緩衝時間。絕對不要在發車前 5 分鐘才抵達驗票口，你會趕不上。',
                severity: 'critical'
            }
        ],
        hacks: [
            '🏛️ **文化天橋 (Panda Bridge)**：從公園口出站後，可直接走天橋（官方稱熊貓橋）通往國立科學博物館與上野大廳，避開 1F 的擁擠人潮。',
            '🛍️ **阿美橫町切入點**：想去阿美橫町？不要走「中央改札」，改走「不忍改札」過馬路就是入口，省下 5 分鐘迷路時間。',
            '🌧️ **雨天地下網**：上野站地下通道發達，可一路連通至京成上野站與地鐵站，下雨天完全不必淋雨。',
            '🚶 **散步去淺草**：由此沿淺草通步行至淺草約 25-30 分，可省下地鐵票並欣賞下町風光。'
        ],
        // L3 設施資料 - 基於 Tokyo Metro 及 JR East 官方資料
        l3Facilities: [
            // ==========================================
            // JR 上野駅 (JR Ueno Station)
            // ==========================================
            // --- Lockers (JR) ---
            {
                type: 'locker',
                floor: 'JR 1F',
                operator: 'JR',
                location: {
                    zh: '淺草口大型置物櫃區',
                    en: 'Asakusa Exit Locker Room',
                    ja: '浅草口コインロッカー'
                },
                attributes: { count: 350, sizes: ['S', 'M', 'L', 'XL', 'XXL'], note: '全站最大，大型行李推薦' },
                source: 'https://www.jreast.co.jp/estation/stations/204.html'
            },
            {
                type: 'locker',
                floor: 'JR 1F',
                operator: 'JR',
                location: {
                    zh: '中央改札外 (正面玄關)',
                    en: 'Outside Central Gate',
                    ja: '中央改札外 (正面玄関)'
                },
                attributes: { count: 120, sizes: ['S', 'M', 'L'] }
            },
            {
                type: 'locker',
                floor: 'JR 1F',
                operator: 'JR',
                location: {
                    zh: '中央改札內 (17號月台旁)',
                    en: 'Inside Central Gate (near Platform 17)',
                    ja: '中央改札内 (17番線脇)'
                },
                attributes: { count: 80, sizes: ['S', 'M'] }
            },
            {
                type: 'locker',
                floor: 'JR 3F',
                operator: 'JR',
                location: {
                    zh: '公園改札內 (熊貓橋口)',
                    en: 'Inside Park Gate',
                    ja: '公園改札内'
                },
                attributes: { count: 60, sizes: ['S', 'M'], note: '靠近上野公園' }
            },
            {
                type: 'locker',
                floor: 'JR 2F',
                operator: 'JR',
                location: {
                    zh: '不忍改札外通路',
                    en: 'Outside Shinobazu Gate Passage',
                    ja: '不忍改札外通路'
                },
                attributes: { count: 50, sizes: ['S', 'M', 'L'] }
            },
            // --- Toilets (JR) ---
            {
                type: 'toilet',
                floor: 'JR 1F',
                operator: 'JR',
                location: {
                    zh: '中央改札內包含大型洗手間)',
                    en: 'Inside Central Gate (Main)',
                    ja: '中央改札内 (大型トイレ)'
                },
                attributes: { wheelchair: true, hasWashlet: true, hasBabyRoom: true },
                source: 'https://www.jreast.co.jp/estation/stations/204.html'
            },
            {
                type: 'toilet',
                floor: 'JR 3F',
                operator: 'JR',
                location: {
                    zh: '公園改札內 (Ecute 旁)',
                    en: 'Inside Park Gate (near Ecute)',
                    ja: '公園改札内 (エキュート脇)'
                },
                attributes: { wheelchair: true, hasWashlet: true }
            },
            {
                type: 'toilet',
                floor: 'JR B4',
                operator: 'JR',
                location: {
                    zh: '新幹線改札內 (地下4層)',
                    en: 'Inside Shinkansen Gate (B4)',
                    ja: '新幹線改札内 (地下4階)'
                },
                attributes: { wheelchair: true, note: '僅限新幹線旅客' }
            },
            // ==========================================
            // 京成上野駅 (Keisei Ueno Station)
            // ==========================================
            {
                type: 'locker',
                floor: 'Keisei 1F',
                operator: 'Private',
                location: {
                    zh: '京成上野 改札外 (計程車乘車處旁)',
                    en: 'Keisei Ueno Outside Gate (Taxi Rank)',
                    ja: '京成上野 改札外 (タクシー乗り場横)'
                },
                attributes: { count: 200, sizes: ['S', 'M', 'L', 'XL'], note: 'Skyliner 旅客推薦' },
                source: 'https://www.keisei.co.jp/keisei/tetudou/stationmap/pdf/jp/101.pdf'
            },
            {
                type: 'toilet',
                floor: 'Keisei B1',
                operator: 'Private',
                location: {
                    zh: '京成上野 改札外大廳',
                    en: 'Keisei Ueno Concourse',
                    ja: '京成上野 改札外コンコース'
                },
                attributes: { wheelchair: true, hasWashlet: true }
            },
            // ==========================================
            // Tokyo Metro (Ginza/Hibiya Lines)
            // ==========================================
            {
                type: 'locker',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: '銀座線 JR方向改札外',
                    en: 'Ginza Line Outside Gate (towards JR)',
                    ja: '銀座線 JR方面改札外'
                },
                attributes: { count: 80, sizes: ['S', 'M'] }
            },
            {
                type: 'toilet',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: '銀座線 改札內',
                    en: 'Inside Ginza Line Gate',
                    ja: '銀座線 改札内'
                },
                attributes: { wheelchair: true, hasWashlet: true }
            },
            {
                type: 'toilet',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: '日比谷線 改札外 (靠近昭和通)',
                    en: 'Outside Hibiya Line Gate (Showa-dori)',
                    ja: '日比谷線 改札外 (昭和通り側)'
                },
                attributes: { wheelchair: true }
            },
            // ==========================================
            // 基礎服務 (Basic Services)
            // ==========================================
            {
                type: 'atm',
                floor: 'JR 1F',
                operator: 'Private',
                location: {
                    zh: '中央改札外 (Seven Bank)',
                    en: 'Outside Central Gate (Seven Bank)',
                    ja: '中央改札外 (セブン銀行)'
                },
                attributes: { note: '24H' }
            },
            {
                type: 'info',
                floor: 'JR 1F',
                operator: 'JR',
                location: {
                    zh: 'JR東日本旅遊服務中心',
                    en: 'JR East Travel Service Center',
                    ja: 'JR東日本訪日旅行センター'
                },
                attributes: { note: 'JR Pass 兌換點 / 8:00-20:00' }
            },
            // ==========================================
            // 電梯 & 電扶梯 (Vertical Transport)
            // ==========================================
            {
                type: 'elevator',
                floor: 'JR 1F/3F',
                operator: 'JR',
                location: {
                    zh: '中央改札內 (直通月台)',
                    en: 'Inside Central Gate (to Platforms)',
                    ja: '中央改札内 (ホーム直結)'
                },
                attributes: { wheelchair: true, note: '優先電梯' }
            },
            {
                type: 'elevator',
                floor: 'JR 3F',
                operator: 'JR',
                location: {
                    zh: '公園改札內 (熊貓橋口)',
                    en: 'Inside Park Gate',
                    ja: '公園改札内'
                },
                attributes: { wheelchair: true }
            },
            {
                type: 'escalator',
                floor: 'JR 1F-3F',
                operator: 'JR',
                location: {
                    zh: '大連絡橋 (中央改札 ↔ 月台)',
                    en: 'Grand Concourse (Gate ↔ Platforms)',
                    ja: '大連絡橋 (改札 ↔ ホーム)'
                },
                attributes: { note: '雙向運行' }
            },
            {
                type: 'elevator',
                floor: 'Keisei 1F',
                operator: 'Private',
                location: {
                    zh: '京成上野 正面口 (往計程車/地鐵)',
                    en: 'Keisei Ueno Main Exit (to Taxi/Metro)',
                    ja: '京成上野 正面口 (タクシー/地下鉄方面)'
                },
                attributes: { wheelchair: true }
            },
            {
                type: 'escalator',
                floor: 'Keisei B1',
                operator: 'Private',
                location: {
                    zh: 'Skyliner 月台',
                    en: 'Skyliner Platform',
                    ja: 'スカイライナーホーム'
                },
                attributes: { note: '直達改札層' }
            },
            {
                type: 'elevator',
                floor: 'Metro GF',
                operator: 'Metro',
                location: {
                    zh: '日比谷線 地上電梯 (昭和通側)',
                    en: 'Hibiya Line Street Elevator (Showa-dori)',
                    ja: '日比谷線 地上行き (昭和通り)'
                },
                attributes: { wheelchair: true }
            },
            {
                type: 'escalator',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: '銀座線 ↔ JR 連通道',
                    en: 'Ginza Line ↔ JR Passage',
                    ja: '銀座線 ↔ JR 連絡通路'
                },
                attributes: { note: '轉乘推薦' }
            },
            {
                type: 'elevator',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: '銀座線月台 → JR方向驗票口',
                    en: 'Ginza Line Platform → JR Ticket Gate',
                    ja: '銀座線ホーム → JR方面改札'
                },
                attributes: { wheelchair: true },
                source: 'https://www.tokyometro.jp/lang_tcn/station/ueno/accessibility/'
            },
            {
                type: 'wifi',
                floor: 'JR 全層',
                operator: 'JR',
                location: {
                    zh: '改札內外全站',
                    en: 'Inside/Outside Ticket Gates',
                    ja: '改札内外全域'
                },
                attributes: { ssid: 'JR-EAST_FREE_WiFi', note: '需登錄' }
            }
        ],
        // 無障礙步行路線 - 基於 MLIT 歩行空間ネットワークデータ (台東区上野駅周辺)
        accessibilityRoutes: [
            {
                name: 'JR中央口→不忍池 (推薦路線)',
                from: 'JR上野站中央口',
                to: '不忍池弁天堂',
                rank: 'SAA',
                distance: 350,
                hasTactilePaving: true,
                hasRoof: true,
                hasElevator: true,
                widthLevel: 4,
                slopeLevel: 2,
                note: '經不忍口地下道，全程有遮蔽，輪椅/嬰兒車友善',
                source: 'https://ckan.hokonavi.go.jp/dataset/2df4cb39-8b2e-4692-97ea-3f6b4132c109'
            },
            {
                name: '公園口→上野公園 (最短路線)',
                from: 'JR上野站公園口',
                to: '上野公園噴水廣場',
                rank: 'SAA',
                distance: 200,
                hasTactilePaving: true,
                hasRoof: false,
                hasElevator: true,
                widthLevel: 5,
                slopeLevel: 1,
                note: '出站即是公園入口，路面平坦寬敞，無遮蔽需注意天氣',
                source: 'https://ckan.hokonavi.go.jp/dataset/2df4cb39-8b2e-4692-97ea-3f6b4132c109'
            },
            {
                name: '不忍改札→阿美橫町',
                from: 'Metro上野站不忍改札',
                to: '阿美橫町北入口',
                rank: 'SBA',
                distance: 100,
                hasTactilePaving: true,
                hasRoof: false,
                hasElevator: false,
                widthLevel: 3,
                slopeLevel: 2,
                note: '過馬路後即抵達，但需走樓梯出站',
                source: 'https://ckan.hokonavi.go.jp/dataset/2df4cb39-8b2e-4692-97ea-3f6b4132c109'
            },
            {
                name: '廣小路口→松坂屋 (百貨購物)',
                from: 'JR上野站廣小路口',
                to: '松坂屋上野店',
                rank: 'AAA',
                distance: 150,
                hasTactilePaving: true,
                hasRoof: true,
                hasElevator: true,
                widthLevel: 4,
                slopeLevel: 1,
                note: '地下連通道直達，全程室內，雨天最佳',
                source: 'https://ckan.hokonavi.go.jp/dataset/2df4cb39-8b2e-4692-97ea-3f6b4132c109'
            },
            {
                name: '公園口→國立西洋美術館',
                from: 'JR上野站公園口',
                to: '國立西洋美術館',
                rank: 'SAA',
                distance: 300,
                hasTactilePaving: true,
                hasRoof: false,
                hasElevator: true,
                widthLevel: 5,
                slopeLevel: 1,
                note: '經上野公園主幹道，平坦寬敞，輪椅完全無障礙',
                source: 'https://ckan.hokonavi.go.jp/dataset/2df4cb39-8b2e-4692-97ea-3f6b4132c109'
            }
        ]
    },


    // Tokyo Station (Reference)
    // NOTE: Primary ID in Seed is JR-East.Tokyo, so we match that here.
    'odpt:Station:JR-East.Tokyo': {
        links: [
            {
                title: '東京車站廁所空席情報',
                url: 'https://tokyo-station-toilet.pages.vacan.com/marunouchi-area',
                icon: 'toilet',
                bg: 'bg-blue-600'
            }
        ],
        traps: [
            {
                type: 'transfer',
                title: '🏃 京葉線轉乘陷阱 (Far Transfer)',
                content: '京葉線（去迪士尼的路線）月臺距離山手線非常遠，實際上接近「有樂町站」。',
                advice: '⚠️ 心理建設：轉乘通道長達 800 公尺，步行需 15-20 分鐘。請把它當作是「走到下一站」的距離感。',
                severity: 'high'
            }
        ],
        hacks: [
            '🎫 **丸之內南口紅磚站舍**：國家重要文化財，必拍照點！從丸之內地下廣場搭電梯上1F即可抵達。',
            '🍱 **駅弁屋 祭**：中央通路有超過200種車站便當，建議發車前30分鐘來選購。',
            '🔄 **北自由通路**：想在「丸之內」與「八重洲」之間移動但不進站？請走「北自由通路」，這是免費的穿梭捷徑。',
            '🎨 **顏色辨識法**：迷路時看地板顏色——紅色系往丸之內（西），藍/綠色系往八重洲（東）。'
        ],
        l3Facilities: [
            // === 廁所 (Toilets) ===
            {
                type: 'toilet',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: '丸之內線 大手町方向驗票口外',
                    en: 'Outside Marunouchi Line Otemachi Gate',
                    ja: '丸ノ内線 大手町方面改札外'
                },
                attributes: { wheelchair: true, hasWashlet: true },
                source: 'https://www.tokyometro.jp/lang_tcn/station/tokyo/accessibility/'
            },
            {
                type: 'toilet',
                floor: 'JR 1F',
                operator: 'JR',
                location: {
                    zh: '丸之內南口改札內',
                    en: 'Inside Marunouchi South Gate',
                    ja: '丸の内南口改札内'
                },
                attributes: { wheelchair: true, hasWashlet: true },
                source: 'https://www.jreast.co.jp/estation/stations/1039.html'
            },
            {
                type: 'toilet',
                floor: 'JR 1F',
                operator: 'JR',
                location: {
                    zh: '八重洲北口改札外',
                    en: 'Outside Yaesu North Gate',
                    ja: '八重洲北口改札外'
                },
                attributes: { wheelchair: true, hasWashlet: true },
                source: 'https://www.jreast.co.jp/estation/stations/1039.html'
            },
            // === 置物櫃 (Lockers) ===
            {
                type: 'locker',
                floor: 'JR B1',
                operator: 'JR',
                location: {
                    zh: '丸之內地下改札外',
                    en: 'Outside Marunouchi Underground Gate',
                    ja: '丸の内地下改札外'
                },
                attributes: { count: 500, sizes: ['S', 'M', 'L', 'XL'], note: '最大置物櫃區' },
                source: 'https://www.jreast.co.jp/estation/stations/1039.html'
            },
            {
                type: 'locker',
                floor: 'JR B1',
                operator: 'JR',
                location: {
                    zh: '八重洲地下街',
                    en: 'Yaesu Underground Mall',
                    ja: '八重洲地下街'
                },
                attributes: { count: 800, sizes: ['S', 'M', 'L', 'XL', 'XXL'], note: '超大型行李可' },
                source: 'https://www.jreast.co.jp/estation/stations/1039.html'
            },
            {
                type: 'locker',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: '丸之內線改札外',
                    en: 'Outside Marunouchi Line Gate',
                    ja: '丸ノ内線改札外'
                },
                attributes: { count: 100, sizes: ['S', 'M', 'L'] }
            },
            // === 電梯 & 電扶梯 (Vertical Transport) ===
            {
                type: 'elevator',
                floor: 'JR 1F/3F',
                operator: 'JR',
                location: {
                    zh: '中央改札內 (直通月台)',
                    en: 'Inside Central Gate (to Platforms)',
                    ja: '中央改札内 (ホーム直結)'
                },
                attributes: { wheelchair: true, note: '優先電梯' }
            },
            {
                type: 'elevator',
                floor: 'JR 3F',
                operator: 'JR',
                location: {
                    zh: '公園改札內 (熊貓橋口)',
                    en: 'Inside Park Gate',
                    ja: '公園改札内'
                },
                attributes: { wheelchair: true }
            },
            {
                type: 'escalator',
                floor: 'JR 1F-3F',
                operator: 'JR',
                location: {
                    zh: '大連絡橋 (中央改札 ↔ 月台)',
                    en: 'Grand Concourse (Gate ↔ Platforms)',
                    ja: '大連絡橋 (改札 ↔ ホーム)'
                },
                attributes: { note: '雙向運行' }
            },
            {
                type: 'elevator',
                floor: 'Keisei 1F',
                operator: 'Private',
                location: {
                    zh: '京成上野 正面口 (往計程車/地鐵)',
                    en: 'Keisei Ueno Main Exit (to Taxi/Metro)',
                    ja: '京成上野 正面口 (タクシー/地下鉄方面)'
                },
                attributes: { wheelchair: true }
            },
            {
                type: 'escalator',
                floor: 'Keisei B1',
                operator: 'Private',
                location: {
                    zh: 'Skyliner 月台',
                    en: 'Skyliner Platform',
                    ja: 'スカイライナーホーム'
                },
                attributes: { note: '直達改札層' }
            },
            {
                type: 'elevator',
                floor: 'Metro GF',
                operator: 'Metro',
                location: {
                    zh: '日比谷線 地上電梯 (昭和通側)',
                    en: 'Hibiya Line Street Elevator (Showa-dori)',
                    ja: '日比谷線 地上行き (昭和通り)'
                },
                attributes: { wheelchair: true }
            },
            {
                type: 'escalator',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: '銀座線 ↔ JR 連通道',
                    en: 'Ginza Line ↔ JR Passage',
                    ja: '銀座線 ↔ JR 連絡通路'
                },
                attributes: { note: '轉乘推薦' }
            },
            {
                type: 'elevator',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: '銀座線月台 → JR方向驗票口',
                    en: 'Ginza Line Platform → JR Ticket Gate',
                    ja: '銀座線ホーム → JR方面改札'
                },
                attributes: { wheelchair: true },
                source: 'https://www.tokyometro.jp/lang_tcn/station/ueno/accessibility/'
            },
            {
                type: 'elevator',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: '丸之內線月台 → 驗票口',
                    en: 'Marunouchi Line Platform → Gate',
                    ja: '丸ノ内線ホーム → 改札'
                },
                attributes: { wheelchair: true },
                source: 'https://www.tokyometro.jp/lang_tcn/station/tokyo/accessibility/'
            },
            {
                type: 'elevator',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: '驗票口 → OAZO (1號出口)',
                    en: 'Gate → OAZO (Exit 1)',
                    ja: '改札 → OAZO（1番出口）'
                },
                attributes: { wheelchair: true, hours: '5:10-末班車' },
                source: 'https://www.tokyometro.jp/lang_tcn/station/tokyo/accessibility/'
            },
            {
                type: 'elevator',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: '驗票口 → 丸大樓方向專用出口',
                    en: 'Gate → Marunouchi Building Exit',
                    ja: '改札 → 丸ビル方面専用出口'
                },
                attributes: { wheelchair: true, hours: '首班車-24:00' },
                source: 'https://www.tokyometro.jp/lang_tcn/station/tokyo/accessibility/'
            },
            {
                type: 'elevator',
                floor: 'JR 1F',
                operator: 'JR',
                location: {
                    zh: '丸之內北口 → B1',
                    en: 'Marunouchi North Gate → B1',
                    ja: '丸の内北口 → B1'
                },
                attributes: { wheelchair: true },
                source: 'https://www.jreast.co.jp/estation/stations/1039.html'
            },
            {
                type: 'elevator',
                floor: 'JR B1-B5',
                operator: 'JR',
                location: {
                    zh: '八重洲南口 → 京葉線月台',
                    en: 'Yaesu South Gate → Keiyo Line Platform',
                    ja: '八重洲南口 → 京葉線ホーム'
                },
                attributes: { wheelchair: true, note: '直達京葉線 (迪士尼方向)' },
                source: 'https://www.jreast.co.jp/estation/stations/1039.html'
            },
            // === WiFi & 充電 ===
            {
                type: 'wifi',
                floor: 'JR 全層',
                operator: 'JR',
                location: {
                    zh: '改札內外全站',
                    en: 'Entire Station (Inside/Outside Gates)',
                    ja: '改札内外全駅'
                },
                attributes: { ssid: 'JR-EAST_FREE_WiFi', note: '需登錄' }
            },
            {
                type: 'wifi',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: '丸之內線改札內',
                    en: 'Inside Marunouchi Line Gate',
                    ja: '丸ノ内線改札内'
                },
                attributes: { ssid: 'METRO_FREE_WiFi', note: '限時30分' }
            },
            {
                type: 'charging',
                floor: 'JR 1F',
                operator: 'Private',
                location: {
                    zh: 'KITTE 1F',
                    en: 'KITTE 1F',
                    ja: 'KITTE 1F'
                },
                attributes: { note: 'Type-A, Type-C, USB 免費' }
            }
        ]
    },


    // Toei Asakusa Line Wisdom
    'odpt:Station:Toei.Asakusa.Oshiage': {
        traps: [
            {
                type: 'crowd',
                title: '🗼 晴空塔人潮 (Skytree Crowds)',
                content: '押上站是前往晴空塔的主要車站，假日與連假期間人潮非常洶湧。',
                advice: '💡 建議：若要前往晴空塔，請預留出站時間。回程若遇人潮管制，可考慮步行至鄰近車站搭乘。',
                severity: 'medium'
            }
        ],
        hacks: [
            '✈️ **直通成田**：此站直通京成線往成田機場，是個非常方便的轉運點。'
        ],
        l3Facilities: [
            {
                type: 'toilet',
                floor: 'B1',
                operator: 'Toei',
                location: {
                    zh: '改札內 (晴空塔方向)',
                    en: 'Inside Gate (Skytree Direction)',
                    ja: '改札内（スカイツリー方面）'
                },
                attributes: { wheelchair: true, hasWashlet: true },
                source: 'https://www.kotsu.metro.tokyo.jp/subway/stations/oshiage.html'
            },
            {
                type: 'toilet',
                floor: 'B1',
                operator: 'Toei',
                location: {
                    zh: '東京晴空塔城連通道',
                    en: 'Tokyo Skytree Town Passage',
                    ja: '東京スカイツリータウン連絡通路'
                },
                attributes: { wheelchair: true, hasWashlet: true, hasBabyRoom: true }
            },
            {
                type: 'locker',
                floor: 'B1',
                operator: 'Private',
                location: {
                    zh: '東京晴空塔城入口',
                    en: 'Tokyo Skytree Town Entrance',
                    ja: '東京スカイツリータウン入口'
                },
                attributes: { count: 200, sizes: ['S', 'M', 'L', 'XL'], note: '觀光客專用' }
            },
            {
                type: 'elevator',
                floor: 'B1',
                operator: 'Toei',
                location: {
                    zh: '改札 → 晴空塔城直結出口',
                    en: 'Gate → Skytree Town Direct Exit',
                    ja: '改札 → スカイツリータウン直結出口'
                },
                attributes: { wheelchair: true },
                source: 'https://www.kotsu.metro.tokyo.jp/subway/stations/oshiage.html'
            },
            {
                type: 'elevator',
                floor: 'B2',
                operator: 'Metro',
                location: {
                    zh: '半藏門線月台 → 改札',
                    en: 'Hanzomon Line Platform → Gate',
                    ja: '半蔵門線ホーム → 改札'
                },
                attributes: { wheelchair: true }
            },
            {
                type: 'wifi',
                floor: 'B1',
                operator: 'Toei',
                location: {
                    zh: '改札內全區',
                    en: 'Inside Gate Area',
                    ja: '改札内全域'
                },
                attributes: { ssid: 'Toei_Free_Wi-Fi', note: '限時30分' }
            }
        ]
    },
    'odpt:Station:Toei.Asakusa.Asakusa': {
        traps: [
            {
                type: 'exit',
                title: '🧳 電梯陷阱 (Elevator Trap)',
                content: '淺草站出口雖多，但直通地面的電梯 **只有一座**！',
                advice: '⚠️ 行動建議：攜帶大型行李的旅客，請務必尋找「駒形橋方面」的 **A2b 出口** 或 **1號出口** (雷門旁)，這是有電梯的出口。',
                severity: 'high'
            },
            {
                type: 'transfer',
                title: '🚧 四個淺草站混淆 (The 4 Asakusas)',
                content: '地鐵銀座線、都營淺草線、東武鐵道、筑波快線 (TX) 都有「淺草站」。',
                advice: '⚠️ 絕對注意：筑波快線的淺草站距離其他三站約 600 公尺（步行10分），轉乘極不方便，請勿安排在此站轉乘 TX。',
                severity: 'medium'
            }
        ],
        l3Facilities: [
            // === 廁所 (Toilets) ===
            {
                type: 'toilet',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: '銀座線 1號線月台終端',
                    en: 'Ginza Line Platform 1 End',
                    ja: '銀座線 1番線ホーム終端'
                },
                attributes: { wheelchair: true, hasWashlet: true },
                source: 'https://www.tokyometro.jp/lang_tcn/station/asakusa/accessibility/'
            },
            {
                type: 'toilet',
                floor: 'Toei B1',
                operator: 'Toei',
                location: {
                    zh: '都營淺草線 改札內',
                    en: 'Inside Toei Asakusa Line Gate',
                    ja: '都営浅草線 改札内'
                },
                attributes: { wheelchair: true, hasWashlet: true }
            },
            // === 置物櫃 (Lockers) ===
            {
                type: 'locker',
                floor: 'B1',
                operator: 'Metro',
                location: {
                    zh: '銀座線改札外 (雷門方向)',
                    en: 'Outside Ginza Line Gate (Kaminarimon Direction)',
                    ja: '銀座線改札外（雷門方面）'
                },
                attributes: { count: 80, sizes: ['S', 'M', 'L'] }
            },
            {
                type: 'locker',
                floor: '1F',
                operator: 'Private',
                location: {
                    zh: '淺草文化觀光中心前',
                    en: 'In front of Asakusa Culture Tourist Info Center',
                    ja: '浅草文化観光センター前'
                },
                attributes: { count: 150, sizes: ['S', 'M', 'L', 'XL'], note: '大型行李推薦' }
            },
            // === 電梯 (Elevators) ===
            {
                type: 'elevator',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: '淺草寺・雷門方向驗票口 → 1號出口',
                    en: 'Sensoji/Kaminarimon Gate → Exit 1',
                    ja: '浅草寺・雷門方面改札 → 1番出口'
                },
                attributes: { wheelchair: true },
                source: 'https://www.tokyometro.jp/lang_tcn/station/asakusa/accessibility/'
            },
            {
                type: 'elevator',
                floor: 'Toei B2',
                operator: 'Toei',
                location: {
                    zh: '都營淺草線 → A2b出口 (駒形橋方向)',
                    en: 'Toei Asakusa Line → Exit A2b (Komagata Bridge)',
                    ja: '都営浅草線 → A2b出口（駒形橋方面）'
                },
                attributes: { wheelchair: true, note: '唯一直達電梯' },
                source: 'https://www.kotsu.metro.tokyo.jp/subway/stations/asakusa.html'
            },
            // === WiFi ===
            {
                type: 'wifi',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: '銀座線改札內',
                    en: 'Inside Ginza Line Gate',
                    ja: '銀座線改札内'
                },
                attributes: { ssid: 'ASAKUSA_FREE_WiFi', note: '淺草觀光WiFi' }
            },
            {
                type: 'wifi',
                floor: 'Toei B2',
                operator: 'Toei',
                location: {
                    zh: '都營淺草線改札內',
                    en: 'Inside Toei Asakusa Line Gate',
                    ja: '都営浅草線改札内'
                },
                attributes: { ssid: 'Toei_Free_Wi-Fi' }
            }
        ]
    },
    'odpt:Station:Toei.Asakusa.Kuramae': {
        traps: [
            {
                type: 'transfer',
                title: '🚅 列車過站不停警示 (Skip Stop)',
                content: '注意！都營淺草線的「Airport快特 (Airport Kaitoku)」列車 **不會停靠** 藏前站。',
                advice: '🛑 能夠搭乘的車種：除了 Airport 快特以外的車種（普通、快速、特急等）皆可搭乘。若誤搭快特，請在下一站換車折返。',
                severity: 'high'
            },
            {
                type: 'transfer',
                title: '🔄 大江戶線轉乘陷阱 (Street Transfer)',
                content: '淺草線藏前站與大江戶線藏前站 **在站外轉乘**，需出站走一般道路約 300 公尺。',
                advice: '⚠️ 心理建設：這不是站內轉乘，請做好要走出戶外過馬路的準備。轉乘時間需抓 10-15 分鐘。',
                severity: 'medium'
            }
        ],
        l3Facilities: [
            {
                type: 'toilet',
                floor: 'Toei B1',
                operator: 'Toei',
                location: {
                    zh: '改札內',
                    en: 'Inside Ticket Gate',
                    ja: '改札内'
                },
                attributes: { wheelchair: true, hasWashlet: true },
                source: 'https://www.kotsu.metro.tokyo.jp/subway/stations/kuramae.html'
            },
            {
                type: 'elevator',
                floor: 'Toei B1',
                operator: 'Toei',
                location: {
                    zh: 'A2出口',
                    en: 'Exit A2',
                    ja: 'A2出口'
                },
                attributes: { wheelchair: true }
            },
            {
                type: 'wifi',
                floor: 'Toei B1',
                operator: 'Toei',
                location: {
                    zh: '改札內',
                    en: 'Inside Ticket Gate',
                    ja: '改札内'
                },
                attributes: { ssid: 'Toei_Free_Wi-Fi' }
            }
        ]
    },
    'odpt:Station:Toei.Asakusa.Asakusabashi': {
        traps: [
            {
                type: 'transfer',
                title: '🪜 轉乘陷阱 (Stair Master)',
                content: '雖然淺草橋站有 JR 總武線和都營淺草線，但兩者轉乘 **需要出站並走一段樓梯**，且電梯位置隱密。',
                advice: '⚠️ 心理建設：攜帶大件行李者，請務必尋找 A3 出口（有電梯），否則將面臨長長的樓梯挑戰。',
                severity: 'medium'
            }
        ],
        hacks: [
            '🧵 **手作天堂**：出站即是「江戶通」，滿街都是飾品材料、皮革、珠寶的批發店，價格甚至是市價的一半！',
            '🎎 **人形老舖**：此地也是著名的「久月」等人形娃娃專賣區。'
        ],
        l3Facilities: [
            {
                type: 'toilet',
                floor: 'Toei B1',
                operator: 'Toei',
                location: {
                    zh: '改札內',
                    en: 'Inside Ticket Gate',
                    ja: '改札内'
                },
                attributes: { wheelchair: true }
            },
            {
                type: 'locker',
                floor: 'B1',
                operator: 'Private',
                location: {
                    zh: 'A3出口附近',
                    en: 'Near Exit A3',
                    ja: 'A3出口付近'
                },
                attributes: { count: 50, sizes: ['S', 'M', 'L'] }
            },
            {
                type: 'elevator',
                floor: 'Toei B1',
                operator: 'Toei',
                location: {
                    zh: 'A3出口',
                    en: 'Exit A3',
                    ja: 'A3出口'
                },
                attributes: { wheelchair: true, note: '唯一電梯' }
            },
            {
                type: 'wifi',
                floor: 'Toei B1',
                operator: 'Toei',
                location: {
                    zh: '改札內',
                    en: 'Inside Ticket Gate',
                    ja: '改札内'
                },
                attributes: { ssid: 'Toei_Free_Wi-Fi' }
            }
        ]
    },
    'odpt:Station:TokyoMetro.Tawaramachi': {
        traps: [
            {
                type: 'exit',
                title: '🍳 合羽橋道具街陷阱 (Kitchen Street)',
                content: '想去合羽橋道具街？最近的出口是 3 號，但 **只有樓梯**。',
                advice: '⚠️ 行動建議：若有重物，請改走 2 號出口（有電梯），雖然要多過一個馬路，但省力很多。',
                severity: 'medium'
            }
        ],
        hacks: [
            '🍞 **知名麵包店**：著名的「Pelican」麵包店就在附近，需預約才買得到！'
        ],
        l3Facilities: [
            {
                type: 'toilet',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: '改札內',
                    en: 'Inside Ticket Gate',
                    ja: '改札内'
                },
                attributes: { wheelchair: true },
                source: 'https://www.tokyometro.jp/lang_tcn/station/tawaramachi/accessibility/'
            },
            {
                type: 'elevator',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: '2號出口',
                    en: 'Exit 2',
                    ja: '2番出口'
                },
                attributes: { wheelchair: true, note: '合羽橋方向推薦' }
            },
            {
                type: 'wifi',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: '改札內',
                    en: 'Inside Ticket Gate',
                    ja: '改札内'
                },
                attributes: { ssid: 'METRO_FREE_WiFi' }
            }
        ]
    },
    'odpt:Station:JR-East.Uguisudani': {
        traps: [
            {
                type: 'exit',
                title: '🎭 南北出口大不同 (North vs South)',
                content: '鶯谷站的北口與南口氛圍截然不同！北口是著名的「摩鐵街 (Love Hotel Hill)」，南口則是通往上野公園與博物館的文教區。',
                advice: '💡 若要去東京國立博物館，請務必走 **南口**，北口走出來會讓你懷疑人生（或非常尷尬）。',
                severity: 'high'
            }
        ],
        l3Facilities: [
            {
                type: 'toilet',
                floor: 'JR 1F',
                operator: 'JR',
                location: {
                    zh: '改札內',
                    en: 'Inside Ticket Gate',
                    ja: '改札内'
                },
                attributes: { wheelchair: true }
            },
            {
                type: 'elevator',
                floor: 'JR',
                operator: 'JR',
                location: {
                    zh: '月台 → 改札',
                    en: 'Platform → Gate',
                    ja: 'ホーム → 改札'
                },
                attributes: { wheelchair: true }
            },
            {
                type: 'wifi',
                floor: 'JR 1F',
                operator: 'JR',
                location: {
                    zh: '改札內',
                    en: 'Inside Ticket Gate',
                    ja: '改札内'
                },
                attributes: { ssid: 'JR-EAST_FREE_WiFi' }
            }
        ]
    },
    'odpt:Station:TokyoMetro.Yushima': {
        traps: [
            {
                type: 'exit',
                title: '⛩️ 湯島天滿宮捷徑 (Shrine Shortcut)',
                content: '要去湯島天滿宮（求學問的神社）？最近的是 3 號出口。',
                advice: '💡 若攜帶推車，3 號出口有電梯直達地面。',
                severity: 'medium'
            }
        ],
        hacks: [
            '🎓 **合格祈願**：步行 2 分鐘即達湯島天滿宮，考生必看。'
        ],
        l3Facilities: [
            {
                type: 'toilet',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: '天神下交差點方向驗票口外 (近1號出口)',
                    en: 'Outside Tenjinshita Intersection Gate (near Exit 1)',
                    ja: '天神下交差点方面改札外（1番出口付近）'
                },
                attributes: { wheelchair: true, hasWashlet: true, hasBabyRoom: true },
                source: 'https://www.tokyometro.jp/lang_tcn/station/yushima/accessibility/'
            },
            {
                type: 'locker',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: '天神下交差點方向驗票口外 (售票機旁)',
                    en: 'Outside Tenjinshita Gate (near ticket machines)',
                    ja: '天神下交差点方面改札外（券売機横）'
                },
                attributes: { sizes: ['S', 'M', 'L'] }
            },
            {
                type: 'locker',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: '驗票口內 (近月台電梯)',
                    en: 'Inside Gate (near platform elevator)',
                    ja: '改札内（ホームエレベーター付近）'
                },
                attributes: { sizes: ['S', 'M', 'L'] }
            },
            {
                type: 'elevator',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: '3號出口',
                    en: 'Exit 3',
                    ja: '3番出口'
                },
                attributes: { wheelchair: true, note: '地面直達' }
            },
            {
                type: 'elevator',
                floor: 'Metro B2',
                operator: 'Metro',
                location: {
                    zh: '月台 → 驗票口',
                    en: 'Platform → Gate',
                    ja: 'ホーム → 改札'
                },
                attributes: { wheelchair: true }
            },
            {
                type: 'wifi',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: '全站',
                    en: 'Entire Station',
                    ja: '全駅'
                },
                attributes: { ssid: 'METRO_FREE_WiFi' }
            }
        ]
    },
    'odpt:Station:TokyoMetro.Minowa': {
        traps: [
            {
                type: 'transfer',
                title: '🚋 都電荒川線轉乘 (Tram Transfer)',
                content: '三之輪站可轉乘都電荒川線（三之輪橋站），但需步行約 5 分鐘。',
                advice: '⚠️ 心理建設：這不是站內轉乘，需走出地面通過商店街。',
                severity: 'medium'
            }
        ],
        l3Facilities: [
            {
                type: 'toilet',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: '三之輪交差點方向驗票口內',
                    en: 'Inside Minowa Intersection Gate',
                    ja: '三ノ輪交差点方面改札内'
                },
                attributes: { wheelchair: true, hasBabyRoom: true },
                source: 'https://www.tokyometro.jp/lang_tcn/station/minowa/accessibility/'
            },
            {
                type: 'toilet',
                floor: 'GF',
                operator: 'Metro',
                location: {
                    zh: '地面 Exit 3 附近 (入谷改札側)',
                    en: 'Near Ground Exit 3 (Iriya Gate Side)',
                    ja: '地上3番出口付近（入谷改札側）'
                },
                attributes: { wheelchair: true, hasWashlet: true }
            },
            {
                type: 'locker',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: '三之輪交差點方向驗票口外 (近1b出口)',
                    en: 'Outside Minowa Gate (near Exit 1b)',
                    ja: '三ノ輪交差点方面改札外（1b出口付近）'
                },
                attributes: { sizes: ['S', 'M'] }
            },
            {
                type: 'elevator',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: '1b出口',
                    en: 'Exit 1b',
                    ja: '1b出口'
                },
                attributes: { wheelchair: true, note: '地面直達' }
            },
            {
                type: 'elevator',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: '月台 → 驗票口',
                    en: 'Platform → Gate',
                    ja: 'ホーム → 改札'
                },
                attributes: { wheelchair: true }
            },
            {
                type: 'wifi',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: '全站',
                    en: 'Entire Station',
                    ja: '全駅'
                },
                attributes: { ssid: 'METRO_FREE_WiFi' }
            }
        ]
    },
    'odpt:Station:TokyoMetro.Inaricho': {
        traps: [
            {
                type: 'transfer',
                title: '⛔ 兩側月台不互通 (Direction Trap)',
                content: '稻荷町站的 1 號及 2 號月台在地下並不相通！',
                advice: '⚠️ 絕對守則：進站前請確認方向。往澀谷請走 1 號出口，往淺草請走 2 號出口或電梯專用口。若走錯需出站過馬路。',
                severity: 'high'
            }
        ],
        hacks: [
            '🍜 **美食巷弄**：附近有許多平價且高品質的拉麵與沾麵店，是避開上野人潮的好選擇。'
        ],
        l3Facilities: [
            {
                type: 'toilet',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: '1號月台 (往澀谷) 中央區',
                    en: 'Platform 1 (to Shibuya) Central Area',
                    ja: '1番線ホーム（渋谷方面）中央'
                },
                attributes: { wheelchair: true, hasWashlet: true },
                source: 'https://www.tokyometro.jp/lang_tcn/station/inaricho/accessibility/'
            },
            {
                type: 'toilet',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: '2號月台 (往淺草) 驗票口附近',
                    en: 'Platform 2 (to Asakusa) Near Gate',
                    ja: '2番線ホーム（浅草方面）改札付近'
                },
                attributes: { wheelchair: true, hasWashlet: true }
            },
            {
                type: 'elevator',
                floor: 'GF',
                operator: 'Metro',
                location: {
                    zh: '1號出口',
                    en: 'Exit 1',
                    ja: '1番出口'
                },
                attributes: { wheelchair: true, note: '1號月台直達' }
            },
            {
                type: 'elevator',
                floor: 'GF',
                operator: 'Metro',
                location: {
                    zh: '電梯專用出口',
                    en: 'Elevator-Only Exit',
                    ja: 'エレベーター専用出口'
                },
                attributes: { wheelchair: true, note: '2號月台直達' }
            },
            {
                type: 'wifi',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: '全站',
                    en: 'Entire Station',
                    ja: '全駅'
                },
                attributes: { ssid: 'METRO_FREE_WiFi' }
            }
        ]
    },
    'odpt:Station:Toei.ShinOkachimachi': {
        traps: [
            {
                type: 'transfer',
                title: '🚀 TX 轉乘樞紐 (TX Transfer)',
                content: '此站是都營大江戶線與 Tsukuba Express (TX) 的重要轉乘站，兩線共用 B1 穿堂層。',
                advice: '💡 提示：雖然共用層，但轉乘仍需經過轉乘專用閘門，Suica/Pasmo 餘額請充足。',
                severity: 'medium'
            }
        ],
        hacks: [
            '🛍️ **佐竹商店街**：日本第二古老的商店街，氛圍非常復古且有許多平價美食。'
        ],
        l3Facilities: [
            {
                type: 'toilet',
                floor: 'Toei B1',
                operator: 'Toei',
                location: {
                    zh: '改札內',
                    en: 'Inside Ticket Gate',
                    ja: '改札内'
                },
                attributes: { wheelchair: true, hasWashlet: true, hasBabyRoom: true },
                source: 'https://www.kotsu.metro.tokyo.jp/subway/stations/shin-okachimachi.html'
            },
            {
                type: 'locker',
                floor: 'Toei B1',
                operator: 'Toei',
                location: {
                    zh: '改札外穿堂中央',
                    en: 'Central Concourse Outside Gate',
                    ja: '改札外コンコース中央'
                },
                attributes: { sizes: ['S', 'M', 'L'] }
            },
            {
                type: 'elevator',
                floor: 'Toei B1',
                operator: 'Toei',
                location: {
                    zh: 'A1, A3, A4出口',
                    en: 'Exits A1, A3, A4',
                    ja: 'A1・A3・A4出口'
                },
                attributes: { wheelchair: true }
            },
            {
                type: 'elevator',
                floor: 'Toei B3',
                operator: 'Toei',
                location: {
                    zh: '月台 → 改札',
                    en: 'Platform → Gate',
                    ja: 'ホーム → 改札'
                },
                attributes: { wheelchair: true }
            },
            {
                type: 'wifi',
                floor: 'Toei B1',
                operator: 'Toei',
                location: {
                    zh: '全站',
                    en: 'Entire Station',
                    ja: '全駅'
                },
                attributes: { ssid: 'Toei_Free_Wi-Fi' }
            }
        ]
    },
    'odpt:Station:Toei.UenoOkachimachi': {
        traps: [
            {
                type: 'transfer',
                title: '🚉 四線交會迷宮 (Quad-Line Maze)',
                content: '此站地下連通上野廣小路 (銀座線)、仲御徒町 (日比谷線) 及 JR 御徒町站，範圍非常大。',
                advice: '⚠️ 心理建設：轉乘雖然在地下，但移動距離可能超過 300 公尺，請預留 5-8 分鐘。',
                severity: 'medium'
            }
        ],
        hacks: [
            '🌧️ **雨天捷徑**：利用這條超長地下走廊，可以從上野站一路走到御徒町站而不淋雨。'
        ],
        l3Facilities: [
            {
                type: 'toilet',
                floor: 'Toei B1',
                operator: 'Toei',
                location: {
                    zh: '改札內 (大江戶線側)',
                    en: 'Inside Gate (Oedo Line Side)',
                    ja: '改札内（大江戸線側）'
                },
                attributes: { wheelchair: true, hasWashlet: true, hasBabyRoom: true },
                source: 'https://www.kotsu.metro.tokyo.jp/subway/stations/ueno-okachimachi.html'
            },
            {
                type: 'locker',
                floor: 'Toei B1',
                operator: 'Toei',
                location: {
                    zh: '改札外 A6/A7出口附近及往銀座線連通道',
                    en: 'Outside Gate near A6/A7 Exits & Ginza Line Passage',
                    ja: '改札外 A6・A7出口付近・銀座線連絡通路'
                },
                attributes: { sizes: ['S', 'M', 'L'] }
            },
            {
                type: 'elevator',
                floor: 'Toei B1',
                operator: 'Toei',
                location: {
                    zh: 'A6出口',
                    en: 'Exit A6',
                    ja: 'A6出口'
                },
                attributes: { wheelchair: true }
            },
            {
                type: 'elevator',
                floor: 'Toei B2',
                operator: 'Toei',
                location: {
                    zh: '月台 → 改札',
                    en: 'Platform → Gate',
                    ja: 'ホーム → 改札'
                },
                attributes: { wheelchair: true }
            },
            {
                type: 'wifi',
                floor: 'Toei B1',
                operator: 'Toei',
                location: {
                    zh: '全站',
                    en: 'Entire Station',
                    ja: '全駅'
                },
                attributes: { ssid: 'Toei_Free_Wi-Fi' }
            }
        ]
    },
    'odpt:Station:JR-East.Okachimachi': {
        traps: [],
        hacks: [
            '🐟 **阿美橫町尾端**：這裡是阿美橫町的另一端，相較於上野站的擁擠，從御徒町進入通常人潮稍少一點，且海鮮丼名店多集中在此側。',
            '💎 **珠寶批發**：車站周邊是日本最大的珠寶飾品批發區。'
        ],
        l3Facilities: [
            {
                type: 'toilet',
                floor: 'JR 1F',
                operator: 'JR',
                location: {
                    zh: '改札內',
                    en: 'Inside Ticket Gate',
                    ja: '改札内'
                },
                attributes: { wheelchair: true }
            },
            {
                type: 'locker',
                floor: 'JR 1F',
                operator: 'JR',
                location: {
                    zh: '北口改札外',
                    en: 'Outside North Gate',
                    ja: '北口改札外'
                },
                attributes: { count: 100, sizes: ['S', 'M', 'L'] }
            },
            {
                type: 'elevator',
                floor: 'JR',
                operator: 'JR',
                location: {
                    zh: '月台 → 改札',
                    en: 'Platform → Gate',
                    ja: 'ホーム → 改札'
                },
                attributes: { wheelchair: true }
            },
            {
                type: 'wifi',
                floor: 'JR 1F',
                operator: 'JR',
                location: {
                    zh: '改札內',
                    en: 'Inside Ticket Gate',
                    ja: '改札内'
                },
                attributes: { ssid: 'JR-EAST_FREE_WiFi' }
            }
        ]
    },
    'odpt:Station:TokyoMetro.Iriya': {
        traps: [],
        hacks: [
            '👻 **鬼子母神**：每年七月的「朝顏市（牽牛花市）」非常熱鬧。',
            '🍲 **老舖天丼**：附近有許多百年老店，價格比淺草親民許多。'
        ],
        l3Facilities: [
            {
                type: 'toilet',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: '改札內',
                    en: 'Inside Ticket Gate',
                    ja: '改札内'
                },
                attributes: { wheelchair: true },
                source: 'https://www.tokyometro.jp/lang_tcn/station/iriya/accessibility/'
            },
            {
                type: 'elevator',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: '1號出口',
                    en: 'Exit 1',
                    ja: '1番出口'
                },
                attributes: { wheelchair: true }
            },
            {
                type: 'wifi',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: '改札內',
                    en: 'Inside Ticket Gate',
                    ja: '改札内'
                },
                attributes: { ssid: 'METRO_FREE_WiFi' }
            }
        ]
    },
    'odpt:Station:TokyoMetro.Kasumigaseki': {
        traps: [
            {
                type: 'exit',
                title: '🏛️ 政府機關迷宮 (Government Maze)',
                content: '霞關站是日本政府機關的中心，出口眾多且複雜，容易迷失方向。',
                advice: '⚠️ 絕對守則：請務必確認要前往的政府機關或目的地，並記住對應的出口編號。',
                severity: 'medium'
            }
        ],
        hacks: [
            '🍽️ **地下食堂探險**：部分政府機關大樓開放民眾進入使用地下食堂，價格實惠且份量十足，是午餐的好選擇。',
        ],
        l3Facilities: [
            // === 廁所 (Toilets) ===
            {
                type: 'toilet',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: '日比谷線 虎之門方向驗票口內',
                    en: 'Inside Hibiya Line Toranomon Gate',
                    ja: '日比谷線 虎ノ門方面改札内'
                },
                attributes: { wheelchair: true, hasWashlet: true },
                source: 'https://www.tokyometro.jp/lang_tcn/station/kasumigaseki/accessibility/'
            },
            {
                type: 'toilet',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: '丸之內線 驗票口內',
                    en: 'Inside Marunouchi Line Gate',
                    ja: '丸ノ内線 改札内'
                },
                attributes: { wheelchair: true, hasWashlet: true, hasBabyRoom: true }
            },
            // === 置物櫃 (Lockers) ===
            {
                type: 'locker',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: '內幸町方面改札外 (出口C1-C4方向)',
                    en: 'Outside Uchisaiwaicho Gate (Exits C1-C4)',
                    ja: '内幸町方面改札外（C1-C4出口方面）'
                },
                attributes: { count: 40, sizes: ['S', 'M', 'L'] },
                source: 'https://coinlocker.click/kasumigaseki-station.php'
            },
            {
                type: 'locker',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: '虎ノ門方面改札外',
                    en: 'Outside Toranomon Gate',
                    ja: '虎ノ門方面改札外'
                },
                attributes: { count: 20, sizes: ['S', 'M', 'L'] }
            },
            // === 電梯 (Elevators) ===
            {
                type: 'elevator',
                floor: 'Metro GF',
                operator: 'Metro',
                location: {
                    zh: 'A2a出口',
                    en: 'Exit A2a',
                    ja: 'A2a出口'
                },
                attributes: { wheelchair: true, note: '近法務省' }
            },
            {
                type: 'elevator',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: '日比谷線月台 → 驗票口',
                    en: 'Hibiya Line Platform → Gate',
                    ja: '日比谷線ホーム → 改札'
                },
                attributes: { wheelchair: true }
            },
            // === WiFi ===
            {
                type: 'wifi',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: '改札內',
                    en: 'Inside Ticket Gate',
                    ja: '改札内'
                },
                attributes: { ssid: 'METRO_FREE_WiFi' }
            }
        ]
    },
    'odpt:Station:TokyoMetro.Iidabashi': {
        traps: [
            {
                type: 'transfer',
                title: '🎢 五線交匯長廊 (Five-Line Corridor)',
                content: '飯田橋站匯集了東西線、有楽町線、南北線、大江戶線與 JR，轉乘路徑極長。',
                advice: '⚠️ 注意：東西線與其他線路轉乘需步行 5-10 分鐘，請務必跟隨地面顏色指引指標。',
                severity: 'high'
            }
        ],
        hacks: [
            '⛩️ **東京大神宮**：從西口出站步行約 5 分鐘，是東京最具代表性的戀愛結緣神社。',
            '🚢 **Canal Cafe**：位於神田川邊的景觀咖啡廳，特別是櫻花季時美不勝收。'
        ],
        l3Facilities: [
            // === 廁所 (Toilets) ===
            {
                type: 'toilet',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: '有樂町線・南北線 驗票口內 (近中央改札)',
                    en: 'Inside Yurakucho/Namboku Line Gate (near Central)',
                    ja: '有楽町線・南北線 改札内（中央改札付近）'
                },
                attributes: { wheelchair: true, hasWashlet: true },
                source: 'https://www.tokyometro.jp/lang_tcn/station/iidabashi/accessibility/'
            },
            {
                type: 'toilet',
                floor: 'JR 1F',
                operator: 'JR',
                location: {
                    zh: '西口改札內',
                    en: 'Inside West Gate',
                    ja: '西口改札内'
                },
                attributes: { wheelchair: true },
                source: 'https://www.jreast.co.jp/estation/stations/113.html'
            },
            {
                type: 'toilet',
                floor: 'Toei B3',
                operator: 'Toei',
                location: {
                    zh: '大江戶線月台層',
                    en: 'Oedo Line Platform Level',
                    ja: '大江戸線ホーム階'
                },
                attributes: { wheelchair: true, hasWashlet: true },
                source: 'https://www.kotsu.metro.tokyo.jp/subway/stations/iidabashi.html'
            },
            // === 置物櫃 (Lockers) ===
            {
                type: 'locker',
                floor: 'JR 1F',
                operator: 'JR',
                location: {
                    zh: '東口改札外',
                    en: 'Outside East Gate',
                    ja: '東口改札外'
                },
                attributes: { count: 32, sizes: ['S', 'M', 'L'] },
                source: 'https://coinlocker.click/iidabashi-station.php'
            },
            {
                type: 'locker',
                floor: 'Toei B1',
                operator: 'Toei',
                location: {
                    zh: '後樂方面改札外 (電梯旁)',
                    en: 'Outside Korakuen Gate (near elevator)',
                    ja: '後楽園方面改札外（エレベーター横）'
                },
                attributes: { count: 20, sizes: ['S', 'M'] }
            },
            // === 電梯 (Elevators) ===
            {
                type: 'elevator',
                floor: 'JR 1F',
                operator: 'JR',
                location: {
                    zh: '西口 → 各月台',
                    en: 'West Gate → All Platforms',
                    ja: '西口 → 各ホーム'
                },
                attributes: { wheelchair: true }
            },
            {
                type: 'elevator',
                floor: 'Metro B1',
                operator: 'Metro',
                location: {
                    zh: 'B2b出口 (RAMLA直結)',
                    en: 'Exit B2b (Direct to RAMLA)',
                    ja: 'B2b出口（ラムラ直結）'
                },
                attributes: { wheelchair: true }
            },
            // === WiFi ===
            {
                type: 'wifi',
                floor: 'Metro/Toei',
                operator: 'Metro',
                location: {
                    zh: '改札內',
                    en: 'Inside Ticket Gate',
                    ja: '改札内'
                },
                attributes: { ssid: 'METRO_FREE_WiFi' }
            }
        ]
    },
    // === New Taito Stations ===
    'odpt:Station:TokyoMetro.UenoHirokoji': {
        traps: [],
        hacks: [
            '🏬 **松坂屋直結**：與老牌百貨松坂屋地下直連，下雨天逛街購物非常方便。',
            '🐼 **熊貓廣場**：出站即是上野御徒町的熊貓廣場，常有市集活動。'
        ],
        l3Facilities: [
            { type: 'toilet', floor: 'Metro B1', operator: 'Metro', location: '上野公園方面改札內', attributes: { wheelchair: true, hasWashlet: true }, source: 'https://www.tokyometro.jp/lang_tcn/station/ueno-hirokoji/accessibility/' },
            { type: 'locker', floor: 'Metro B1', operator: 'Metro', location: '大江戶線轉乘通道', attributes: { sizes: ['S', 'M'] } },
            { type: 'elevator', floor: 'Metro GF', operator: 'Metro', location: 'A3出口 (松坂屋)', attributes: { wheelchair: true } },
            { type: 'wifi', floor: 'Metro B1', operator: 'Metro', location: '改札內', attributes: { ssid: 'METRO_FREE_WiFi' } }
        ]
    },
    'odpt:Station:TokyoMetro.NakaOkachimachi': {
        traps: [
            {
                type: 'transfer',
                title: '💜 紫色大迷宮 (Purple Connection)',
                content: '日比谷線仲御徒町站位於整個御徒町地下連通網的最東端。',
                advice: '⚠️ 注意：若要轉乘大江戶線，需走過長長的地下商店街。',
                severity: 'medium'
            }
        ],
        hacks: [
            '🛍️ **多慶屋**：出口旁就是著名的紫色大樓「多慶屋」，零食藥妝批發價。'
        ],
        l3Facilities: [
            { type: 'toilet', floor: 'Metro B1', operator: 'Metro', location: '改札內', attributes: { wheelchair: true } },
            { type: 'locker', floor: 'Metro B1', operator: 'Metro', location: '3號出口附近', attributes: { sizes: ['S', 'M', 'L'] } },
            { type: 'elevator', floor: 'Metro GF', operator: 'Metro', location: '3號出口', attributes: { wheelchair: true } },
            { type: 'wifi', floor: 'Metro B1', operator: 'Metro', location: '改札內', attributes: { ssid: 'METRO_FREE_WiFi' } }
        ]
    },
    // === Chiyoda Ward ===
    'odpt:Station:TokyoMetro.Otemachi': {
        traps: [
            {
                type: 'transfer',
                title: '🌀 東京最大迷宮 (The Labyrinth)',
                content: '大手町站共有 5 條路線交會，是東京地下鐵最大的迷宮。從千代田線走到東西線可能需要 15 分鐘。',
                advice: '⚠️ 絕對守則：請務必看著頭頂的顏色指標前進，絕對不要憑感覺走。丸之內線(紅)、東西線(藍)、千代田線(綠)、半藏門線(紫)、三田線(深藍)。',
                severity: 'critical'
            }
        ],
        hacks: [
            '🍱 **Otemachi One**：C4/C5 出口直結的新大樓，B1 有許多高檔但平價的便當店，適合商務午餐。',
            '🌲 **皇居東御苑**：C13b 出口出來就是皇居的大手門，是離皇居最近的入口。'
        ],
        l3Facilities: [
            { type: 'toilet', floor: 'Metro B2', operator: 'Metro', location: '丸之內線 改札內', attributes: { wheelchair: true, hasWashlet: true }, source: 'https://www.tokyometro.jp/lang_tcn/station/otemachi/accessibility/' },
            { type: 'toilet', floor: 'Metro B2', operator: 'Metro', location: '東西線 中央改札內', attributes: { wheelchair: true, hasWashlet: true, hasBabyRoom: true } },
            { type: 'toilet', floor: 'Metro B2', operator: 'Metro', location: '千代田線 往綾瀨方向月台', attributes: { wheelchair: true, hasWashlet: true } },
            { type: 'elevator', floor: 'Metro GF', operator: 'Metro', location: 'A5 出口 (丸之內線側)', attributes: { wheelchair: true, note: '近產經大樓' } },
            { type: 'elevator', floor: 'Metro GF', operator: 'Metro', location: 'B2c 出口 (東西線側)', attributes: { wheelchair: true, note: '近丸之內OAZO' } },
            { type: 'elevator', floor: 'Metro GF', operator: 'Metro', location: 'C14 出口 (千代田線側)', attributes: { wheelchair: true, note: '近讀賣新聞' } },
            { type: 'locker', floor: 'Metro B1', operator: 'Metro', location: '東西線 東改札外', attributes: { count: 80, sizes: ['S', 'M', 'L'] } },
            { type: 'locker', floor: 'Metro B2', operator: 'Metro', location: '千代田線 神保町方面改札外', attributes: { count: 60, sizes: ['S', 'M'] } },
            { type: 'wifi', floor: 'Metro 全站', operator: 'Metro', location: '改札內', attributes: { ssid: 'METRO_FREE_WiFi' } }
        ]
    },
    'odpt:Station:JR-East.Akihabara': {
        traps: [
            {
                type: 'transfer',
                title: '🔄 總武線空中轉乘 (Sky High Sobu)',
                content: '總武線月台位於 6 樓，山手線/京濱東北線位於 2 樓。轉乘時需搭乘極長的電扶梯。',
                advice: '⚠️ 注意：人潮眾多時電扶梯會大排長龍，轉乘請預留 5-8 分鐘。',
                severity: 'medium'
            },
            {
                type: 'exit',
                title: '⚡ 電器街 vs 昭和通 (West vs East)',
                content: '秋葉原站被 JR 線路切分為二，西側是「電器街/動漫區」，東側是「Yodobashi Camera/日比谷線」。',
                advice: '⚠️ 注意：若走錯邊要繞一大圈。請記住：看動漫走「電器街口」，買家電走「中央改札」或「昭和通口」。',
                severity: 'medium'
            },
            {
                type: 'transfer',
                title: '🚇 日比谷線轉乘地雷 (Hibiya Trap)',
                content: '日比谷線月台位於車站極東側，距離電器街核心區較遠。',
                advice: '⚠️ 建議：若搭日比谷線要去電器街，請走「3號出口」，或利用 JR 中央改札旁的「東西自由通路」穿越。',
                severity: 'medium'
            }
        ],
        hacks: [
            '🛍️ **Yodobashi Akiba**：昭和通口直結，全日本最大的電器百貨，B1-8F 應有盡有。',
            '🥛 **牛奶小站**：總武線月台上有專賣日本各地玻璃瓶牛奶的販賣部，非常受歡迎。',
            '🌉 **東西自由通路**：這是唯一不需進站即可穿越車站東西兩側的捷徑，位於中央改札口旁。',
            '🚶 **末廣町捷徑**：若要去電器街北側（女僕店、唐吉訶德），搭銀座線到「末廣町站」其實比秋葉原站更近。'
        ],
        l3Facilities: [
            { type: 'toilet', floor: 'JR 1F', operator: 'JR', location: '電氣街口 改札內', attributes: { wheelchair: true, hasWashlet: true, note: '含人工肛門友善設施' }, source: 'https://www.jreast.co.jp/estation/stations/41.html' },
            { type: 'toilet', floor: 'JR 1F', operator: 'JR', location: '中央改札內', attributes: { wheelchair: true } },
            { type: 'locker', floor: 'JR 1F', operator: 'JR', location: '中央改札內', attributes: { count: 180, sizes: ['S', 'M', 'L', 'XL'] } },
            { type: 'locker', floor: 'JR 1F', operator: 'JR', location: '電氣街口改札外', attributes: { count: 100, sizes: ['S', 'M', 'L'] } },
            { type: 'elevator', floor: 'JR', operator: 'JR', location: '各月台 ⇄ 改札層', attributes: { wheelchair: true } },
            { type: 'wifi', floor: 'JR', operator: 'JR', location: '改札內', attributes: { ssid: 'JR-EAST_FREE_WiFi' } }
        ]
    },
    'odpt:Station:TokyoMetro.Akihabara': {
        traps: [],
        hacks: [
            '🌊 **神田川穿越**：日比谷線秋葉原站位於神田川下方，因此位置較深。'
        ],
        l3Facilities: [
            { type: 'toilet', floor: 'Metro B1', operator: 'Metro', location: '站務室旁 (改札外)', attributes: { wheelchair: true, hasWashlet: true, hasBabyRoom: true }, source: 'https://www.tokyometro.jp/lang_tcn/station/akihabara/accessibility/' },
            { type: 'elevator', floor: 'Metro GF', operator: 'Metro', location: '3號出口 (昭和通口)', attributes: { wheelchair: true } },
            { type: 'locker', floor: 'Metro B1', operator: 'Metro', location: '岩本町方面改札外', attributes: { count: 40, sizes: ['S', 'M'] } },
            { type: 'wifi', floor: 'Metro B1', operator: 'Metro', location: '改札內', attributes: { ssid: 'METRO_FREE_WiFi' } }
        ]
    },
    'odpt:Station:TokyoMetro.Shimbashi': {
        traps: [
            {
                type: 'transfer',
                title: '🚂 轉乘大迷宮 (Transfer Maze)',
                content: '新橋站連結了 JR、銀座線、淺草線與百合海鷗號，且各站體相對獨立。',
                advice: '⚠️ 建議：從淺草線轉乘銀座線需步行約 5-8 分鐘，請務必沿著黃色地面顏色標示前進。',
                severity: 'high'
            }
        ],
        hacks: [
            '🍺 **SL 廣場**：西口站前的蒸汽火車頭是典型的集合點，周邊有全東京最密集的平價居酒屋。',
            '🏙️ **汐留通路**：前往汐留方向可以走地下空調通道「Sio-Site」，夏天不怕熱。'
        ],
        l3Facilities: [
            { type: 'toilet', floor: 'Metro B1', operator: 'Metro', location: '銀座線 驗票口內 (近 JR 轉乘口)', attributes: { wheelchair: true, hasWashlet: true }, source: 'https://www.tokyometro.jp/lang_tcn/station/shimbashi/accessibility/' },
            { type: 'toilet', floor: 'Toei B1', operator: 'Toei', location: '淺草線 A3 出口附近改札外', attributes: { wheelchair: true, hasWashlet: true, hasBabyRoom: true }, source: 'https://www.kotsu.metro.tokyo.jp/subway/stations/shimbashi.html' },
            { type: 'locker', floor: 'Metro B1', operator: 'Metro', location: '銀座線 1, 2 號出口方向通路', attributes: { count: 40, sizes: ['S', 'M', 'L'] } },
            { type: 'locker', floor: 'JR 1F', operator: 'JR', location: '汐留改札外', attributes: { count: 60, sizes: ['S', 'M', 'L', 'XL'] } },
            { type: 'elevator', floor: 'Metro GF', operator: 'Metro', location: '8 號出口 (近銀座側)', attributes: { wheelchair: true } },
            { type: 'wifi', floor: 'Metro/Toei', operator: 'Metro', location: '全站', attributes: { ssid: 'METRO_FREE_WiFi' } }
        ]
    },
    'odpt:Station:TokyoMetro.Roppongi': {
        traps: [
            {
                type: 'depth',
                title: '🗻 全日本最深月台 (Japan\'s Deepest)',
                content: '都營大江戶線月台高達地下 7 層（約 42 公尺），光是搭電扶梯就要 5 分鐘。',
                advice: '⚠️ 注意：趕時間的人請儘量利用日比谷線，或預留充足的垂直移動時間。',
                severity: 'critical'
            }
        ],
        hacks: [
            '🏢 **ヒルズ與ミッドタウン**：兩個大開發區分別位於不同出口，ヒルズ走 1c 出口，ミッドタウン走 8 號出口。',
            '🖼️ **藝術三角**：車站周邊環繞著森美術館、國立新美術館與三得利美術館，文化氛圍濃厚。'
        ],
        l3Facilities: [
            { type: 'toilet', floor: 'Metro B1', operator: 'Metro', location: '西麻布方面驗票口內', attributes: { wheelchair: true, hasWashlet: true }, source: 'https://www.tokyometro.jp/lang_tcn/station/roppongi/accessibility/' },
            { type: 'toilet', floor: 'Toei B1', operator: 'Toei', location: '大江戶線 驗票口內', attributes: { wheelchair: true, hasWashlet: true, hasBabyRoom: true } },
            { type: 'locker', floor: 'Metro B1', operator: 'Metro', location: '1c 出口方向通路', attributes: { count: 30, sizes: ['S', 'M', 'L'] } },
            { type: 'locker', floor: 'Toei B1', operator: 'Toei', location: '東京ミッドタウン連絡路附近', attributes: { count: 50, sizes: ['S', 'M', 'L'] } },
            { type: 'elevator', floor: 'Metro GF', operator: 'Metro', location: '1c 出口 (六本木 Hills 直結)', attributes: { wheelchair: true } },
            { type: 'wifi', floor: 'Metro/Toei', operator: 'Metro', location: '全站', attributes: { ssid: 'METRO_FREE_WiFi' } }
        ]
    },
    'odpt:Station:Toei.Daimon': {
        traps: [],
        hacks: [
            '🛬 **機場玄關**：轉乘單軌電車前往羽田機場非常方便，是大門/濱松町的核心角色。',
            '🗼 **增上寺首選**：從 B1 出口步行 5 分鐘即可抵達東京塔腳下的壯觀佛寺。'
        ],
        l3Facilities: [
            { type: 'toilet', floor: 'Toei B1', operator: 'Toei', location: '淺草線/大江戶線 轉乘口內', attributes: { wheelchair: true, hasWashlet: true }, source: 'https://www.kotsu.metro.tokyo.jp/subway/stations/daimon.html' },
            { type: 'locker', floor: 'Toei B1', operator: 'Toei', location: 'A2 出口手前通路', attributes: { count: 20, sizes: ['S', 'M'] } },
            { type: 'elevator', floor: 'Toei GF', operator: 'Toei', location: 'A2 出口電梯', attributes: { wheelchair: true } },
            { type: 'wifi', floor: 'Toei', operator: 'Toei', location: '全站', attributes: { ssid: 'Toei_Free_Wi-Fi' } }
        ]
    },
    'odpt:Station:JR-East.Hamamatsucho': {
        traps: [
            {
                type: 'transfer',
                title: '🚝 單軌轉乘提示 (Monorail Transfer)',
                content: 'JR 與單軌電車轉乘時，南口與北口的功能不同。',
                advice: '⚠️ 建議：大行李者請使用南口轉乘，有無障礙專屬動線。',
                severity: 'medium'
            }
        ],
        hacks: [
            '🚶 **竹芝平臺**：從北口可以走步行平臺直達竹芝碼頭，欣賞海邊景色。'
        ],
        l3Facilities: [
            { type: 'toilet', floor: 'JR 1F', operator: 'JR', location: '南口改札內 廁所旁', attributes: { wheelchair: true }, source: 'https://www.jreast.co.jp/estation/stations/1251.html' },
            { type: 'locker', floor: 'JR 3F', operator: 'JR', location: '南口改札外正面', attributes: { count: 100, sizes: ['S', 'M', 'L', 'XL'] } },
            { type: 'elevator', floor: 'JR GF', operator: 'JR', location: '北口出口旁', attributes: { wheelchair: true } },
            { type: 'wifi', floor: 'JR', operator: 'JR', location: '全站', attributes: { ssid: 'JR-EAST_FREE_WiFi' } }
        ]
    },
    'odpt:Station:TokyoMetro.Omotesando': {
        traps: [
            {
                type: 'transfer',
                title: '🎨 跨月台便利轉乘 (Cross-platform Transfer)',
                content: '銀座線與半藏門線在表參道站是共享月台的，轉乘非常簡單。',
                advice: '⚠️ 撇步：如果你是這兩線互轉，直接在對面月台等車即可，不需要走任何樓梯。',
                severity: 'medium'
            }
        ],
        hacks: [
            '🥨 **Echika 表參道**：改札內有著名的美食區與麵包店，是轉乘時補充能量的好地方。',
            '🍎 **Apple Store 直結**：A2 出口上來就是標誌性的 Apple Store。'
        ],
        l3Facilities: [
            { type: 'toilet', floor: 'Metro B1', operator: 'Metro', location: '神宮前・原宿方面改札內 (近 B2 出口)', attributes: { wheelchair: true, hasWashlet: true, hasBabyRoom: true }, source: 'https://www.tokyometro.jp/lang_tcn/station/omotesando/accessibility/' },
            { type: 'locker', floor: 'Metro B1', operator: 'Metro', location: '青山通り方面改札外 右側', attributes: { count: 35, sizes: ['S', 'M', 'L'] } },
            { type: 'elevator', floor: 'Metro GF', operator: 'Metro', location: 'B3 出口旁 (與 A1 分離)', attributes: { wheelchair: true } },
            { type: 'wifi', floor: 'Metro B1', operator: 'Metro', location: '全站', attributes: { ssid: 'METRO_FREE_WiFi' } }
        ]
    },
    'odpt:Station:TokyoMetro.Hiroo': {
        traps: [],
        hacks: [
            '🌳 **有栖川宮紀念公園**：從 1 號出口步行 3 分鐘，這是一個極其安靜且充滿自然氛圍的公園。',
            '🥖 **外國人超市**：National Azabu 位於 門前，可以買到許多稀有的進口商品。'
        ],
        l3Facilities: [
            { type: 'toilet', floor: 'Metro B1', operator: 'Metro', location: '西麻布方面驗票口內', attributes: { wheelchair: true, hasWashlet: true }, source: 'https://www.tokyometro.jp/lang_tcn/station/hiroo/accessibility/' },
            { type: 'elevator', floor: 'Metro GF', operator: 'Metro', location: '4 號出口旁', attributes: { wheelchair: true } },
            { type: 'wifi', floor: 'Metro B1', operator: 'Metro', location: '全站', attributes: { ssid: 'METRO_FREE_WiFi' } }
        ]
    },
    'odpt:Station:TokyoMetro.Akasakamitsuke': {
        traps: [
            {
                type: 'transfer',
                title: '🚥 絕非直結的「永田町」轉乘 (Not Really Connected)',
                content: '赤坂見附與永田町雖然在地圖上重疊，但實際轉乘某些線路（如半藏門線）需步行約 5-10 分鐘。',
                advice: '⚠️ 注意：如果你在赤坂見附下車要轉乘南北線或半藏門線，請有步行超過 500m 的心理準備。',
                severity: 'medium'
            }
        ],
        hacks: [
            '🍛 **美食地下道**：車站連通道「ベルビー赤坂」內有無數高品質餐廳，適合商務晚餐。'
        ],
        l3Facilities: [
            { type: 'toilet', floor: 'Metro B1', operator: 'Metro', location: '驗票口內 永田町方向通道', attributes: { wheelchair: true, hasWashlet: true }, source: 'https://www.tokyometro.jp/lang_tcn/station/akasaka-mitsuke/accessibility/' },
            { type: 'locker', floor: 'Metro B1', operator: 'Metro', location: '改札外 永田町站方向地下通路', attributes: { count: 40, sizes: ['S', 'M', 'L'] } },
            { type: 'elevator', floor: 'Metro GF', operator: 'Metro', location: 'A 出口旁', attributes: { wheelchair: true } },
            { type: 'wifi', floor: 'Metro B1', operator: 'Metro', location: '全站', attributes: { ssid: 'METRO_FREE_WiFi' } }
        ]
    },
    // === Taito Ward - Toei Asakusa Line ===
    'odpt:Station:Toei.Asakusa': {
        traps: [
            {
                type: 'transfer',
                title: '🚇 淺草站大迷宮 (Asakusa Station Maze)',
                content: '淺草站有都營淺草線、東京Metro銀座線、東武線三條路線交會，但彼此並非直結。',
                advice: '⚠️ 建議：從都營淺草線轉乘銀座線需要出站再入站，步行約 5-8 分鐘。記得先跟站務員確認最短路徑。',
                severity: 'high'
            }
        ],
        hacks: [
            '⛩️ **雷門最近出口**：A4 出口步行 1 分鐘即可抵達著名的雷門。',
            '🍡 **仲見世通り**：雷門到淺草寺之間的參道商店街，約 250 公尺長，可以邊吃邊逛。',
            '🚤 **水上巴士**：從吾妻橋可以搭水上巴士到御台場和葛西臨海公園。'
        ],
        l3Facilities: [
            { type: 'toilet', floor: 'Toei B1', operator: 'Toei', location: '淺草線改札內', attributes: { wheelchair: true, hasWashlet: true }, source: 'https://www.kotsu.metro.tokyo.jp/subway/stations/asakusa.html' },
            { type: 'elevator', floor: 'Toei GF', operator: 'Toei', location: 'A2b 出口（雷門方面）', attributes: { wheelchair: true } },
            { type: 'elevator', floor: 'Toei GF', operator: 'Toei', location: 'A4 出口', attributes: { wheelchair: true } },
            { type: 'elevator', floor: 'Toei GF', operator: 'Toei', location: 'A5 出口', attributes: { wheelchair: true } },
            { type: 'wifi', floor: 'Toei', operator: 'Toei', location: '全站', attributes: { ssid: 'Toei_Free_Wi-Fi' } }
        ]
    },
    'odpt:Station:Toei.Kuramae': {
        traps: [
            {
                type: 'transfer',
                title: '⚠️ 淺草線與大江戶線不直結！ (Lines NOT Connected)',
                content: '藏前站的淺草線和大江戶線雖然同名，但兩者是完全分離的車站建築，需要步行地下通道約 5 分鐘。',
                advice: '⚠️ 注意：如果你需要在藏前轉乘這兩條線，請務必預留至少 10 分鐘的轉乘時間。通道有明確標示但距離較長。',
                severity: 'critical'
            }
        ],
        hacks: [
            '🎨 **藏前職人街**：這一帶有許多手工藝品店和咖啡廳，是東京的「布魯克林」。',
            '🧵 **手芸材料**：浅草橋至蔵前一帶是日本最大的手工藝材料批發區。'
        ],
        l3Facilities: [
            { type: 'toilet', floor: 'Toei B1 (Asakusa)', operator: 'Toei', location: '淺草線改札內', attributes: { wheelchair: true, hasWashlet: true }, source: 'https://www.kotsu.metro.tokyo.jp/subway/stations/kuramae.html' },
            { type: 'toilet', floor: 'Toei B2 (Oedo)', operator: 'Toei', location: '大江戶線改札內', attributes: { wheelchair: true, hasWashlet: true } },
            { type: 'elevator', floor: 'Toei GF (Asakusa)', operator: 'Toei', location: 'A2 出口', attributes: { wheelchair: true } },
            { type: 'elevator', floor: 'Toei GF (Asakusa)', operator: 'Toei', location: 'A6 出口', attributes: { wheelchair: true } },
            { type: 'elevator', floor: 'Toei GF (Oedo)', operator: 'Toei', location: 'A7 出口', attributes: { wheelchair: true } },
            { type: 'elevator', floor: 'Toei GF (Oedo)', operator: 'Toei', location: 'A0 出口', attributes: { wheelchair: true } },
            { type: 'wifi', floor: 'Toei', operator: 'Toei', location: '全站 (兩線皆有)', attributes: { ssid: 'Toei_Free_Wi-Fi' } }
        ]
    },
    'odpt:Station:Toei.Asakusabashi': {
        traps: [],
        hacks: [
            '🎎 **人形批發街**：從 A3 出口出站，即可看到日本最大的人形（人偶）批發商店街。'
        ],
        l3Facilities: [
            { type: 'toilet', floor: 'Toei B1', operator: 'Toei', location: '改札內', attributes: { wheelchair: true } },
            { type: 'locker', floor: 'B1', operator: 'Private', location: 'A3出口附近', attributes: { count: 50, sizes: ['S', 'M', 'L'] } },
            { type: 'elevator', floor: 'Toei B1', operator: 'Toei', location: 'A3出口', attributes: { wheelchair: true, note: '唯一電梯' } },
            { type: 'wifi', floor: 'Toei B1', operator: 'Toei', location: '改札內', attributes: { ssid: 'Toei_Free_Wi-Fi' } }
        ]
    },
    // New Stations researched
    // === Chiyoda & Chuo Ward Expansion ===
    'odpt:Station:TokyoMetro.Hibiya': {
        traps: [
            {
                type: 'transfer',
                title: '🤝 有樂町轉乘連通 (Connected Hub)',
                content: '日比谷站與有樂町站（有樂町線/JR）通過地下通道相連，但距離較遠。',
                advice: '⚠️ 注意：雖然是同一付費區（Metro），但從千代田線走到有樂町線需 5-8 分鐘。',
                severity: 'medium'
            }
        ],
        l3Facilities: [
            { type: 'toilet', floor: 'Metro B1', operator: 'Metro', location: '幸橋方面改札內', attributes: { wheelchair: true, hasWashlet: true }, source: 'https://www.tokyometro.jp/lang_tcn/station/hibiya/accessibility/' },
            { type: 'elevator', floor: 'Metro GF', operator: 'Metro', location: 'A11 出口', attributes: { wheelchair: true } },
            { type: 'elevator', floor: 'Metro B2', operator: 'Metro', location: '千代田線月台 → 改札', attributes: { wheelchair: true } },
            { type: 'locker', floor: 'Metro B1', operator: 'Metro', location: '日比谷公園口附近', attributes: { sizes: ['S', 'M'] } },
            { type: 'wifi', floor: 'Metro B1', operator: 'Metro', location: '改札內', attributes: { ssid: 'METRO_FREE_WiFi' } }
        ]
    },
    'odpt:Station:TokyoMetro.Yurakucho': {
        traps: [],
        hacks: [
            '🎫 **JR 轉乘口**：利用 D2 出口可直接抵達 JR 有樂町站中央口。'
        ],
        l3Facilities: [
            { type: 'toilet', floor: 'Metro B1', operator: 'Metro', location: '改札外 D2 出口附近', attributes: { wheelchair: true, hasBabyRoom: true }, source: 'https://www.tokyometro.jp/lang_tcn/station/yurakucho/accessibility/' },
            { type: 'elevator', floor: 'Metro GF', operator: 'Metro', location: 'D7 出口', attributes: { wheelchair: true } },
            { type: 'locker', floor: 'Metro B1', operator: 'Metro', location: '改札外及通道', attributes: { count: 80, sizes: ['S', 'M', 'L'] } },
            { type: 'wifi', floor: 'Metro', operator: 'Metro', location: '改札內', attributes: { ssid: 'METRO_FREE_WiFi' } }
        ]
    },
    'odpt:Station:TokyoMetro.HigashiGinza': {
        traps: [],
        hacks: [
            '🎭 **歌舞伎座直結**：3 號出口直接連通歌舞伎座地下廣場，有許多特色伴手禮。'
        ],
        l3Facilities: [
            { type: 'toilet', floor: 'Metro B2', operator: 'Metro', location: '改札內', attributes: { wheelchair: true, hasWashlet: true }, source: 'https://www.tokyometro.jp/lang_tcn/station/higashi-ginza/accessibility/' },
            { type: 'locker', floor: 'Metro B1', operator: 'Metro', location: '剪票口外', attributes: { count: 60, sizes: ['S', 'M', 'L'] } },
            { type: 'elevator', floor: 'Metro GF', operator: 'Metro', location: '歌舞伎座直通電梯', attributes: { wheelchair: true } },
            { type: 'wifi', floor: 'Metro', operator: 'Metro', location: '改札內', attributes: { ssid: 'METRO_FREE_WiFi' } }
        ]
    },
    'odpt:Station:TokyoMetro.Tsukiji': {
        traps: [
            {
                type: 'exit',
                title: '🐟 築地場外市場出口 (Market Exit)',
                content: '雖然築地市場已搬遷至豐洲，但「築地場外市場」仍在原處。最近的出口是 1 號或 2 號出口。',
                advice: '⚠️ 注意：早晨 10 點後市場人潮極度擁擠，請照顧好隨身行李。',
                severity: 'medium'
            }
        ],
        hacks: [
            '🍙 **飯糰名店**：雖然握壽司很有名，但 1 號出口附近的飯糰專賣店也是在地人的首選。',
            '🏯 **築地本願寺**：出站即可見到印度風格的外觀，建築內部非常精美，值得一遊。'
        ],
        l3Facilities: [
            { type: 'toilet', floor: 'Metro GF', operator: 'Metro', location: '本願寺改札外', attributes: { wheelchair: true, hasBabyRoom: true }, source: 'https://www.tokyometro.jp/lang_tcn/station/tsukiji/accessibility/' },
            { type: 'elevator', floor: 'Metro GF', operator: 'Metro', location: '1, 2 號出口', attributes: { wheelchair: true } },
            { type: 'locker', floor: 'Metro B1', operator: 'Metro', location: '站務室旁', attributes: { count: 20, sizes: ['S', 'M'] } },
            { type: 'wifi', floor: 'Metro', operator: 'Metro', location: '改札內', attributes: { ssid: 'METRO_FREE_WiFi' } }
        ]
    },
    'odpt:Station:TokyoMetro.Hatchobori': {
        traps: [
            {
                type: 'transfer',
                title: '🚄 京葉線轉乘攻略 (Keiyo Transfer)',
                content: '八丁堀站轉乘 JR 京葉線比東京站快很多，但月台非常深。',
                advice: '⚠️ 建議：預留 10 分鐘轉乘時間，利用 B1/B2 連絡通道電梯。',
                severity: 'medium'
            }
        ],
        hacks: [
            '🍱 **商務午餐**：八丁堀是著名的商務區，周邊地下街有無數超值的中午定食。'
        ],
        l3Facilities: [
            { type: 'toilet', floor: 'Metro B1', operator: 'Metro', location: '八丁堀交差點方面改札外', attributes: { wheelchair: true }, source: 'https://www.tokyometro.jp/lang_tcn/station/hatchobori/accessibility/' },
            { type: 'locker', floor: 'JR 1F', operator: 'JR', location: 'JR 改札口附近', attributes: { count: 50, sizes: ['S', 'M', 'L'] } },
            { type: 'elevator', floor: 'Metro GF', operator: 'Metro', location: 'A2 出口', attributes: { wheelchair: true } },
            { type: 'elevator', floor: 'JR/Metro', operator: 'Metro', location: '轉乘連通道', attributes: { wheelchair: true } },
            { type: 'wifi', floor: 'Metro', operator: 'Metro', location: '改札內', attributes: { ssid: 'METRO_FREE_WiFi' } }
        ]
    },
    'odpt:Station:JR-East.Ochanomizu': {
        traps: [
            {
                type: 'transfer',
                title: '🌉 聖橋口 vs 御茶之水橋口',
                content: '兩個出口相距甚遠，聖橋口靠近秋葉原側（湯島聖堂），御茶之水橋口靠近明治大學/醫院。',
                advice: '⚠️ 建議：去樂器街請走御茶之水橋口；去神田明神請走聖橋口。',
                severity: 'medium'
            }
        ],
        l3Facilities: [
            { type: 'toilet', floor: 'JR 1F', operator: 'JR', location: '御茶之水橋口 改札內', attributes: { wheelchair: true, hasBabyRoom: true } },
            { type: 'toilet', floor: 'JR 1F', operator: 'JR', location: '聖橋口 改札內', attributes: { wheelchair: true } },
            { type: 'locker', floor: 'JR 1F', operator: 'JR', location: '御茶之水橋口 改札外', attributes: { count: 30, sizes: ['S', 'M'] } },
            { type: 'elevator', floor: 'JR', operator: 'JR', location: '聖橋口 ⇄ 月台', attributes: { wheelchair: true } }
        ]
    },
    'odpt:Station:Toei.Jimbocho': {
        traps: [
            {
                type: 'exit',
                title: '📚 書街迷宮 (Book Town Maze)',
                content: '神保町站出口眾多，且通往不同主題的書店區。',
                advice: '⚠️ 建議：去三省堂書店請走 A7，去古書中心請走 A6。',
                severity: 'medium'
            }
        ],
        hacks: [
            '🍛 **咖哩聖地**：神保町是東京咖哩一級戰區，A7 出口附近的 Bondy 非常有名。'
        ],
        l3Facilities: [
            { type: 'toilet', floor: 'Toei B1', operator: 'Toei', location: '新宿線/三田線 改札內', attributes: { wheelchair: true, note: 'Ostomate available' } },
            { type: 'elevator', floor: 'Toei GF', operator: 'Toei', location: 'A9 出口', attributes: { wheelchair: true } },
            { type: 'locker', floor: 'Toei B1', operator: 'Toei', location: '改札外通道', attributes: { count: 40, sizes: ['S', 'M'] } },
            { type: 'wifi', floor: 'Toei', operator: 'Toei', location: '改札內', attributes: { ssid: 'Toei_Free_Wi-Fi' } }
        ]
    },
    'odpt:Station:JR-East.Kanda': {
        traps: [],
        hacks: [
            '🍻 **上班族天堂**：西口、南口周邊居酒屋林立，是體驗日本上班族下班文化的最佳地點。'
        ],
        l3Facilities: [
            { type: 'toilet', floor: 'JR 2F', operator: 'JR', location: '北口/南口 改札內', attributes: { wheelchair: true } },
            { type: 'locker', floor: 'JR 2F', operator: 'JR', location: '各改札口附近', attributes: { count: 60, sizes: ['S', 'M', 'L'] } },
            { type: 'elevator', floor: 'JR', operator: 'JR', location: '月台 ⇄ 改札層', attributes: { wheelchair: true } }
        ]
    },
    'odpt:Station:TokyoMetro.Kudanshita': {
        traps: [
            {
                type: 'exit',
                title: '🏯 武道館出口 (Budokan Exit)',
                content: '要去日本武道館看演唱會，請務必走「2號出口」。演唱會結束時人潮極度擁擠，建議稍微提早離開或在此這稍作休息。',
                advice: '⚠️ 技巧：除了 2 號出口，也可利用 1 號出口（雖稍遠但較不擁擠）。',
                severity: 'medium'
            }
        ],
        l3Facilities: [
            { type: 'toilet', floor: 'Metro B2', operator: 'Metro', location: '東西線/半藏門線 改札內', attributes: { wheelchair: true } },
            { type: 'elevator', floor: 'Metro GF', operator: 'Metro', location: '6號出口', attributes: { wheelchair: true } },
            { type: 'locker', floor: 'Metro B1', operator: 'Metro', location: '改札外', attributes: { count: 50, sizes: ['S', 'M', 'L'] } },
            { type: 'wifi', floor: 'Metro', operator: 'Metro', location: '改札內', attributes: { ssid: 'METRO_FREE_WiFi' } }
        ]
    },
    'odpt:Station:TokyoMetro.Nagatacho': {
        traps: [
            {
                type: 'transfer',
                title: '♾️ 赤坂見附連通 (Endless Walk)',
                content: '永田町站與赤坂見附站（銀座線/丸之內線）在付費區內連通，但高低差極大（需搭多次長電扶梯）。',
                advice: '⚠️ 注意：轉乘距離約 300-400 公尺，相當於步行 5-8 分鐘。',
                severity: 'medium'
            }
        ],
        l3Facilities: [
            { type: 'toilet', floor: 'Metro B3', operator: 'Metro', location: '半藏門線/有樂町線 改札內', attributes: { wheelchair: true, hasBabyRoom: true } },
            { type: 'elevator', floor: 'Metro GF', operator: 'Metro', location: '9b 出口 (Tokyo Garden Terrace)', attributes: { wheelchair: true } },
            { type: 'locker', floor: 'Metro B3', operator: 'Metro', location: '轉乘層', attributes: { count: 40, sizes: ['S', 'M'] } },
            { type: 'wifi', floor: 'Metro', operator: 'Metro', location: '改札內', attributes: { ssid: 'METRO_FREE_WiFi' } }
        ]
    },
    'odpt:Station:JR-East.Nippori': {
        traps: [
            {
                type: 'transfer',
                title: '✈️ Skyliner 轉乘陷阱 (Airport Transfer)',
                content: '要從 JR 轉乘京成 Skyliner 去機場？千萬別走「南口」！',
                advice: '⚠️ 絕對守則：請務必走 **北改札口**，那裡才有 JR 直通京成的轉乘專用閘門。南口沒有轉乘機制，需出站重進，且只有樓梯。',
                severity: 'critical'
            }
        ],
        hacks: [
            '🛍️ **ecute 日暮里**：北改札內有著名的 ecute 商場，是購買伴手禮和便當的最後一站。',
            '🐈 **谷中銀座**：從西口步行 5 分鐘即達著名的「貓町」谷中銀座商店街。'
        ],
        l3Facilities: [
            { type: 'elevator', floor: 'JR', operator: 'JR', location: '北改札 → 月台', attributes: { wheelchair: true } }
        ]
    },



    // === Chuo Ward - Toei Subway ===
    'odpt:Station:Toei.Takaracho': {
        traps: [
            {
                type: 'exit',
                title: '🚪 出口陷阱 (Exit Trap)',
                content: '寶町站的改札口分為兩側，且改札內無法互通。',
                advice: '⚠️ 注意：進站前請確認方向（押上方面或西馬込方面），以免進錯月台。',
                severity: 'medium'
            }
        ],
        hacks: [
            '🖼️ **藝術街區**：周邊有許多畫廊和古董店，是銀座藝術圈的延伸。'
        ],
        l3Facilities: [
            { type: 'toilet', floor: 'Toei B1', operator: 'Toei', location: '改札內', attributes: { wheelchair: true, hasWashlet: true }, source: 'https://www.kotsu.metro.tokyo.jp/subway/stations/takaracho.html' },
            { type: 'elevator', floor: 'Toei GF', operator: 'Toei', location: 'A7 出口', attributes: { wheelchair: true } },
            { type: 'elevator', floor: 'Toei GF', operator: 'Toei', location: 'A8 出口', attributes: { wheelchair: true } },
            { type: 'wifi', floor: 'Toei', operator: 'Toei', location: '全站', attributes: { ssid: 'Toei_Free_Wi-Fi' } }
        ]
    },
    'odpt:Station:Toei.HigashiNihombashi': {
        traps: [
            {
                type: 'transfer',
                title: '🚇 三角轉乘 (Triangle Transfer)',
                content: '東日本橋站與馬喰橫山（新宿線）、馬喰町（JR總武快速）地下直結，但通道錯綜複雜。',
                advice: '⚠️ 建議：轉乘新宿線請走橘色標示通道，轉乘JR請走藍色標示通道，步行約 3-5 分鐘。',
                severity: 'medium'
            }
        ],
        hacks: [
            '👕 **問屋街**：日本最大的纖維批發街就在地面上，零售店也不少。'
        ],
        l3Facilities: [
            { type: 'toilet', floor: 'Toei B1', operator: 'Toei', location: '改札內', attributes: { wheelchair: true, hasWashlet: true }, source: 'https://www.kotsu.metro.tokyo.jp/subway/stations/higashi-nihombashi.html' },
            { type: 'elevator', floor: 'Toei GF', operator: 'Toei', location: 'B4 出口', attributes: { wheelchair: true } },
            { type: 'wifi', floor: 'Toei', operator: 'Toei', location: '全站', attributes: { ssid: 'Toei_Free_Wi-Fi' } }
        ]
    },
    'odpt:Station:Toei.Kachidoki': {
        traps: [
            {
                type: 'crowd',
                title: '🏢 上班族大遷徙 (Commuter Rush)',
                content: '勝鬨站周邊高樓林立，早晚高峰時段改札口極度擁擠。',
                advice: '⚠️ 注意：早上 8:30-9:30 盡量避開此站，人流管制可能導致進出站需時 10 分鐘以上。',
                severity: 'high'
            }
        ],
        hacks: [
            '🌉 **勝鬨橋**：步行可達著名的可開合勝鬨橋，夜景迷人。'
        ],
        l3Facilities: [
            { type: 'toilet', floor: 'Toei B1', operator: 'Toei', location: '改札內', attributes: { wheelchair: true, hasWashlet: true }, source: 'https://www.kotsu.metro.tokyo.jp/subway/stations/kachidoki.html' },
            { type: 'elevator', floor: 'Toei GF', operator: 'Toei', location: 'A1, A4a, A4b, A2a 出口 (共4台)', attributes: { wheelchair: true } },
            { type: 'wifi', floor: 'Toei', operator: 'Toei', location: '全站', attributes: { ssid: 'Toei_Free_Wi-Fi' } }
        ]
    },
    'odpt:Station:Toei.Tsukishima': {
        traps: [],
        hacks: [
            '🥘 **文字燒街**：出站即是「西仲通り商店街」，聚集了數十家文字燒名店。'
        ],
        l3Facilities: [
            { type: 'toilet', floor: 'Toei B1', operator: 'Toei', location: '改札內', attributes: { wheelchair: true, hasWashlet: true }, source: 'https://www.kotsu.metro.tokyo.jp/subway/stations/tsukishima.html' },
            { type: 'elevator', floor: 'Toei GF', operator: 'Toei', location: '8a, 10 號出口', attributes: { wheelchair: true } },
            { type: 'wifi', floor: 'Toei', operator: 'Toei', location: '全站', attributes: { ssid: 'Toei_Free_Wi-Fi' } }
        ]
    },
    'odpt:Station:Toei.Tsukijishijo': {
        traps: [
            {
                type: 'exit',
                title: '🐟 新舊市場之別 (Market Location)',
                content: '站名雖然是「築地市場」，但場內市場已搬遷。這裡主要靠近朝日新聞社與銀座南緣。',
                advice: '⚠️ 建議：要去「築地場外市場」吃海鮮，這裡可以，但築地站（日比谷線）可能更近一側。',
                severity: 'medium'
            }
        ],
        hacks: [],
        l3Facilities: [
            { type: 'toilet', floor: 'Toei B1', operator: 'Toei', location: '改札內', attributes: { wheelchair: true, hasWashlet: true }, source: 'https://www.kotsu.metro.tokyo.jp/subway/stations/tsukijishijo.html' },
            { type: 'elevator', floor: 'Toei GF', operator: 'Toei', location: 'A1, A2 出口', attributes: { wheelchair: true } },
            { type: 'wifi', floor: 'Toei', operator: 'Toei', location: '全站', attributes: { ssid: 'Toei_Free_Wi-Fi' } }
        ]
    },
    'odpt:Station:Toei.BakuroYokoyama': {
        traps: [],
        hacks: [
            '🧵 **批發區核心**：與東日本橋連通，是採購衣物雜貨的最佳起點。'
        ],
        l3Facilities: [
            { type: 'toilet', floor: 'Toei B1', operator: 'Toei', location: '改札內', attributes: { wheelchair: true, hasWashlet: true }, source: 'https://www.kotsu.metro.tokyo.jp/subway/stations/bakuro-yokoyama.html' },
            { type: 'elevator', floor: 'Toei GF', operator: 'Toei', location: 'A1, A3 出口', attributes: { wheelchair: true } },
            { type: 'wifi', floor: 'Toei', operator: 'Toei', location: '全站', attributes: { ssid: 'Toei_Free_Wi-Fi' } }
        ]
    },
    'odpt:Station:Toei.Hamacho': {
        traps: [],
        hacks: [
            '🌳 **濱町公園**：A2 出口直結中央區立濱町公園，是市中心的綠洲。',
            '🎭 **明治座**：著名的劇場「明治座」就在車站旁。'
        ],
        l3Facilities: [
            { type: 'toilet', floor: 'Toei B1', operator: 'Toei', location: '改札內', attributes: { wheelchair: true, hasWashlet: true }, source: 'https://www.kotsu.metro.tokyo.jp/subway/stations/hamacho.html' },
            { type: 'elevator', floor: 'Toei GF', operator: 'Toei', location: 'A1, A2 出口', attributes: { wheelchair: true } },
            { type: 'wifi', floor: 'Toei', operator: 'Toei', location: '全站', attributes: { ssid: 'Toei_Free_Wi-Fi' } }
        ]
    },
    'odpt:Station:Toei.Ningyocho': {
        traps: [
            {
                type: 'exit',
                title: '🏮 人形町懷舊街道出口 (Old Town Exit)',
                content: '人形町站有兩個不同線路的站體，出口分佈較廣。',
                advice: '⚠️ 注意：去甘酒橫丁請走 A1 或 A2 出口。',
                severity: 'medium'
            }
        ],
        hacks: [
            '🍮 **人形燒元祖**：在 A2 出口附近有幾家創業百年的老店，味道非常道地。',
            '🦊 **小網神社**：雖然不是直結，但從 A2 出口步行 5 分鐘即可抵達以洗錢、強運聞名的人氣神社。'
        ],
        l3Facilities: [
            { type: 'toilet', floor: 'Toei B1', operator: 'Toei', location: '日本橋方向改札內', attributes: { wheelchair: true, hasWashlet: true }, source: 'https://www.kotsu.metro.tokyo.jp/subway/stations/ningyocho.html' },
            { type: 'locker', floor: 'Toei B1', operator: 'Toei', location: 'A3 出口通路', attributes: { count: 15, sizes: ['S', 'M'] } },
            { type: 'elevator', floor: 'Toei GF', operator: 'Toei', location: 'A3 出口', attributes: { wheelchair: true } },
            { type: 'wifi', floor: 'Metro/Toei', operator: 'Metro', location: '全站', attributes: { ssid: 'METRO_FREE_WiFi' } }
        ]
    },
    'odpt:Station:TokyoMetro.Kyobashi': {
        traps: [],
        hacks: [
            '🏛️ **明治屋本館**：從 7 號出口可以直通具有歷史價值的明治屋超商。',
            '🏢 **東京中城八重洲**：從 6 號出口出發步行 5 分鐘即可抵達最新的商業地標。'
        ],
        l3Facilities: [
            { type: 'toilet', floor: 'Metro B1', operator: 'Metro', location: '驗票口內', attributes: { wheelchair: true, hasWashlet: true }, source: 'https://www.tokyometro.jp/lang_tcn/station/kyobashi/accessibility/' },
            { type: 'locker', floor: 'Metro B1', operator: 'Metro', location: '7 號出口方向通路', attributes: { count: 20, sizes: ['S', 'M'] } },
            { type: 'elevator', floor: 'Metro GF', operator: 'Metro', location: '2 號出口旁', attributes: { wheelchair: true } },
            { type: 'wifi', floor: 'Metro B1', operator: 'Metro', location: '全站', attributes: { ssid: 'METRO_FREE_WiFi' } }
        ]
    },
    'odpt:Station:Toei.HigashiGinza': {
        traps: [
            {
                type: 'transfer',
                title: '🎭 歌舞伎座直結 (Kabukiza Direct)',
                content: 'Higashi-ginza 與歌舞伎座直結，演出結束後人潮會瞬間爆發。',
                advice: '⚠️ 建議：避開演出散場時間進入車站。',
                severity: 'medium'
            }
        ],
        hacks: [
            '🍵 **木挽町廣場**：地下 2 樓的廣場即使不進場看戲也能買到歌舞伎主題的伴手禮。'
        ],
        l3Facilities: [
            { type: 'toilet', floor: 'Toei B1', operator: 'Toei', location: '歌舞伎座方面改札外', attributes: { wheelchair: true, hasWashlet: true }, source: 'https://www.kotsu.metro.tokyo.jp/subway/stations/higashi-ginza.html' },
            { type: 'locker', floor: 'Toei B1', operator: 'Toei', location: '改札外通路', attributes: { count: 30, sizes: ['S', 'M', 'L'] } },
            { type: 'elevator', floor: 'Toei GF', operator: 'Toei', location: 'A2 出口', attributes: { wheelchair: true } },
            { type: 'wifi', floor: 'Metro/Toei', operator: 'Metro', location: '全站', attributes: { ssid: 'METRO_FREE_WiFi' } }
        ]
    },
    'odpt:Station:Toei.Asakusa.Ningyocho': {
        traps: [
            {
                type: 'transfer',
                title: '🚅 列車過站不停警示 (Skip Stop)',
                content: '注意！都營淺草線的「Airport快特 (Airport Kaitoku)」列車 **不會停靠** 人形町站。',
                advice: '🛑 能夠搭乘的車種：請搭乘普通或各站停車的班次。',
                severity: 'medium'
            }
        ],
        hacks: [
            '⛩️ **洗錢神社**：步行可達著名的小網神社（求財運），是近年熱門景點。'
        ]
    },
    'odpt:Station:Toei.Asakusa.Higashiginza': {
        traps: [
            {
                type: 'transfer',
                title: '🚅 列車過站不停警示 (Skip Stop)',
                content: '注意！都營淺草線的「Airport快特 (Airport Kaitoku)」列車 **不會停靠** 東銀座站。',
                advice: '🛑 能夠搭乘的車種：請搭乘普通或各站停車的班次。',
                severity: 'medium'
            }
        ]
    },
    'odpt:Station:Toei.Asakusa.Sengakuji': {
        traps: [
            {
                type: 'transfer',
                title: '🔀 命運的分歧點 (Destination Trap)',
                content: '泉岳寺站是淺草線往「西馬込」與「京急線（羽田機場）」的分歧點。',
                advice: '⚠️ 轉乘攻略：若要往五反田、西馬込方向，無論何種列車都可先上車，只需在 **泉岳寺站** 下車換乘往西馬込的列車即可，無需在月台苦等直達車。',
                severity: 'high'
            }
        ]
    },
    // Shinjuku Station (The Boss)
    'odpt:Station:JR-East.Shinjuku': {
        traps: [
            {
                type: 'exit',
                title: '🌀 東西出口迷宮 (East/West Maze)',
                content: '新宿站的 JR 系統，東口與西口在地下不互通（除非走特定通道）。一旦出錯閘門，要繞外圍一大圈才能到對面。',
                advice: '⚠️ 絕對守則：出閘門前請確認目標是「東口」還是「西口」。若走錯，建議不下樓，直接走地面層的「大ガード (大鐵橋)」繞過去。',
                severity: 'critical'
            },
            {
                type: 'transfer',
                title: '🚇 大江戶線轉乘地獄 (Deep Transfer)',
                content: '大江戶線的「新宿站」位於地下七層，距離 JR 改札口極遠。',
                advice: '💡 行動建議：若要轉乘大江戶線，請改去「新宿西口站」而非「新宿站」，兩者其實更近且沒那麼深。',
                severity: 'high'
            }
        ],
        hacks: [
            '🌧️ **地下通路王**：新宿三丁目到西口都廳，均有地下道相連。下雨天可從「Subnade」地下街一路逛到東口，完全不必淋雨。',
            '🆕 **新南口直達**：要去「Busta 新宿 (巴士轉運站)」請務必找「新南改札」，出來直達手扶梯上樓即是，千萬別走去東/西口。'
        ],
        l3Facilities: [
            // === 廁所 ===
            { type: 'toilet', floor: 'JR B1', operator: 'JR', location: '東口改札內', attributes: { wheelchair: true, hasWashlet: true } },
            { type: 'toilet', floor: 'JR 2F', operator: 'JR', location: '新南改札內 (Busta方向)', attributes: { wheelchair: true, hasWashlet: true, hasBabyRoom: true } },
            { type: 'toilet', floor: 'Metro B1', operator: 'Metro', location: '丸之內線改札內', attributes: { wheelchair: true, hasWashlet: true } },
            // === 置物櫃 ===
            { type: 'locker', floor: 'JR B1', operator: 'JR', location: '東口地下廣場', attributes: { count: 400, sizes: ['S', 'M', 'L', 'XL'], note: '最大量區域' } },
            { type: 'locker', floor: 'JR 2F', operator: 'JR', location: '新南口改札外', attributes: { count: 200, sizes: ['S', 'M', 'L', 'XL', 'XXL'], note: '超大型行李' } },
            { type: 'locker', floor: 'B1', operator: 'Private', location: 'Subnade 地下街', attributes: { count: 150, sizes: ['S', 'M', 'L'] } },
            // === 電梯 ===
            { type: 'elevator', floor: 'JR', operator: 'JR', location: '新南改札 → Busta新宿', attributes: { wheelchair: true, note: '高速巴士轉運站' } },
            { type: 'elevator', floor: 'Metro B7', operator: 'Toei', location: '大江戶線月台 → 改札', attributes: { wheelchair: true, note: '地下7層' } },
            // === WiFi ===
            { type: 'wifi', floor: 'JR 全層', operator: 'JR', location: '改札內外全站', attributes: { ssid: 'JR-EAST_FREE_WiFi' } },
            { type: 'wifi', floor: 'Metro B1', operator: 'Metro', location: '丸之內線改札內', attributes: { ssid: 'METRO_FREE_WiFi' } }
        ]
    },

    // Shibuya Station (The Labyrinth)
    'odpt:Station:TokyoMetro.Shibuya': {
        traps: [
            {
                type: 'transfer',
                title: '🆙 銀座線空口謎題 (Sky Subway)',
                content: '雖然是地下鐵，但澀谷站的銀座線月台在 **三樓**！而副都心線在地下五樓。',
                advice: '⚠️ 轉乘警示：銀座線轉乘副都心線/東橫線，垂直移動距離極大，請預留 10-15 分鐘的「登山」時間。',
                severity: 'high'
            },
            {
                type: 'exit',
                title: '🚧 迷宮工事中 (Construction Chaos)',
                content: '澀谷站周邊工程持續進行中，出口位置常有變動。',
                advice: '🛑 能夠搭乘的車種：請認準「Hachiko Gate (八公改札)」作為唯一真理，其他出口容易迷失在工地迷宮中。',
                severity: 'medium'
            }
        ],
        hacks: [
            '🏙️ **Scramble Square 捷徑**：利用 Scramble Square 百貨的電梯，可以直接從 B2 地鐵層殺到 3F 的銀座線/JR 連通道，避開人擠人的手扶梯。',
            '🖼️ **神話明日壁畫**：在通往井之頭線的連通道上，有岡本太郎巨大的壁畫「明日的神話」，是免費且震撼的藝術景點。'
        ],
        l3Facilities: [
            // === 廁所 ===
            { type: 'toilet', floor: 'Metro 3F', operator: 'Metro', location: '銀座線改札內', attributes: { wheelchair: true, hasWashlet: true } },
            { type: 'toilet', floor: 'Metro B5', operator: 'Metro', location: '副都心線改札內', attributes: { wheelchair: true, hasWashlet: true, hasBabyRoom: true } },
            { type: 'toilet', floor: 'JR 2F', operator: 'JR', location: '八公改札內', attributes: { wheelchair: true, hasWashlet: true } },
            // === 置物櫃 ===
            { type: 'locker', floor: 'JR 2F', operator: 'JR', location: '八公改札外', attributes: { count: 150, sizes: ['S', 'M', 'L', 'XL'] } },
            { type: 'locker', floor: 'B1', operator: 'Private', location: 'Scramble Square B1', attributes: { count: 100, sizes: ['S', 'M', 'L'], note: '百貨內' } },
            // === 電梯 ===
            { type: 'elevator', floor: 'Metro 3F', operator: 'Metro', location: '銀座線月台 → 地上', attributes: { wheelchair: true, note: '銀座線在3樓' } },
            { type: 'elevator', floor: 'Metro B5', operator: 'Metro', location: '副都心線月台 → 改札', attributes: { wheelchair: true } },
            { type: 'elevator', floor: 'B2-3F', operator: 'Private', location: 'Scramble Square 百貨', attributes: { wheelchair: true, note: '推薦捷徑' } },
            // === WiFi ===
            { type: 'wifi', floor: 'Metro 全層', operator: 'Metro', location: '改札內全區', attributes: { ssid: 'METRO_FREE_WiFi' } },
            { type: 'wifi', floor: 'JR 2F', operator: 'JR', location: 'JR改札內', attributes: { ssid: 'JR-EAST_FREE_WiFi' } }
        ]
    },

    // Ikebukuro Station (The Owl)
    'odpt:Station:JR-East.Ikebukuro': {
        traps: [
            {
                type: 'exit',
                title: '🦉 東西百貨悖論 (West-East Paradox)',
                content: '池袋的最大陷阱：「西武百貨在東口，東武百貨在西口」。',
                advice: '⚠️ 記憶口訣：東口是西武 (Seibu)，西口是東武 (Tobu)。想去西武百貨請往「東口」走！',
                severity: 'critical'
            }
        ],
        hacks: [
            '🦉 **貓頭鷹地標**：東口的「Ikefukurou (貓頭鷹石像)」是最佳會合點，比八公像難找一點但人也比較少。',
            '🍜 **拉麵激戰區**：東口往 SunShine City 的路上是拉麵一級戰區，無敵家、一蘭都在這附近。'
        ],
        l3Facilities: [
            // === 廁所 ===
            { type: 'toilet', floor: 'JR 1F', operator: 'JR', location: '中央改札內', attributes: { wheelchair: true, hasWashlet: true } },
            { type: 'toilet', floor: 'Metro B1', operator: 'Metro', location: '丸之內線改札內', attributes: { wheelchair: true, hasWashlet: true } },
            // === 置物櫃 ===
            { type: 'locker', floor: 'JR 1F', operator: 'JR', location: '東口改札外', attributes: { count: 300, sizes: ['S', 'M', 'L', 'XL'], note: '西武百貨側' } },
            { type: 'locker', floor: 'JR 1F', operator: 'JR', location: '西口改札外', attributes: { count: 250, sizes: ['S', 'M', 'L', 'XL'], note: '東武百貨側' } },
            { type: 'locker', floor: 'B1', operator: 'Private', location: 'Sunshine City 地下通道', attributes: { count: 100, sizes: ['S', 'M', 'L'] } },
            // === 電梯 ===
            { type: 'elevator', floor: 'JR', operator: 'JR', location: '中央改札 → 各月台', attributes: { wheelchair: true } },
            { type: 'elevator', floor: 'Metro B1', operator: 'Metro', location: '丸之內線月台 → 改札', attributes: { wheelchair: true } },
            // === WiFi ===
            { type: 'wifi', floor: 'JR 全層', operator: 'JR', location: '改札內外全站', attributes: { ssid: 'JR-EAST_FREE_WiFi' } },
            { type: 'wifi', floor: 'Metro B1', operator: 'Metro', location: '丸之內線改札內', attributes: { ssid: 'METRO_FREE_WiFi' } }
        ]
    },

    'odpt:Station:Toei.Ogawamachi': {
        traps: [
            {
                type: 'transfer',
                title: '🚇 站名混淆 (Station Name)',
                content: '別將「小川町 (Ogawamachi)」與埼玉縣的同名車站搞混。這裡直結丸之內線「淡路町」站。',
                advice: '⚠️ 轉乘提示：可經由地下連通道前往淡路町站（丸之內線）或新御茶之水站（千代田線）。',
                severity: 'medium'
            }
        ],
        hacks: [
            '🎿 **體育用品街**：B5 出口直達靖國通，滿滿的滑雪、登山用品店。'
        ],
        l3Facilities: [
            { type: 'toilet', floor: 'Toei B1', operator: 'Toei', location: '改札內', attributes: { wheelchair: true, hasWashlet: true }, source: 'https://www.kotsu.metro.tokyo.jp/subway/stations/ogawamachi.html' },
            { type: 'elevator', floor: 'Toei GF', operator: 'Toei', location: 'B7 出口', attributes: { wheelchair: true } },
            { type: 'wifi', floor: 'Toei', operator: 'Toei', location: '全站', attributes: { ssid: 'Toei_Free_Wi-Fi' } }
        ]
    },
    'odpt:Station:Toei.Kudanshita': {
        traps: [
            {
                type: 'crowd',
                title: '🥋 武道館活動 (Budokan Crowds)',
                content: '當日本武道館有演唱會或活動時，車站會擠得水洩不通。',
                advice: '⚠️ 逃生路線：活動結束後建議稍微走遠一點到飯田橋或神保町搭車。',
                severity: 'high'
            }
        ],
        hacks: [
            '🌸 **千鳥之淵**：2 號出口出來就是著名的賞櫻勝地千鳥之淵。'
        ],
        l3Facilities: [
            { type: 'toilet', floor: 'Toei B2', operator: 'Toei', location: '改札內', attributes: { wheelchair: true, hasWashlet: true }, source: 'https://www.kotsu.metro.tokyo.jp/subway/stations/kudanshita.html' },
            { type: 'elevator', floor: 'Toei GF', operator: 'Toei', location: '6 號出口', attributes: { wheelchair: true } },
            { type: 'wifi', floor: 'Toei', operator: 'Toei', location: '全站', attributes: { ssid: 'Toei_Free_Wi-Fi' } }
        ]
    },
    'odpt:Station:Toei.Iwamotocho': {
        traps: [
            {
                type: 'transfer',
                title: '🚶 秋葉原步行 (Akiba Walk)',
                content: '雖然廣播會說可轉乘秋葉原站，但需要過橋步行約 5-8 分鐘。',
                advice: '⚠️ 注意：轉乘日比谷線秋葉原站最近，JR 秋葉原站稍遠。',
                severity: 'medium'
            }
        ],
        hacks: [
            '🌉 **神田川景色**：A4 出口出來的和泉橋上可以拍攝神田川與列車交錯的景色。'
        ],
        l3Facilities: [
            { type: 'toilet', floor: 'Toei B1', operator: 'Toei', location: '改札內', attributes: { wheelchair: true, hasWashlet: true }, source: 'https://www.kotsu.metro.tokyo.jp/subway/stations/iwamotocho.html' },
            { type: 'elevator', floor: 'Toei GF', operator: 'Toei', location: 'A6 出口', attributes: { wheelchair: true } },
            { type: 'wifi', floor: 'Toei', operator: 'Toei', location: '全站', attributes: { ssid: 'Toei_Free_Wi-Fi' } }
        ]
    },
    'odpt:Station:Toei.Hibiya': {
        traps: [],
        hacks: [
            '🦕 **哥吉拉雕像**：A4 出口附近的日比谷 Chanter 廣場有新的哥吉拉雕像。',
            '🏞️ **日比谷公園**：A14 出口直結公園，是市中心的休憩場所。'
        ],
        l3Facilities: [
            { type: 'toilet', floor: 'Toei B1', operator: 'Toei', location: '改札內', attributes: { wheelchair: true, hasWashlet: true }, source: 'https://www.kotsu.metro.tokyo.jp/subway/stations/hibiya.html' },
            { type: 'elevator', floor: 'Toei GF', operator: 'Toei', location: 'A9 出口', attributes: { wheelchair: true } },
            { type: 'wifi', floor: 'Toei', operator: 'Toei', location: '全站', attributes: { ssid: 'Toei_Free_Wi-Fi' } }
        ]
    },
    'odpt:Station:Toei.Uchisaiwaicho': {
        traps: [
            {
                type: 'exit',
                title: '🚇 地下無限連廊 (Endless Tunnel)',
                content: '這裡的地下通道與霞關、日比谷、銀座甚至東銀座都相連。',
                advice: '💡 探索：下雨天可以一路走到銀座不用淋雨，但小心迷路。',
                severity: 'medium'
            }
        ],
        hacks: [
            '🏨 **帝國飯店**：A13 出口最近帝國飯店。'
        ],
        l3Facilities: [
            { type: 'toilet', floor: 'Toei B1', operator: 'Toei', location: '改札內', attributes: { wheelchair: true, hasWashlet: true }, source: 'https://www.kotsu.metro.tokyo.jp/subway/stations/uchisaiwaicho.html' },
            { type: 'elevator', floor: 'Toei GF', operator: 'Toei', location: 'A7 出口', attributes: { wheelchair: true } },
            { type: 'wifi', floor: 'Toei', operator: 'Toei', location: '全站', attributes: { ssid: 'Toei_Free_Wi-Fi' } }
        ]
    },
    'odpt:Station:Toei.Ichigaya': {
        traps: [
            {
                type: 'transfer',
                title: '🚇 路線分隔 (Line Separation)',
                content: '都営新宿線的市谷站與有樂町線/南北線的市谷站改札口有一段距離。',
                advice: '⚠️ 建議：轉乘預留 5-7 分鐘。',
                severity: 'medium'
            }
        ],
        hacks: [
            '🎣 **釣魚堀**：車站月台就能看到護城河上的釣魚場，是市谷的招牌風景。'
        ],
        l3Facilities: [
            { type: 'toilet', floor: 'Toei B1', operator: 'Toei', location: '改札內', attributes: { wheelchair: true, hasWashlet: true }, source: 'https://www.kotsu.metro.tokyo.jp/subway/stations/ichigaya.html' },
            { type: 'elevator', floor: 'Toei GF', operator: 'Toei', location: 'A2 出口', attributes: { wheelchair: true } },
            { type: 'elevator', floor: 'Toei GF', operator: 'Toei', location: 'A3 出口', attributes: { wheelchair: true } },
            { type: 'wifi', floor: 'Toei', operator: 'Toei', location: '全站', attributes: { ssid: 'Toei_Free_Wi-Fi' } }
        ]
    }
};
