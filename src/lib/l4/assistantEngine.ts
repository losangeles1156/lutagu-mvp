import { DEMO_SCENARIOS, DemoScenario } from './demoScenarios';

export type SupportedLocale = 'zh' | 'zh-TW' | 'ja' | 'en';

export type L4IntentKind = 'fare' | 'timetable' | 'route' | 'status' | 'amenity' | 'unknown';

export type L4TemplateCategory = 'basic' | 'advanced' | 'feature';

export type L4QuestionTemplate = {
    id: string;
    category: L4TemplateCategory;
    kind: Exclude<L4IntentKind, 'unknown'>;
    title: string;
    text: string;
    description?: string;
    preset?: {
        originStationId?: string;
        destinationStationId?: string;
        demand?: Partial<L4DemandState>;
        run?: boolean;
    };
};

export type L4DemandState = {
    // 無障礙需求 (Accessibility)
    wheelchair: boolean;
    stroller: boolean;
    vision: boolean;
    senior: boolean;

    // 行李狀態 (Luggage)
    largeLuggage: boolean;
    lightLuggage: boolean;

    // 行程偏好 (Preferences)
    rushing: boolean;
    budget: boolean;
    comfort: boolean;
    avoidCrowds: boolean;
    avoidRain: boolean;
};

export type L4DataSource =
    | { type: 'odpt:RailwayFare'; verified: boolean }
    | { type: 'odpt:StationTimetable'; verified: boolean }
    | { type: 'odpt:Railway'; verified: boolean };

export type L4Suggestion = {
    title: string;
    options: RouteOption[];
};

export function normalizeOdptStationId(input: string): string {
    return input.replace(/^odpt:Station:/, 'odpt.Station:').trim();
}

export function extractOdptStationIds(text: string): string[] {
    const ids = new Set<string>();
    const re = /(odpt[.:]Station:[A-Za-z0-9_.-]+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
        ids.add(normalizeOdptStationId(m[1]));
    }
    return Array.from(ids);
}

export function inferOdptOperatorFromStationId(stationId: string): string | null {
    const id = stationId;
    if (id.includes('Toei')) return 'odpt.Operator:Toei';
    if (id.includes('TokyoMetro')) return 'odpt.Operator:TokyoMetro';
    if (id.includes('JR-East')) return 'odpt.Operator:JR-East';
    if (id.includes('MIR')) return 'odpt.Operator:MIR';
    return null;
}

export function findDemoScenario(text: string): DemoScenario | undefined {
    const trimmed = text.trim();
    return DEMO_SCENARIOS.find(s => 
        s.triggerQuestion === trimmed || 
        s.title === trimmed ||
        s.triggerQuestions?.some(q => q === trimmed)
    );
}

export function classifyQuestion(text: string, locale: SupportedLocale): { kind: L4IntentKind; toStationId?: string } {
    const trimmed = String(text || '').trim();
    const lower = trimmed.toLowerCase();
    const ids = extractOdptStationIds(trimmed);

    const hasFare =
        lower.includes('fare') ||
        lower.includes('ticket') ||
        lower.includes('price') ||
        trimmed.includes('票價') ||
        trimmed.includes('運賃') ||
        trimmed.includes('料金');

    const hasTimetable =
        lower.includes('timetable') ||
        lower.includes('schedule') ||
        lower.includes('next train') ||
        trimmed.includes('時刻表') ||
        trimmed.includes('下一班') ||
        trimmed.includes('終電') ||
        trimmed.includes('始發') ||
        trimmed.includes('時刻') ||
        trimmed.includes('ダイヤ');

    const hasRoute =
        lower.includes('transfer') ||
        lower.includes('route') ||
        lower.includes('how to get') ||
        lower.includes('directions') ||
        lower.includes('airport') ||
        trimmed.includes('轉乘') ||
        trimmed.includes('換乘') ||
        trimmed.includes('怎麼去') ||
        trimmed.includes('如何去') ||
        trimmed.includes('乘換') ||
        trimmed.includes('乗換') ||
        trimmed.includes('機場');

    const hasStatus =
        lower.includes('status') ||
        lower.includes('delay') ||
        trimmed.includes('延誤') ||
        trimmed.includes('誤點') ||
        trimmed.includes('狀態') ||
        trimmed.includes('運行');

    const hasAmenity =
        lower.includes('locker') ||
        lower.includes('elevator') ||
        lower.includes('toilet') ||
        trimmed.includes('置物櫃') ||
        trimmed.includes('電梯') ||
        trimmed.includes('廁所') ||
        trimmed.includes('輪椅') ||
        trimmed.includes('嬰兒車');

    const toStationId = ids.length > 0 ? ids[ids.length - 1] : undefined;

    if (hasStatus) return { kind: 'status', toStationId };
    if (hasAmenity) return { kind: 'amenity', toStationId };
    if (hasTimetable) return { kind: 'timetable' };
    if (hasFare) return { kind: 'fare', toStationId };
    if (hasRoute) return { kind: 'route', toStationId };

    if (locale?.startsWith('zh')) {
        if (trimmed.includes('票') || trimmed.includes('價')) return { kind: 'fare', toStationId };
        if (trimmed.includes('車') && trimmed.includes('幾點')) return { kind: 'timetable' };
    }

    return { kind: 'unknown' };
}

