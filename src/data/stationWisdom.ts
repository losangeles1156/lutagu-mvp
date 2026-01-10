import { ExpertKnowledge } from '../types/lutagu_l4';
import { GENERATED_KNOWLEDGE } from './station_wisdom_generated';

/**
 * LUTAGU V3.0 Expert Knowledge Base
 * 
 * Rules are evaluated by the L4 Decision Engine against User Context.
 * Writing Guide:
 * - Action-Oriented: Tell users what to do, not just facts.
 * - Concise: < 60 chars per language.
 * - Authority: Friendly local expert tone.
 */
export const KNOWLEDGE_BASE: ExpertKnowledge[] = [
    // Scene 1: Transfer Warning (Tokyo Station Keiyo Line)
    {
        id: 'tokyo-keiyo-transfer',
        trigger: {
            station_ids: ['odpt:Station:JR-East.Tokyo'],
            line_ids: ['odpt:Railway:JR-East.Keiyo'],
            keywords: ['transfer', 'keiyo', 'long_walk', 'walk']
        },
        type: 'warning',
        priority: 90,
        icon: '⚠️',
        title: {
            'zh-TW': '轉乘預警',
            ja: '乗り換え注意',
            en: 'Transfer Warning',
        },
        content: {
            'zh-TW': '京葉線月台位於地下 5 層深處（約 27 公尺），從其他月台轉乘需經過：\n① 4 段電扶梯\n② 長達 200 公尺的水平電動步道 (動く歩道)\n全程至少 15 分鐘，攜帶大型行李者請預留 20-25 分鐘。',
            ja: '京葉線ホームは地下約27m（5層相当）にあります。乗り換えには：\n① 4本のエスカレーター\n② 約200mの動く歩道\nを通過します。所要15分以上。大きな荷物があれば20-25分見てください。',
            en: 'Keiyo Line platforms are 27m underground (5 levels deep). Transfer requires:\n① 4 escalators\n② 200m of moving walkways\nAllow 15+ mins, or 20-25 mins with large luggage.',
        },
    },

    // Scene 2: Facility Barriers (Exit A1 - Wheelchair/Stroller)
    {
        id: 'generic-exit-a1-barrier', // Note: This should ideally be specific to a station. Using a generic-like ID for the example structure.
        trigger: {
            // In a real DB, we might tag specific Station+Exit. 
            // For this example, let's assume it targets a specific station where A1 is bad.
            // Let's assign it to 'Ueno' for demonstration, or leave station empty if it was a global rule (which this isn't).
            station_ids: ['odpt:Station:TokyoMetro.Ginza.Ueno', 'odpt:Station:TokyoMetro.Hibiya.Ueno', 'odpt:Station:JR-East.Ueno'],
            user_states: ['accessibility.wheelchair', 'accessibility.stroller'],
            keywords: ['elevator', 'accessibility', 'barrier_free', 'wheelchair', 'stroller', 'exit']
        },
        type: 'warning',
        priority: 85,
        icon: '♿',
        title: {
            'zh-TW': '無障礙提醒',
            ja: 'バリアフリー情報',
            en: 'Accessibility Alert',
        },
        content: {
            'zh-TW': '出口 A1 僅有長階梯。推嬰兒車或輪椅，請務必改由 B2 出口搭乘大樓透明電梯。',
            ja: 'A1出口は階段のみです。ベビーカーや車椅子の方は、B2出口の透明エレベーターをご利用ください。',
            en: 'Exit A1 has stairs only. For strollers/wheelchairs, use Exit B2 for the glass elevator.',
        },
    },

    // Scene 3: Ticket Hack (Day Pass)
    {
        id: 'ticket-day-pass-suggestion',
        trigger: {
            // Logic: This would be triggered by the engine if trip_count > 3. 
            // For now, we can leave direct triggers empty and let the Engine inject it based on calculated trip count.
            // Or we can set a manual trigger for "Budget" travelers.
            user_states: ['travel_style.budget', 'travel_style.comfort'],
        },
        type: 'ticket_advice',
        priority: 60,
        icon: '🎫',
        title: {
            'zh-TW': '省錢小撇步',
            ja: 'お得なきっぷ',
            en: 'Money Saving Tip',
        },
        content: {
            'zh-TW': '若今日計畫造訪超過 3 個地鐵站，購買 800 日圓的「Tokyo Subway Ticket」可省下 300 日圓以上。',
            ja: '地下鉄を3回以上乗るなら、800円の「Tokyo Subway Ticket」がお得です。',
            en: 'If visiting 3+ stations today, the 800 JPY "Tokyo Subway Ticket" saves you money.',
        },
    },

    // Scene 4: Timing Adjustment (Ueno Shinkansen)
    {
        id: 'ueno-shinkansen-timing',
        trigger: {
            station_ids: ['odpt:Station:JR-East.Ueno'],
            line_ids: ['odpt:Railway:JR-East.Shinkansen'], // Generic for Shinkansen lines
        },
        type: 'timing',
        priority: 70,
        icon: '⏰',
        title: {
            'zh-TW': '時間修正',
            ja: '移動時間注意',
            en: 'Time Adjustment',
        },
        content: {
            'zh-TW': '新幹線月台位於地下深層，進剪票口後需走 10-12 分鐘。建議比發車時間早 15 分鐘抵達。',
            ja: '新幹線ホームは地下深くにあります。改札からホームまで10分以上かかるため、15分前には到着を。',
            en: 'Shinkansen platforms are deep underground (10-12m walk). Please arrive 15 mins before departure.',
        },
    },

    // Scene 5: Seasonal/Event (Asakusa New Year)
    {
        id: 'asakusa-new-year-control',
        trigger: {
            station_ids: ['odpt:Station:TokyoMetro.Ginza.Asakusa', 'odpt:Station:Toei.Asakusa'],
            time_patterns: ['12/31-01/01'], // Simple date matching
        },
        type: 'seasonal',
        priority: 95,
        icon: '🎍', // Kadomatsu for New Year
        title: {
            'zh-TW': '跨年管制',
            ja: '年末年始規制',
            en: 'New Year Control',
        },
        content: {
            'zh-TW': '跨年期間雷門路口僅限出站。若要搭車回程，請由 A4 入口進入以節省排隊時間。',
            ja: '雷門前は出場専用になります。帰りの乗車はA4入口からがスムーズです。',
            en: 'Kaminarimon gate is exit-only during New Year. Use Exit A4 to enter the station and avoid queues.',
        },
    },
    // Scene 6: Deep Link - Lockers (Large Luggage)
    {
        id: 'service-locker-search',
        trigger: {
            user_states: ['luggage.large_luggage', 'luggage.multiple_bags']
        },
        type: 'tip',
        priority: 80,
        icon: '🧳',
        title: {
            'zh-TW': '大型置物櫃查詢',
            ja: 'コインロッカー検索',
            en: 'Locker Search'
        },
        content: {
            'zh-TW': '檢測到您攜帶大件行李。可透過此連結查詢站內置物櫃即時空位（JR/Metro）。',
            ja: '大きな荷物をお持ちのようです。駅構内ロッカーの空き状況はこちらから確認できます。',
            en: 'For large luggage, check real-time locker availability here.'
        },
        actionLabel: {
            'zh-TW': '查詢置物櫃',
            ja: '空き状況を見る',
            en: 'Check Availability'
        },
        actionUrl: 'https://metro.akilocker.biz/index.html?lgId=tokyometro' // Defaulting to Metro for MVP, ideally dynamic based on station
    },

    // Scene 7: Deep Link - Shared Cycle (LUUP Guide)
    {
        id: 'service-shared-cycle',
        trigger: {
            user_states: ['travel_style.rushing', 'travel_style.avoid_crowd']
        },
        type: 'tip',
        priority: 75,
        icon: '🚲',
        title: {
            'zh-TW': '共享單車 (LUUP) 使用教學',
            ja: 'LUUP 利用ガイド',
            en: 'LUUP Usage Guide'
        },
        content: {
            'zh-TW': '【使用步驟】\n1. 下載 LUUP App 並綁定信用卡。\n2. 通過交通規則測驗（需滿16歲）。\n3. 掃描車身 QR Code 解鎖。\n4. 騎乘結束後，需停在指定 Port 並拍照還車。',
            ja: '【使い方】\n1. アプリDL＆クレカ登録\n2. 交通ルールテスト合格（16歳以上）\n3. QRコードでロック解除\n4. 指定ポートに返却＆写真撮影',
            en: '1. Download App & Register.\n2. Pass traffic test (16+).\n3. Scan QR to unlock.\n4. Park at designated Port & photo to end ride.'
        },
        actionLabel: {
            'zh-TW': '打開 LUUP 地圖',
            ja: 'LUUPマップを開く',
            en: 'Open LUUP Map'
        },
        actionUrl: 'https://luup.sc/port-map/?lat=35.674441806118125&lng=139.7301796516703&zoom=14',
        excludeFromCards: true // Chat only
    },

    // Scene 8: Taxonomy - Taxi Guide (Uber/GO)
    {
        id: 'service-taxi-guide',
        trigger: {
            user_states: ['travel_style.comfort', 'travel_style.rushing']
        },
        type: 'tip',
        priority: 78,
        icon: '🚕',
        title: {
            'zh-TW': '叫車 App (Uber/GO) 使用攻略',
            ja: '配車アプリ(Uber/GO) 攻略',
            en: 'Taxi App Guide (Uber/GO)'
        },
        content: {
            'zh-TW': '【叫車技巧】\n1. 推薦使用 Uber 或 GO App。\n2. 上車點請避開店門口或狹窄巷弄，設定在「大馬路（如中央通）」側。\n3. 若無法配對，請直接前往北口實體招呼站。',
            ja: '【コツ】\n1. UberかGOを利用。\n2. 迎車位置は「大通り（中央通り）」側に設定。\n3. 捕まらない場合は北口タクシー乗り場へ。',
            en: '1. Use Uber or GO.\n2. Set pickup on main streets (e.g., Chuo-dori) to meet driver easily.\n3. If busy, go to North Exit Taxi Stand.'
        },
        // Link removed as per user request (Affiliate pending)
        excludeFromCards: true // Chat only
    },

    // Scene 9: Hatsumode (New Year Shrine Visit)
    {
        id: 'hatsumode-general-warning',
        trigger: {
            station_ids: [], // Global rule, or could be specific to Harajuku/Asakusa/Ochanomizu
            time_patterns: ['01/01-01/03'],
            keywords: ['hatsumode', 'shrine', 'temple', 'new_year', 'crowd']
        },
        type: 'seasonal',
        priority: 100, // Top priority
        icon: '⛩️',
        title: {
            'zh-TW': '初詣 (新年參拜) 人潮警示',
            ja: '初詣の混雑警報',
            en: 'Hatsumode Crowd Warning'
        },
        content: {
            'zh-TW': '【初詣期間 1/1-1/3】\n主要神社 (明治神宮、淺草寺、神田明神) 周邊將實施大規模交通管制。參拜隊伍可能長達 2-4 小時。\n建議：避開中午時段，選擇清晨或傍晚前往。攜帶暖暖包與熱飲。',
            ja: '【初詣 1/1-1/3】\n明治神宮、浅草寺などは大変混雑します。待ち時間は2〜4時間になることも。\n早朝か夕方を推奨します。防寒対策を万全に。',
            en: '【Hatsumode 1/1-1/3】\nExpect massive crowds at major shrines (Meiji Jingu, Sensoji). Wait times can exceed 2-4 hours.\nAdvice: Go early morning or evening. Dress warmly.'
        }
    },

    ...(GENERATED_KNOWLEDGE as any as ExpertKnowledge[]).filter(k => {
        // Filter out corrupted generated knowledge that has empty triggers
        const hasStations = k.trigger.station_ids && k.trigger.station_ids.length > 0;
        const hasKeywords = k.trigger.keywords && k.trigger.keywords.length > 0;
        const hasLines = k.trigger.line_ids && k.trigger.line_ids.length > 0;
        const hasTime = k.trigger.time_patterns && k.trigger.time_patterns.length > 0;
        return hasStations || hasKeywords || hasLines || hasTime;
    }),
    // Seasonal: Golden Week
    {
        id: 'seasonal-golden-week',
        trigger: {
            time_patterns: ['04/29-05/06'],
            keywords: ['crowd', 'reservation', 'shinkansen', 'travel']
        },
        type: 'warning',
        priority: 95,
        icon: '🎏',
        title: { 'zh-TW': '黃金週人潮警示', ja: 'GW混雑注意', en: 'Golden Week Alert' },
        content: {
            'zh-TW': '正值黃金週連假，各大車站與新幹線將極度擁擠。建議提前預訂指定席，或預留 1 小時以上排隊時間。',
            ja: 'GW期間中は駅や新幹線が大変混雑します。指定席の事前予約か、待ち時間を1時間以上見込んでください。',
            en: 'It\'s Golden Week. Stations and Shinkansen will be extremely crowded. Book reserved seats early or allow 1+ hour for queues.'
        }
    },
    // Seasonal: Obon
    {
        id: 'seasonal-obon',
        trigger: {
            time_patterns: ['08/13-08/16'],
            keywords: ['crowd', 'reservation', 'shinkansen', 'travel']
        },
        type: 'warning',
        priority: 95,
        icon: '🏮',
        title: { 'zh-TW': '盂蘭盆節返鄉潮', ja: 'お盆の帰省ラッシュ', en: 'Obon Travel Rush' },
        content: {
            'zh-TW': '盂蘭盆節期間新幹線與特急列車一位難求。若持大型行李，務必預約「特大行李附帶席」。',
            ja: 'お盆期間は新幹線や特急が満席になります。大きな荷物がある場合は「特大荷物スペースつき座席」を予約してください。',
            en: 'During Obon, trains are fully booked. If you have large luggage, you MUST book seats with oversized baggage space.'
        }
    },
    // Seasonal: Silver Week / September Holidays
    {
        id: 'seasonal-september-holidays',
        trigger: {
            time_patterns: ['09/19-09/23'],
            keywords: ['crowd', 'travel']
        },
        type: 'warning',
        priority: 90,
        icon: '🍁',
        title: { 'zh-TW': '秋季連假人潮', ja: 'シルバーウィーク混雑', en: 'Silver Week Crowds' },
        content: {
            'zh-TW': '秋季連假期間觀光景點周邊交通可能壅塞，建議搭乘電車並預留轉乘時間。',
            ja: '秋の連休は観光地周辺の交通が混雑します。電車を利用し、乗り換え時間に余裕を持ってください。',
            en: 'Traffic around tourist spots is heavy during Silver Week. Use trains and allow extra time for transfers.'
        }
    },
    // Payment: Universal Touch Payment (Tokyu/Keio/Toei/Keikyu)
    {
        id: 'payment-cc-touch-supported',
        trigger: {
            // Targeting key stations on these lines, or general keywords
            // Since we can't list every station, we rely on keywords + line context if available
            // or just generic payment keywords.
            keywords: ['ticket', 'payment', 'credit_card', 'card', 'ic_card', 'touch_payment', 'purchase'],
            // Approximate major lines for context if engine supports partial match, otherwise rely on keywords
            line_ids: [
                'odpt:Railway:Tokyu.Toyoko', 'odpt:Railway:Tokyu.DenEnToshi',
                'odpt:Railway:Toei.Asakusa', 'odpt:Railway:Toei.Oedo', 'odpt:Railway:Toei.Mita', 'odpt:Railway:Toei.Shinjuku',
                'odpt:Railway:Keikyu.Main', 'odpt:Railway:Keikyu.Airport',
                'odpt:Railway:Keio.Keio', 'odpt:Railway:Keio.Inokashira'
            ]
        },
        type: 'tip',
        priority: 85,
        icon: '💳',
        title: { 'zh-TW': '支援信用卡感應進站', ja: 'クレカ等のタッチ決済対応', en: 'Contactless Payment Available' },
        content: {
            'zh-TW': '本路線支援信用卡感應支付 (Touch Payment)。無需購票，直接持 Visa/Mastercard 感應專用閘門即可進出。',
            ja: 'この路線はタッチ決済に対応しています。券売機に並ばず、お手持ちのクレジットカードで改札を通過できます。',
            en: 'This line supports Contactless Payment. Skip the ticket machine and tap your credit card (Visa/Master etc.) at the gate.'
        }
    },
    // --- AIRPORT SURVIVAL TIPS (Phase 6) ---

    // 1. Haneda: Monorail vs Keikyu
    {
        id: 'hnd-transport-compare',
        trigger: {
            station_ids: ['odpt.Station:Keikyu.Main.HanedaAirportTerminal1_2', 'odpt.Station:Keikyu.Main.HanedaAirportTerminal3', 'odpt.Station:TokyoMonorail.HanedaAirport.HanedaAirportTerminal1', 'odpt.Station:TokyoMonorail.HanedaAirport.HanedaAirportTerminal2', 'odpt.Station:TokyoMonorail.HanedaAirport.HanedaAirportTerminal3'],
            keywords: ['monorail', 'keikyu', 'shinjuku', 'tokyo', 'ueno', 'comparison']
        },
        type: 'tip',
        priority: 92,
        icon: '⚖️',
        title: { 'zh-TW': '羽田交通選擇指南', ja: 'モノレール vs 京急', en: 'Haneda Transport Guide' },
        content: {
            'zh-TW': '【比較】\n🚇 京急線：直通「淺草、品川」，轉乘 JR 山手線方便。去新宿/澀谷選這條。\n🚝 單軌電車：直達「濱松町」，轉乘 JR 山手線去東京/上野較順。',
            ja: '【比較】\n🚇 京急線：浅草・品川直通。新宿・渋谷方面へは品川乗り換えが便利。\n🚝 モノレール：浜松町直結。東京・上野方面へスムーズ。',
            en: '【Compare】\n🚇 Keikyu: Direct to Asakusa/Shinagawa. Best for Shinjuku/Shibuya (transfer at Shinagawa).\n🚝 Monorail: Direct to Hamamatsucho. Best for Tokyo/Ueno.'
        }
    },
    // 2. Haneda: Late Night Access
    {
        id: 'hnd-late-night',
        trigger: {
            station_ids: ['odpt.Station:Keikyu.Main.HanedaAirportTerminal3', 'odpt.Station:TokyoMonorail.HanedaAirport.HanedaAirportTerminal3'],
            time_patterns: ['23:00-05:00'],
            keywords: ['late', 'night', 'taxi', 'hotel']
        },
        type: 'warning',
        priority: 95,
        icon: '🌙',
        title: { 'zh-TW': '羽田深夜交通注意', ja: '羽田深夜アクセス', en: 'Haneda Late Night' },
        content: {
            'zh-TW': '【23:30 後】電車大多收班。\n1. 深夜巴士：需事先預約。\n2. 計程車：至新宿約 8,000-10,000 日圓。\n3. 住宿：T3 直結飯店或機場內膠囊旅館 (First Cabin)。',
            ja: '【23:30以降】電車はほぼ終了です。\n1. 深夜バス（要予約）\n2. タクシー（新宿まで約1万円）\n3. 宿泊（第3ターミナル直結ホテル/カプセルホテル）',
            en: '【After 23:30】Trains stop.\n1. Night Bus (Book ahead).\n2. Taxi (~10k JPY to Shinjuku).\n3. Stay: T3 Hotel or First Cabin inside airport.'
        }
    },
    // 3. Narita: Skyliner vs N'EX
    {
        id: 'nrt-transport-compare',
        trigger: {
            station_ids: ['odpt.Station:Keisei.KeiseiMain.NaritaAirport', 'odpt.Station:JR-East.NaritaLine.NaritaAirportTerminal1', 'odpt.Station:JR-East.NaritaLine.NaritaAirportTerminal2_3'],
            keywords: ['skyliner', 'nex', 'express', 'shinjuku', 'ueno', 'comparison']
        },
        type: 'tip',
        priority: 92,
        icon: '🚄',
        title: { 'zh-TW': '成田特急選擇指南', ja: 'Skyliner vs N\'EX', en: 'Narita Express Guide' },
        content: {
            'zh-TW': '【比較】\n🦅 Skyliner：最快 (40分)，直達「上野/日暮里」。去淺草/銀座方便。\n🔴 N\'EX：直達「東京/新宿/澀谷」，不用轉車但較慢 (60-90分)。',
            ja: '【比較】\n🦅 Skyliner：最速 (40分)。上野・日暮里直結。\n🔴 N\'EX：東京・新宿・渋谷へ乗換なし (60-90分)。',
            en: '【Compare】\n🦅 Skyliner: Fastest (40m) to Ueno/Nippori.\n🔴 N\'EX: Direct to Tokyo/Shinjuku/Shibuya (No transfer, 60-90m).'
        }
    },
    // 4. Narita: Terminal 3 "Trap"
    {
        id: 'nrt-t3-access',
        trigger: {
            station_ids: ['odpt.Station:Keisei.KeiseiMain.NaritaAirport', 'odpt.Station:JR-East.NaritaLine.NaritaAirportTerminal2_3'],
            keywords: ['terminal_3', 'beacon', 'lcc', 'jetstar', 'spring']
        },
        type: 'warning',
        priority: 90,
        icon: '🏃',
        title: { 'zh-TW': 'T3 (廉航) 步行警示', ja: '第3ターミナル移動注意', en: 'T3 Access Warning' },
        content: {
            'zh-TW': '電車只停 T2！前往 T3 (Jetstar/Spring/Jeju) 需從 T2 出站後：\n1. 步行：約 600m (15分鐘)，沿著藍色跑道走。\n2. 接駁巴士：約 5-10 分鐘一班。請預留額外時間。',
            ja: '電車はT2止まりです！T3 (LCC) へはT2下車後：\n1. 徒歩：約15分 (600m)\n2. 連絡バス：5-10分間隔。時間に余裕を！',
            en: 'Trains stop at T2 Only! For T3 (LCC):\n1. Walk: ~15 mins (600m) follow blue track.\n2. Shuttle Bus: Every 5-10 mins. Allow extra time!'
        }
    },
    // Payment: JR East Trap
    {
        id: 'payment-cc-jr-trap',
        trigger: {
            keywords: ['ticket', 'payment', 'credit_card', 'card', 'touch_payment'],
            line_ids: ['odpt:Railway:JR-East.Yamanote', 'odpt:Railway:JR-East.Chuo', 'odpt:Railway:JR-East.Sobu', 'odpt:Railway:JR-East.KeihinTohoku']
        },
        type: 'warning',
        priority: 88,
        icon: '⚠️',
        title: { 'zh-TW': 'JR 線不支援信用卡感應', ja: 'JRはタッチ決済非対応', en: 'JR: No Credit Card Tap' },
        content: {
            'zh-TW': 'JR 線改札口「不支援」信用卡直接感應。請使用 Suica、Mobile Suica 或購買實體車票。',
            ja: 'JR線の改札はクレジットカードのタッチ決済に対応していません。Suicaまたは切符をご利用ください。',
            en: 'JR gates DO NOT accept credit card tap. You MUST use a Suica card, Mobile Suica, or buy a paper ticket.'
        }
    },
    // Payment: Haneda Access Tip (Keikyu)
    {
        id: 'payment-haneda-keikyu',
        trigger: {
            station_ids: ['odpt.Station:Keikyu.Main.HanedaAirportTerminal1_2', 'odpt.Station:Keikyu.Main.HanedaAirportTerminal3'],
            keywords: ['ticket', 'airport', 'haneda']
        },
        type: 'tip',
        priority: 90,
        icon: '✈️',
        title: { 'zh-TW': '機場快線感應支付', ja: '空港線はタッチ決済OK', en: 'Airport Line Contactless' },
        content: {
            'zh-TW': '京急線往市區可直接使用信用卡感應進站，無需排隊買票或儲值 IC 卡。',
            ja: '京急線はクレジットカードのタッチ決済で乗車できます。券売機に並ぶ必要はありません。',
            en: 'Keikyu Line to the city accepts credit card touch payment. No need to buy a ticket or charge an IC card.'
        }
    },
    // Payment: General Guide
    {
        id: 'payment-cc-general-guide',
        trigger: {
            keywords: ['credit_card', 'visa', 'mastercard', 'touch_payment']
        },
        type: 'info',
        priority: 70,
        icon: 'ℹ️',
        title: { 'zh-TW': '關於信用卡感應乘車', ja: 'タッチ決済について', en: 'About Touch Payment' },
        content: {
            'zh-TW': '東京私鐵 (東急/京王/京急) 與都營地鐵已開放感應支付。JR 線目前仍需使用 Suica 或實體票。東京 Metro 預計 2026 春季全面開放。',
            ja: '東急・京王・京急・都営地下鉄はタッチ決済が可能です。JRは非対応です。東京メトロは2026年春に全駅対応予定です。',
            en: 'Private lines (Tokyu/Keio/Keikyu) & Toei Subway accept touch payment. JR does NOT. Tokyo Metro follows in Spring 2026.'
        }
    }
];