export function filterFaresForOrigin<T extends { [k: string]: any }>(fares: T[], originStationId: string): T[] {
    const origin = normalizeOdptStationId(originStationId);
    return (fares || []).filter(f => normalizeOdptStationId(String(f?.['odpt:fromStation'] || '')) === origin);
}

export function filterTimetablesForStation<T extends { [k: string]: any }>(timetables: T[], stationId: string): T[] {
    const station = normalizeOdptStationId(stationId);
    return (timetables || []).filter(t => normalizeOdptStationId(String(t?.['odpt:station'] || '')) === station);
}

export function buildL4DefaultQuestionTemplates(params: {
    originStationId: string;
    locale: SupportedLocale;
}): L4QuestionTemplate[] {
    const origin = normalizeOdptStationId(params.originStationId);
    const locale = params.locale;

    const exampleDestination = 'odpt.Station:TokyoMetro.Marunouchi.Tokyo';
    const dest = exampleDestination;

    const t = (zh: string, ja: string, en: string) => (locale === 'ja' ? ja : locale === 'en' ? en : zh);
    const fareText = t(
        `票價 from: ${origin} to: ${dest}`,
        `運賃 from: ${origin} to: ${dest}`,
        `Fare from: ${origin} to: ${dest}`
    );
    const timetableText = t(
        `時刻表 station: ${origin}`,
        `時刻表 station: ${origin}`,
        `Timetable station: ${origin}`
    );
    const routeText = t(
        `怎麼去 ${dest} from: ${origin}`,
        `${dest} まで行きたい from: ${origin}`,
        `How to get to ${dest} from: ${origin}`
    );

    const featureTemplates: L4QuestionTemplate[] = [
        {
            id: 'demo-01',
            category: 'feature',
            kind: 'route',
            title: t('演示：過度觀光建議', 'デモ：オーバーツーリズム', 'Demo: Overtourism'),
            text: t(
                '淺草寺這裡人潮多到有點不舒服，附近有沒有人少一點，但也能感受江戶風情的地方？',
                '浅草寺は混雑していて少し疲れます。近くで混雑が少なく、江戸情緒を感じられる場所はありますか？',
                'Senso-ji is so crowded it feels a bit uncomfortable. Is there somewhere nearby that is less crowded but still has that Edo period atmosphere?'
            ),
            description: t('避開人潮也能感受江戶風情', '混雑回避で江戸情緒', 'Avoid crowds, keep Edo vibes'),
            preset: { demand: { avoidCrowds: true, comfort: true } }
        },
        {
            id: 'demo-02',
            category: 'feature',
            kind: 'status',
            title: t('演示：交通中斷應變', 'デモ：交通障害対応', 'Demo: Disruption'),
            text: t(
                '我要從東京車站去東京都廳看夜景，但聽說中央線現在大誤點，該怎麼辦？',
                '東京駅から東京都庁へ夜景を見に行きたいのですが、中央線が大幅に遅れていると聞きました。どうすればいいですか？',
                'I want to go from Tokyo Station to the Tokyo Metropolitan Government Building for the night view, but I heard the Chuo Line is heavily delayed. What should I do?'
            ),
            description: t('遇到誤點時的替代方案', '遅延時の代替案', 'Alternatives during delays')
        },
        {
            id: 'demo-03',
            category: 'feature',
            kind: 'amenity',
            title: t('演示：空手觀光服務', 'デモ：手ぶら観光', 'Demo: Hands-free'),
            text: t(
                '我剛從成田機場到淺草，但飯店下午才能進房，淺草站的置物櫃還有位子嗎？',
                '成田空港から浅草に着いたばかりですが、ホテルへのチェックインは午後からです。浅草駅のコインロッカーに空きはありますか？',
                'I just arrived in Asakusa from Narita Airport, but I can\'t check into my hotel until this afternoon. Are there any lockers available at Asakusa Station?'
            ),
            description: t('先寄放行李再逛街', '荷物を預けて観光', 'Store luggage and explore'),
            preset: { demand: { largeLuggage: true } }
        },
        {
            id: 'demo-04',
            category: 'feature',
            kind: 'amenity',
            title: t('演示：無障礙規劃', 'デモ：バリアフリー', 'Demo: Accessibility'),
            text: t(
                '我推著嬰兒車要去上野動物園，請問搭到上野站要從哪個出口出來最方便？',
                'ベビーカーで上野動物園に行きたいのですが、上野駅のどの出口から出るのが一番便利ですか？',
                'I\'m going to Ueno Zoo with a stroller. Which exit at Ueno Station is the most convenient?'
            ),
            description: t('推嬰兒車的友善路線', 'ベビーカー向け', 'Stroller-friendly route'),
            preset: { demand: { stroller: true, comfort: true } }
        }
    ];

    return [
        ...featureTemplates,
        {
            id: 'basic-fare',
            category: 'basic',
            kind: 'fare',
            title: t('查票價（本站 → 東京）', '運賃（この駅 → 東京）', 'Fare (this station → Tokyo)'),
            text: fareText,
            description: t('選好目的地就能直接計算', '目的地を選べばすぐ計算', 'Pick a destination and calculate'),
            preset: { originStationId: origin, destinationStationId: dest }
        },
        {
            id: 'basic-timetable',
            category: 'basic',
            kind: 'timetable',
            title: t('查時刻表（本站）', '時刻表（この駅）', 'Timetable (this station)'),
            text: timetableText,
            description: t('查看下一班車與方向', '次の電車と方面', 'Next trains and directions'),
            preset: { originStationId: origin }
        },
        {
            id: 'basic-route',
            category: 'basic',
            kind: 'route',
            title: t('查路線（本站 → 東京）', '経路（この駅 → 東京）', 'Route (this station → Tokyo)'),
            text: routeText,
            description: t('少轉乘、可依需求調整', '乗換少なめ、条件で調整', 'Fewer transfers; adjust by needs'),
            preset: { originStationId: origin, destinationStationId: dest, demand: { comfort: true } }
        },
        {
            id: 'adv-fare-ic',
            category: 'advanced',
            kind: 'fare',
            title: t('票價：IC/車票比對（示例）', '運賃：IC/切符の比較（例）', 'Fares: IC vs ticket (example)'),
            text: fareText
        },
        {
            id: 'adv-timetable-weekend',
            category: 'advanced',
            kind: 'timetable',
            title: t('時刻表：平日/假日差異', '時刻表：平日/休日の違い', 'Timetable: weekday vs holiday'),
            text: timetableText
        },
        {
            id: 'adv-route-transfer',
            category: 'advanced',
            kind: 'route',
            title: t('路線：轉乘建議（示例）', '経路：乗換案内（例）', 'Route: transfer suggestions (example)'),
            text: routeText
        },
        {
            id: 'feature-verified-fare',
            category: 'feature',
            kind: 'fare',
            title: t('系統特色：顯示資料來源與驗證', '特徴：データソースと検証表示', 'Feature: sources & verification'),
            text: fareText
        },
        {
            id: 'feature-passive-timetable',
            category: 'feature',
            kind: 'timetable',
            title: t('系統特色：被動觸發（範例查詢）', '特徴：パッシブ起動（例）', 'Feature: passive trigger (example)'),
            text: timetableText
        },
        {
            id: 'feature-isolation-route',
            category: 'feature',
            kind: 'route',
            title: t('系統特色：跨站隔離（範例查詢）', '特徴：駅ごとの分離（例）', 'Feature: station isolation (example)'),
            text: routeText
        }
    ];
}

export type RailwayTopology = {
    railwayId: string;
    operator: string;
    title?: { en?: string; ja?: string };
    stationOrder: Array<{ index: number; station: string; title?: { en?: string; ja?: string } }>;
};

export type RouteOption = {
    label: string;
    steps: string[];
    sources: L4DataSource[];
    railways?: string[]; // Added to track railways in the route
    fare?: { ic: number; ticket: number };
    duration?: number;
    transfers?: number;
    nextDeparture?: string;
};

export type EnrichedRouteOption = RouteOption & {
    transfers: number;
    fare?: { ic: number; ticket: number };
    duration?: number;
    nextDeparture?: string;
};

// Expert Knowledge Repository
const EXPERT_KNOWLEDGE: Record<string, string[]> = {
    // --- Railways ---
    'odpt.Railway:TokyoMetro.Ginza': [
        '💡 銀座線是最古老的地鐵，月台較窄，攜帶大行李時請多留意。',
        '💡 銀座線車廂較小，尖峰時段非常擁擠。',
        '🎫 適合使用「東京地鐵 24/48/72 小時券」，單日搭乘 3 次以上即划算。'
    ],
    'odpt.Railway:TokyoMetro.Marunouchi': [
        '💡 丸之內線部分車站月台與車廂間隙較大，推嬰兒車請小心。',
        '💡 在赤坂見附站可與銀座線進行「零距離」同月台轉乘。'
    ],
    'odpt.Railway:JR-East.Yamanote': [
        '💡 山手線為環狀線，轉乘其他 JR 線路通常不需出站。',
        '💡 尖峰時段（08:00-09:30）建議避開新宿、澀谷等大站。',
        '🎫 適合使用「JR 都區內巴士地鐵一日券」或單純 Suica。'
    ],
    'odpt.Railway:TokyoMetro.Fukutoshin': [
        '💡 副都心線與東急東橫線、西武有樂町線直通運轉，需注意終點站。',
        '💡 月台通常位於地下深處，轉乘請預留足夠時間。'
    ],

    // --- Stations ---
    'odpt.Station:TokyoMetro.Ginza.Asakusa': [
        '💡 淺草站 1 號出口最靠近雷門。',
        '💡 淺草站與東武線轉乘需出站，請預留 5-10 分鐘。',
        '📦 置物櫃指南：若淺草站內置物櫃已滿，可前往「淺草文化觀光中心」或雷門對面的專用行李寄放店，通常空間較充裕。'
    ],
    'odpt.Station:TokyoMetro.Ginza.Ueno': [
        '💡 上野站 3 號出口有電梯，適合大行李與嬰兒車使用者。',
        '💡 轉乘日比谷線需經過一段較長的地下通道。',
        '🦽 無障礙動線：從銀座線前往 JR 上野站，建議使用「不忍口」方向的電梯最為順暢。'
    ],
    'odpt.Station:TokyoMetro.Hibiya.Roppongi': [
        '💡 六本木站日比谷線月台非常深，建議使用電梯。'
    ],
    'odpt.Station:JR-East.Yamanote.Shibuya': [
        '⚠️ 澀谷站正在進行長期整修工程（至 2027 年），動線頻繁變動且較擁擠。',
        '💡 JR 澀谷站與副都心線轉乘距離極長（徒步約 10-15 分鐘），建議預留緩衝。',
        '💡 埼京線月台已移至山手線旁，不再需要長距離步行。'
    ],
    'odpt.Station:JR-East.Yamanote.Shinjuku': [
        '⚠️ 新宿站是世界最繁忙車站，共有超過 200 個出口，請務必確認目標出口名稱。',
        '💡 「西口」與「東口」之間可透過「東西自由通路」直接穿過，無需購買月台票。',
        '💡 轉乘京王線或小田急線有專用的轉乘剪票口，不需先出站。'
    ],
    'odpt.Station:JR-East.Yamanote.Tokyo': [
        '💡 東京站是轉乘新幹線的主要站點，建議從「中央線」月台前往新幹線需約 10 分鐘。',
        '💡 京葉線（前往迪士尼）月台位於地下深處，距離山手線月台步行約 15-20 分鐘。',
        '💡 站內「GranSta」商場有豐富的鐵路便當與伴手禮。'
    ],
    'odpt.Station:TokyoMetro.Marunouchi.Ikebukuro': [
        '💡 池袋站動線複雜，主要分為東口（西武百貨）與西口（東武百貨），容易搞混。',
        '💡 轉乘有樂町線或副都心線需步行一段距離。'
    ],
    // --- Special Locations & Lines ---
    'odpt.Railway:JR-East.Chuo': [
        '⚠️ 中央線（快速）班次密集但容易受人身事故影響導致延誤。',
        '💡 前往新宿御苑建議在「新宿門」下車，步行約 10 分鐘。'
    ],
    'Narita-Airport': [
        '✈️ 成田機場交通建議：帶嬰兒車最輕鬆的方式是搭乘「Skyliner」（上野/日暮里直達）或「成田特快 N\'EX」（新宿/東京直達），全車對號座且行李空間大。',
        '💡 若目的地是淺草，搭乘「京成 Access 特急」可直達，不需轉乘但人潮較多。'
    ]
};