// ==========================================
// Legacy Data Support (DEPRECATED)
// ==========================================
// Kept to prevent build errors in existing files:
// - src/app/api/agent/chat/route.ts
// - src/lib/ai/strategyEngine.ts
// etc.

export interface StationWisdomData {
    traps: { title: string; content?: string; advice: string; severity: 'critical' | 'high' | 'medium' }[];
    hacks: { title: string; content: string; type: 'ticket' | 'route' | 'facility' }[];
    l3Facilities: { type: string; location: any; attributes?: any }[];
    accessibilityRoutes?: any[];
}

export const STATION_WISDOM: Record<string, StationWisdomData> = {
    // Empty mock to satisfy TS. Real data migrated to KNOWLEDGE_BASE.
    'odpt:Station:TokyoMetro.Ueno': {
        traps: [
            { title: 'Legacy Trap', content: 'Deprecated', advice: 'Use KNOWLEDGE_BASE instead', severity: 'medium' }
        ],
        hacks: [
            { title: 'Accessibility', content: '輪椅使用者請務必使用「公園口」或「不忍口」，中央口只有樓梯。', type: 'route' },
            { title: 'Luggage', content: '新幹線轉乘口旁有大型Sagawa寄放中心，比置物櫃好用。', type: 'facility' },
            { title: 'Park Exit', content: '上野公園口 (Park Exit) 是去動物園最近的出口，且全程有手扶梯。', type: 'route' }
        ],
        l3Facilities: [],
        accessibilityRoutes: []
    },
    'odpt.Station:TokyoMetro.Ginza.Ueno': {
        traps: [],
        hacks: [
            { title: 'Accessibility', content: '輪椅使用者請務必使用「公園口」或「不忍口」，中央口只有樓梯。', type: 'route' },
            { title: 'Luggage', content: '新幹線轉乘口旁有大型Sagawa寄放中心，比置物櫃好用。', type: 'facility' },
            { title: 'Park Exit', content: '上野公園口 (Park Exit) 是去動物園最近的出口，且全程有手扶梯。', type: 'route' }
        ],
        l3Facilities: [],
        accessibilityRoutes: []
    }
};