// Pass Knowledge Repository
const PASS_KNOWLEDGE: Array<{
    id: string;
    name: string;
    price: string;
    rule: string;
    advice: string;
}> = [
    {
        id: 'tokyo-subway-ticket',
        name: 'Tokyo Subway Ticket (24/48/72h)',
        price: '¥800 / ¥1200 / ¥1500',
        rule: '可無限次搭乘全線東京地鐵 (Tokyo Metro) 與都營地鐵。',
        advice: '平均一天搭乘 3 次以上即划算，不含 JR 線路。'
    },
    {
        id: 'tokunai-pass',
        name: 'JR 都區內一日券 (Tokunai Pass)',
        price: '¥760',
        rule: '可無限次搭乘東京 23 區內的 JR 普通與快速列車。',
        advice: '適合整天都在山手線或中央線周邊活動的旅客。'
    },
    {
        id: 'greater-tokyo-pass',
        name: 'Greater Tokyo Pass (3 Days)',
        price: '¥7200',
        rule: '涵蓋 13 家私鐵公司與都營巴士，但不含 JR。',
        advice: '適合前往鎌倉、秩父等郊區且不搭乘 JR 的深度旅遊。'
    }
];

// Accessibility Advice Repository
const ACCESSIBILITY_ADVICE: Record<string, Record<string, string>> = {
    'odpt.Station:TokyoMetro.Ginza.Ueno': {
        'wheelchair': '🛗 上野站 3 號出口設有大型無障礙電梯。',
        'stroller': '🛗 上野站 3 號出口有寬敞電梯，方便推車進出。',
        'largeLuggage': '🛗 上野站 3 號出口有直達地面的電梯。'
    },
    'odpt.Station:TokyoMetro.Ginza.Asakusa': {
        'wheelchair': '🛗 淺草站 1 號出口設有電梯。',
        'stroller': '🛗 淺草站 1 號出口有電梯。',
        'largeLuggage': '🛗 淺草站 1 號出口有電梯。'
    },
    'odpt.Station:JR-East.Yamanote.Shibuya': {
        'wheelchair': '🛗 建議使用「澀谷 Scramble Square」內的電梯連通地下與地上層。',
        'stroller': '🛗 澀谷站動線複雜，電梯通常位於角落，請預留找路時間。',
        'largeLuggage': '🛗 建議利用「Shibuya Stream」出口方向的電梯，人潮較少。'
    },
    'odpt.Station:JR-East.Yamanote.Shinjuku': {
        'wheelchair': '🛗 新宿站「南口」動線相對較新且無障礙設施較完善。',
        'stroller': '🛗 避開新宿站地下街人潮，建議從路面層移動。',
        'largeLuggage': '🛗 JR 新宿站南口與新南口之間有完善的電梯系統。'
    }
};

function buildAdjacency(railways: RailwayTopology[]) {
    const adj = new Map<string, Array<{ to: string; railwayId: string }>>();
    const addEdge = (a: string, b: string, railwayId: string) => {
        if (!adj.has(a)) adj.set(a, []);
        adj.get(a)!.push({ to: b, railwayId });
    };

    for (const r of railways) {
        const stations = r.stationOrder
            .slice()
            .sort((x, y) => x.index - y.index)
            .map(s => normalizeOdptStationId(s.station));
        for (let i = 0; i < stations.length - 1; i++) {
            const a = stations[i];
            const b = stations[i + 1];
            addEdge(a, b, r.railwayId);
            addEdge(b, a, r.railwayId);
        }
    }

    return adj;
}

export function findSimpleRoutes(params: {
    originStationId: string;
    destinationStationId: string;
    railways: RailwayTopology[];
    maxHops?: number;
    locale?: SupportedLocale;
}): RouteOption[] {
    const origin = normalizeOdptStationId(params.originStationId);
    const dest = normalizeOdptStationId(params.destinationStationId);
    const maxHops = Math.max(4, params.maxHops ?? 22);
    const railways = params.railways || [];
    const locale = params.locale || 'zh-TW';

    const t = (zh: string, ja: string, en: string) => (locale === 'ja' ? ja : locale === 'en' ? en : zh);

    const adj = buildAdjacency(railways);
    const queue: Array<{ station: string; path: string[]; usedRailways: string[] }> = [{
        station: origin,
        path: [origin],
        usedRailways: []
    }];
    const visited = new Set<string>([origin]);

    const results: Array<{ path: string[]; railways: string[] }> = [];
    while (queue.length > 0 && results.length < 3) {
        const current = queue.shift()!;
        if (current.path.length > maxHops) continue;
        if (current.station === dest) {
            results.push({ path: current.path, railways: current.usedRailways });
            continue;
        }
        const edges = adj.get(current.station) || [];
        for (const e of edges) {
            const key = `${current.station}->${e.to}`;
            if (visited.has(key)) continue;
            visited.add(key);
            queue.push({
                station: e.to,
                path: [...current.path, e.to],
                usedRailways: [...current.usedRailways, e.railwayId]
            });
        }
    }

    return results.map((res, idx) => {
        const label = t(`方案 ${String.fromCharCode(65 + idx)}`, `ルート ${String.fromCharCode(65 + idx)}`, `Option ${String.fromCharCode(65 + idx)}`);
        
        // Generate more descriptive steps
        const steps: string[] = [];
        steps.push(`${t('🏠 出發', '🏠 出発', '🏠 Origin')}: ${origin.split(':').pop()}`);
        
        // Group by railway to show line changes
        let currentRailway = '';
        let segmentStart = res.path[0];
        
        for (let i = 0; i < res.railways.length; i++) {
            const rw = res.railways[i];
            if (rw !== currentRailway) {
                if (currentRailway !== '') {
                    const prevStation = res.path[i];
                    steps.push(`${t('🚃 乘坐', '🚃 乗車', '🚃 Take')} ${currentRailway.split(':').pop()}: ${segmentStart.split(':').pop()} → ${prevStation.split(':').pop()}`);
                }
                currentRailway = rw;
                segmentStart = res.path[i];
            }
        }
        // Last segment
        steps.push(`${t('🚃 乘坐', '🚃 乗車', '🚃 Take')} ${currentRailway.split(':').pop()}: ${segmentStart.split(':').pop()} → ${res.path[res.path.length - 1].split(':').pop()}`);
        
        steps.push(`${t('📍 到達', '📍 到着', '📍 Destination')}: ${dest.split(':').pop()}`);

        return {
            label,
            steps,
            sources: [{ type: 'odpt:Railway', verified: true }],
            railways: Array.from(new Set(res.railways))
        };
    });
}

export function buildAmenitySuggestion(params: {
    stationId: string;
    text: string;
    demand: L4DemandState;
    verified: boolean;
}): L4Suggestion {
    const text = params.text.toLowerCase();
    const stationId = normalizeOdptStationId(params.stationId);
    const expertTips: string[] = [];

    // 1. Generic Amenity Knowledge
    if (text.includes('置物櫃') || text.includes('locker')) {
        expertTips.push('💡 提示：車站內的置物櫃通常在上午 10 點前就會客滿，建議利用站外的行李寄放服務。');
    }
    if (text.includes('電梯') || text.includes('elevator') || text.includes('輪椅') || text.includes('嬰兒車')) {
        expertTips.push('💡 提示：日本車站電梯通常位於月台中段或特定車廂位置，請留意月台上的標示。');
    }

    // 2. Station Specific Amenity Knowledge
    if (EXPERT_KNOWLEDGE[stationId]) {
        expertTips.push(...EXPERT_KNOWLEDGE[stationId].filter(tip => 
            tip.includes('置物櫃') || tip.includes('🦽') || tip.includes('電梯') || tip.includes('📦')
        ));
    }

    // 3. Accessibility Advice based on demand
    const advice = ACCESSIBILITY_ADVICE[stationId];
    if (advice) {
        if (params.demand.wheelchair && advice.wheelchair) expertTips.push(advice.wheelchair);
        if (params.demand.stroller && advice.stroller) expertTips.push(advice.stroller);
    }

    return {
        title: '設施與無障礙建議',
        options: [
            {
                label: '查詢結果',
                steps: expertTips.length > 0 ? expertTips : ['目前無特定設施建議，請參考車站平面圖。'],
                sources: [{ type: 'odpt:Railway', verified: params.verified }]
            }
        ]
    };
}

export function buildStatusSuggestion(params: {
    stationId: string;
    text: string;
    verified: boolean;
}): L4Suggestion {
    const text = params.text.toLowerCase();
    const stationId = normalizeOdptStationId(params.stationId);
    const expertTips: string[] = [];

    // 1. Line specific status knowledge
    if (text.includes('中央線') || text.includes('chuo')) {
        expertTips.push(...(EXPERT_KNOWLEDGE['odpt.Railway:JR-East.Chuo'] || []));
    }

    return {
        title: '運行狀態與提醒',
        options: [
            {
                label: '實時提醒',
                steps: [
                    '🔍 正在調用 L2 實時 API 獲取最新運行狀態...',
                    ...expertTips
                ],
                sources: [{ type: 'odpt:Railway', verified: params.verified }]
            }
        ]
    };
}

export function buildFareSuggestion(params: {
    originStationId: string;
    destinationStationId?: string;
    demand: L4DemandState;
    verified: boolean;
}): L4Suggestion {
    const sources: L4DataSource[] = [{ type: 'odpt:RailwayFare', verified: params.verified }];
    const notes: string[] = [];
    if (params.demand.budget) notes.push('以車票/IC 價差為優先比較基準。');
    if (params.demand.largeLuggage || params.demand.stroller || params.demand.wheelchair) {
        notes.push('若需無障礙/大行李，票價相同時優先「少轉乘」。');
    }
    if (params.demand.rushing) notes.push('趕時間時優先「直達或少轉乘」方案。');

    const dest = params.destinationStationId ? normalizeOdptStationId(params.destinationStationId) : '（未指定）';
    return {
        title: '票價建議',
        options: [
            {
                label: '查詢條件',
                steps: [`from: ${normalizeOdptStationId(params.originStationId)}`, `to: ${dest}`, ...notes],
                sources
            }
        ]
    };
}

export function buildTimetableSuggestion(params: {
    stationId: string;
    demand: L4DemandState;
    verified: boolean;
}): L4Suggestion {
    const sources: L4DataSource[] = [{ type: 'odpt:StationTimetable', verified: params.verified }];
    const notes: string[] = [];
    if (params.demand.rushing) notes.push('趕時間：以「最近 1–3 班」為主。');
    if (params.demand.largeLuggage || params.demand.stroller || params.demand.wheelchair) {
        notes.push('行李/無障礙：可搭配「電梯動線」優先選擇出口與月台。');
    }
    return {
        title: '時刻表建議',
        options: [
            {
                label: '查詢條件',
                steps: [`station: ${normalizeOdptStationId(params.stationId)}`, '顯示平日/假日兩套班次', ...notes],
                sources
            }
        ]
    };
}

export function buildRouteSuggestion(params: {
    originStationId: string;
    destinationStationId: string;
    demand: L4DemandState;
    verified: boolean;
    options: RouteOption[];
    text?: string; // Added to capture intent
}): L4Suggestion {
    const baseSources: L4DataSource[] = [{ type: 'odpt:Railway', verified: params.verified }];
    const text = (params.text || '').toLowerCase();

    return {
        title: '轉乘/路線建議',
        options: params.options.map(o => {
            const notes: string[] = [];
            const expertTips: string[] = [];
            const accessibilityTips: string[] = [];

            // 0. Special Location Recognition (e.g. Airport)
            if (text.includes('機場') || text.includes('airport') || text.includes('narita')) {
                expertTips.push(...(EXPERT_KNOWLEDGE['Narita-Airport'] || []));
            }

            // 1. Collect Expert Knowledge based on railways and stations
            const stations = [normalizeOdptStationId(params.originStationId), normalizeOdptStationId(params.destinationStationId)];
            const railways = o.railways || [];

            railways.forEach(rw => {
                if (EXPERT_KNOWLEDGE[rw]) {
                    expertTips.push(...EXPERT_KNOWLEDGE[rw]);
                }
            });

            stations.forEach(st => {
                if (EXPERT_KNOWLEDGE[st]) {
                    expertTips.push(...EXPERT_KNOWLEDGE[st]);
                }
            });

            // 2. Collect Accessibility Advice based on demand
            stations.forEach(st => {
                const advice = ACCESSIBILITY_ADVICE[st];
                if (advice) {
                    if (params.demand.wheelchair && advice.wheelchair) accessibilityTips.push(advice.wheelchair);
                    if (params.demand.stroller && advice.stroller) accessibilityTips.push(advice.stroller);
                    if (params.demand.largeLuggage && advice.largeLuggage) accessibilityTips.push(advice.largeLuggage);
                }
            });

            // 3. Peak time warnings
            const now = new Date();
            const hour = now.getHours();
            const isPeak = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
            if (isPeak && (params.demand.avoidCrowds || params.demand.largeLuggage || params.demand.stroller)) {
                accessibilityTips.push('⏰ 目前正值通勤尖峰時段，車廂內會非常擁擠，建議避開或多加留意。');
            } else if (params.demand.avoidCrowds) {
                accessibilityTips.push('⏰ 建議避開 07:30-09:30 與 17:30-19:30 的尖峰時段。');
            }

            // 4. General demand notes
            if (params.demand.largeLuggage || params.demand.stroller || params.demand.wheelchair) {
                notes.push('🧳 行李/無障礙：優先建議「少轉乘」與「設有電梯」的路線。');
            }
            if (params.demand.budget) {
                notes.push('💰 省錢：跨公司轉乘（如 JR 轉地鐵）票價較高，建議優先選擇同一公司的路線。');
                
                // Add ticket suggestions based on budget demand
                PASS_KNOWLEDGE.forEach(pass => {
                    notes.push(`🎫 推薦票券：${pass.name} (${pass.price}) - ${pass.advice}`);
                });
            }

            // Combine all steps
            const finalSteps = [...o.steps];
            
            if (expertTips.length > 0) {
                finalSteps.push('────────────────');
                finalSteps.push(...Array.from(new Set(expertTips)));
            }

            if (accessibilityTips.length > 0 || notes.length > 0) {
                finalSteps.push('────────────────');
                finalSteps.push(...Array.from(new Set([...accessibilityTips, ...notes])));
            }

            return {
                label: o.label,
                steps: finalSteps,
                sources: o.sources.length > 0 ? o.sources : baseSources
            };
        })
    };
}
