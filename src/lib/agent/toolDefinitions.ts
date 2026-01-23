
import { supabaseAdmin } from '@/lib/supabase';
import { buildStationIdSearchCandidates } from '@/lib/api/nodes';
import { WeatherTool, TrainStatusTool, FareTool, TimetableTool } from './tools/standardTools';
import { odptClient } from '@/lib/odpt/client';
import { getJSTTime } from '@/lib/utils/timeUtils';
import { normalizeOdptStationId, findStationIdsByName } from '@/lib/l4/assistantEngine';
import { RailwayTopology, SupportedLocale, RouteOption, RouteStep } from '@/lib/l4/types/RoutingTypes';
import { algorithmProvider } from '@/lib/l4/algorithms/AlgorithmProvider';
import { NavigationService } from '@/lib/navigation/NavigationService';
import { searchL4Knowledge } from '@/lib/l4/searchService';
import CORE_TOPOLOGY from '@/lib/l4/generated/coreTopology.json';
import { getFareDataCache, getRouteDataCache, getTimetableDataCache, getAIResponseCache, cached } from '@/lib/cache/cacheManager';
import { CACHE_KEYS, hashString } from '@/lib/cache/cacheKeyBuilder';

// ========== Station Alias Mapping for MVP ==========
// Improves station name matching by mapping common names/aliases to ODPT station IDs
const STATION_ALIASES: Record<string, string[]> = {
    // Airports
    '成田機場': ['Narita Airport', 'NRT', '成田空港', 'Narita', '成田'],
    '羽田機場': ['Haneda Airport', 'HND', '羽田空港', 'Haneda', '羽田'],
    // Major Hubs (Traditional Chinese, Simplified Chinese, Japanese, English)
    '淺草': ['浅草', 'Asakusa', 'あさくさ', '浅草站', '淺草站'],
    '上野': ['Ueno', 'うえの', '上野站', '上野駅'],
    '秋葉原': ['Akihabara', 'アキバ', '秋叶原', '秋葉原站'],
    '東京': ['Tokyo', 'とうきょう', '东京', '東京站', '東京駅'],
    '新宿': ['Shinjuku', 'しんじゅく', '新宿站', '新宿駅'],
    '澀谷': ['渋谷', 'Shibuya', 'しぶや', '涩谷', '澀谷站'],
    '池袋': ['Ikebukuro', 'いけぶくろ', '池袋站', '池袋駅'],
    '銀座': ['Ginza', 'ぎんざ', '银座', '銀座站'],
    '六本木': ['Roppongi', 'ろっぽんぎ', '六本木站'],
    '品川': ['Shinagawa', 'しながわ', '品川站', '品川駅'],
    '橫濱': ['横浜', 'Yokohama', '横滨', '橫濱站'],
    '日暮里': ['Nippori', 'にっぽり', '日暮里站'],
    '押上': ['Oshiage', 'おしあげ', '押上站', 'スカイツリー前'],
    '表參道': ['表参道', 'Omotesando', 'おもてさんどう'],
    '原宿': ['Harajuku', 'はらじゅく', '原宿站'],
};

// Reverse lookup map: alias -> canonical name
const ALIAS_TO_CANONICAL = new Map<string, string>();
for (const [canonical, aliases] of Object.entries(STATION_ALIASES)) {
    ALIAS_TO_CANONICAL.set(canonical.toLowerCase(), canonical);
    for (const alias of aliases) {
        ALIAS_TO_CANONICAL.set(alias.toLowerCase(), canonical);
    }
}

/**
 * Resolve station name/alias to ODPT station ID
 * @param input - Station name, alias, or ODPT ID
 * @returns Resolved ODPT station ID or original input
 */
function resolveStationAlias(input: string): string {
    if (!input) return input;

    // If already an ODPT ID, normalize and return
    if (input.includes('odpt.Station:') || input.includes('odpt:Station:')) {
        return normalizeOdptStationId(input);
    }

    const normalized = input.trim().toLowerCase();

    // Check alias mapping
    const canonical = ALIAS_TO_CANONICAL.get(normalized);
    if (canonical) {
        // Try to find ODPT ID for the canonical name
        const stationIds = findStationIdsByName(canonical);
        if (stationIds.length > 0) {
            return stationIds[0];
        }
    }

    // Fallback: try direct station name lookup
    const directMatch = findStationIdsByName(input);
    if (directMatch.length > 0) {
        return directMatch[0];
    }

    // Return original input if no match found
    return input;
}

// ========== AI Similar Question Cache ==========
// Maps common question patterns to cache keys for faster responses

/**
 * Common question patterns for AI response caching
 * Format: { pattern: RegExp, category: string, extractStation: boolean }
 */
const COMMON_QUESTION_PATTERNS: Array<{
    pattern: RegExp;
    category: string;
    extractStation: boolean;
}> = [
        // Train status queries
        { pattern: /銀座線.*延誤|銀座線.*遅延|ginza.*delay/i, category: 'status:ginza', extractStation: false },
        { pattern: /丸之內線.*延誤|丸ノ内線.*遅延|marunouchi.*delay/i, category: 'status:marunouchi', extractStation: false },
        { pattern: /山手線.*延誤|山手線.*遅延|yamanote.*delay/i, category: 'status:yamanote', extractStation: false },
        { pattern: /延誤|遅延|delay|狀態|status|運行|運行状况/i, category: 'status:general', extractStation: true },

        // Route queries
        { pattern: /怎麼去|如何去|路線|去.*最快|行き方|ルート|how.*get|route.*to/i, category: 'route', extractStation: true },

        // Fare queries
        { pattern: /票價|多少錢|運賃|fare|price|cost/i, category: 'fare', extractStation: true },

        // Timetable queries
        { pattern: /時刻表|下一班|末班車|時刻|schedule|timetable|next train|last train/i, category: 'timetable', extractStation: true },

        // Facility queries
        { pattern: /電梯|エレベーター|elevator|無障礙|バリアフリー|barrier.*free|wheelchair/i, category: 'facility:elevator', extractStation: true },
        { pattern: /置物櫃|ロッカー|locker|行李|luggage/i, category: 'facility:locker', extractStation: true },
        { pattern: /廁所|トイレ|toilet|restroom/i, category: 'facility:toilet', extractStation: true },
    ];

/**
 * Generate cache key for similar questions based on keyword matching
 * Returns null if question doesn't match common patterns
 */
export function generateSimilarQuestionCacheKey(question: string, locale: string): string | null {
    if (!question || question.length < 5) return null;

    const normalized = question.toLowerCase().trim();

    for (const { pattern, category, extractStation } of COMMON_QUESTION_PATTERNS) {
        if (pattern.test(normalized)) {
            let key = `${CACHE_KEYS.AI_RESPONSE}:${category}`;

            if (extractStation) {
                // Try to extract station name from the question
                const stationIds = findStationIdsByName(question);
                if (stationIds.length > 0) {
                    key += `:${hashString(stationIds[0])}`;
                }
            }

            key += `:${locale}`;
            return key;
        }
    }

    return null;
}

/**
 * Try to get cached AI response for similar questions
 */
export async function getCachedAIResponse(question: string, locale: string): Promise<string | null> {
    const cacheKey = generateSimilarQuestionCacheKey(question, locale);
    if (!cacheKey) return null;

    return getAIResponseCache().get(cacheKey);
}

/**
 * Cache AI response for similar questions
 */
export function cacheAIResponse(question: string, locale: string, response: string): void {
    const cacheKey = generateSimilarQuestionCacheKey(question, locale);
    if (cacheKey && response && response.length > 10) {
        getAIResponseCache().set(cacheKey, response);
    }
}

// Mistral Tool Schema Types
export interface MistralToolSchema {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: {
            type: 'object';
            properties: Record<string, any>;
            required?: string[];
        };
    };
}

export const AGENT_TOOLS: MistralToolSchema[] = [
    {
        type: 'function',
        function: {
            name: 'get_train_status',
            description: 'Get real-time train operation status, delays, congestion, and crowd levels for lines.',
            parameters: {
                type: 'object',
                properties: {
                    stationId: { type: 'string', description: 'The ID of the station (e.g., odpt.Station:TokyoMetro.Ginza.Ueno)' }
                },
                required: ['stationId']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_weather',
            description: 'Get current weather and temperature at a specific station.',
            parameters: {
                type: 'object',
                properties: {
                    stationId: { type: 'string', description: 'The ID of the station' }
                },
                required: ['stationId']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_timetable',
            description: 'Get train timetable for a station. Returns next 3 trains for each direction. Use for "schedule", "時刻表", "next train", "末班車".',
            parameters: {
                type: 'object',
                properties: {
                    stationId: { type: 'string', description: 'The ODPT station ID (e.g., odpt.Station:TokyoMetro.Ginza.Asakusa)' },
                    operator: { type: 'string', description: 'Optional operator ID for filtering' }
                },
                required: ['stationId']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_fare',
            description: 'Calculate fare between two stations. Returns IC card fare and ticket fare. Use for "票價", "fare", "ticket price", "多少錢".',
            parameters: {
                type: 'object',
                properties: {
                    fromStation: { type: 'string', description: 'Origin station ODPT ID' },
                    toStation: { type: 'string', description: 'Destination station ODPT ID' }
                },
                required: ['fromStation', 'toStation']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_route',
            description: 'Get route/transfer information between two stations. Returns step-by-step directions. Use for "怎麼去", "route", "transfer", "轉乘".',
            parameters: {
                type: 'object',
                properties: {
                    fromStation: { type: 'string', description: 'Origin station ODPT ID' },
                    toStation: { type: 'string', description: 'Destination station ODPT ID' }
                },
                required: ['fromStation', 'toStation']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_navigation_graph',
            description: 'Get pedestrian navigation graph (nodes & edges) near coordinates. Use for barrier-free routing, elevator-only paths, or station indoor navigation.',
            parameters: {
                type: 'object',
                properties: {
                    lat: { type: 'number', description: 'Latitude' },
                    lon: { type: 'number', description: 'Longitude' },
                    radius: { type: 'number', description: 'Search radius in meters (default 500)' },
                    userProfile: { type: 'string', enum: ['general', 'wheelchair', 'stroller'], description: 'Filter logic by user profile' },
                    weather: { type: 'string', enum: ['clear', 'rain', 'snow'], description: 'Weather condition' }
                },
                required: ['lat', 'lon']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_pedestrian_route',
            description: 'Compute a pedestrian route between two nodes or coordinates. Returns ordered nodes and edges for map rendering.',
            parameters: {
                type: 'object',
                properties: {
                    startNodeId: { type: 'string', description: 'Start pedestrian node_id' },
                    endNodeId: { type: 'string', description: 'End pedestrian node_id' },
                    startLat: { type: 'number', description: 'Start latitude (if node_id unknown)' },
                    startLon: { type: 'number', description: 'Start longitude (if node_id unknown)' },
                    endLat: { type: 'number', description: 'End latitude (if node_id unknown)' },
                    endLon: { type: 'number', description: 'End longitude (if node_id unknown)' },
                    userProfile: { type: 'string', enum: ['general', 'wheelchair', 'stroller'], description: 'Routing preferences by user profile' },
                    weather: { type: 'string', enum: ['clear', 'rain', 'snow'], description: 'Weather condition' },
                    searchRadiusMeters: { type: 'number', description: 'Graph search radius in meters (default 700)' }
                },
                required: []
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'retrieve_station_knowledge',
            description: 'Search expert wisdom for specific topics: "wheelchair access", "best entrance/exit", "navigation tips", "local tricks".',
            parameters: {
                type: 'object',
                properties: {
                    stationId: { type: 'string', description: 'The ID of the station' },
                    query: { type: 'string', description: 'Specific keywords: "accessibility", "wheelchair", "luggage", "exit", "transfer"' }
                },
                required: ['stationId']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_station_facilities',
            description: 'List confirmed facilities. Use this for "lockers", "toilets", "elevators", "baby rooms".',
            parameters: {
                type: 'object',
                properties: {
                    stationId: { type: 'string', description: 'The ID of the station' },
                    category: { type: 'string', description: 'Optional filter: "locker", "elevator", "toilet"' }
                },
                required: ['stationId']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_station_crowd_context',
            description: 'Get historical busy-ness level and real-time service alerts for a station. Use for "crowded", "busy", "rush hour", or route planning.',
            parameters: {
                type: 'object',
                properties: {
                    stationId: { type: 'string', description: 'ODPT Station ID' }
                },
                required: ['stationId']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_user_feedback_insights',
            description: 'Retrieve and analyze user feedback for product insights. Use for understanding user pain points, popular feature requests, bug trends, and community tips. Admin tool for improving LUTAGU.',
            parameters: {
                type: 'object',
                properties: {
                    feedbackType: { type: 'string', enum: ['general', 'bug', 'spot', 'tip', 'all'], description: 'Filter by feedback type' },
                    stationId: { type: 'string', description: 'Filter by station node ID (optional)' },
                    limit: { type: 'number', description: 'Max number of feedback items to retrieve (default 20)' },
                    summarize: { type: 'boolean', description: 'If true, return aggregated stats instead of raw items' }
                },
                required: []
            }
        }
    }
];

/**
 * 輔助函數：獲取基本路線資訊（當無法計算時的回退）
 */
function getBasicRouteInfo(fromName: string, toName: string, locale: string): string {
    const fromOp = fromName.includes('Toei') || fromName.includes('都営') ? '都営'
        : fromName.includes('JR') || fromName.includes('東日本') ? 'JR'
            : '東京Metro';
    const toOp = toName.includes('Toei') || toName.includes('都営') ? '都営'
        : toName.includes('JR') || toName.includes('東日本') ? 'JR'
            : '東京Metro';

    if (locale === 'zh-TW') {
        return `\n🗺️ ${fromName} → ${toName} 路徑規劃\n━━━━━━━━━━━━━━━━\n📍 起點: ${fromName} (${fromOp})\n📍 終點: ${toName} (${toOp})\n\n${fromOp === toOp ? '✅ 同一營運商，可直接轉乘' : '⚠️ 跨營運商轉乘，建議在主要轉乘站（如東京、新宿、池袋）轉乘'}\n\n💡 詳細路線請參考車站內的轉乘指南或使用 Google Maps。`;
    } else if (locale === 'ja') {
        return `\n🗺️ ${fromName} → ${toName} ルート案内\n━━━━━━━━━━━━━━━━\n📍 出発: ${fromName} (${fromOp})\n📍 到着: ${toName} (${toOp})\n\n${fromOp === toOp ? '✅ 同じ運営者ですぐに乗り継ぎできます' : '⚠️ 他の運営者への乗り継ぎが必要です'}\n\n💡 詳しいルートは駅内の案内標識をご覧ください。`;
    } else {
        return `\n🗺️ ${fromName} → ${toName} Route Planning\n━━━━━━━━━━━━━━━━\n📍 From: ${fromName} (${fromOp})\n📍 To: ${toName} (${toOp})\n\n${fromOp === toOp ? '✅ Same operator, easy transfer' : '⚠️ Cross-operator transfer required'}\n\n💡 Check station signs or use Google Maps for detailed directions.`;
    }
}

/**
 * 輔助函數：獲取路線專家建議
 */
function getExpertTipsForRoute(fromStation: string, toStation: string, locale: string): string | null {
    // 常見路線的專家建議
    const from = normalizeOdptStationId(fromStation);
    const to = normalizeOdptStationId(toStation);

    // 淺草相關路線
    if (from.includes('Asakusa') || to.includes('Asakusa')) {
        if (locale === 'zh-TW') {
            return '💡 淺草站與東武線轉乘需出站，請預留 5-10 分鐘。淺草站 1 號出口最靠近雷門。';
        } else if (locale === 'ja') {
            return '💡 浅草駅と東武線への乗り継ぎは改札外が必要です。5-10 分程度の余裕を持ってください。';
        }
    }

    // 上野相關路線
    if (from.includes('Ueno') || to.includes('Ueno')) {
        if (locale === 'zh-TW') {
            return '💡 上野站 3 號出口有電梯，適合大行李與嬰兒車。轉乘日比谷線需經過較長地下通道。';
        } else if (locale === 'ja') {
            return '💡 上野駅 3 番出口にエレベーターがあります。日比谷線への乗り継ぎは地下通路が長いです。';
        }
    }

    // 新宿相關路線
    if (from.includes('Shinjuku') || to.includes('Shinjuku')) {
        if (locale === 'zh-TW') {
            return '💡 新宿站是世界最繁忙車站，共有超過 200 個出口，請務必確認目標出口名稱。';
        } else if (locale === 'ja') {
            return '💡 新宿駅は世界で最も忙しい駅です。200 以上の出口があるので、目的地の出口を必ず確認してください。';
        }
    }

    return null;
}

/**
 * Execution Handlers for the tools
 */
export const TOOL_HANDLERS = {
    get_train_status: async (params: { stationId: string }, context: any) => {
        const tool = new TrainStatusTool();
        return await tool.execute({}, { ...context, nodeId: params.stationId });
    },
    get_weather: async (params: { stationId: string }, context: any) => {
        const tool = new WeatherTool();
        const result = await tool.execute({}, { ...context, nodeId: params.stationId });

        if (!result.success || !result.data) {
            return 'Weather data is currently unavailable.';
        }

        const { temp, condition, humidity, alert } = result.data;
        const locale = context.locale || 'zh-TW';

        // Get localized station name
        const stationNameMap: Record<string, Record<string, string>> = {
            'Ueno': { 'zh-TW': '上野', 'ja': '上野', 'en': 'Ueno' },
            'Shibuya': { 'zh-TW': '澀谷', 'ja': '渋谷', 'en': 'Shibuya' },
            'Shinjuku': { 'zh-TW': '新宿', 'ja': '新宿', 'en': 'Shinjuku' },
            'Ikebukuro': { 'zh-TW': '池袋', 'ja': '池袋', 'en': 'Ikebukuro' },
            'Tokyo': { 'zh-TW': '東京', 'ja': '東京', 'en': 'Tokyo' },
            'Asakusa': { 'zh-TW': '淺草', 'ja': '浅草', 'en': 'Asakusa' },
            'Ginza': { 'zh-TW': '銀座', 'ja': '銀座', 'en': 'Ginza' },
            'Akihabara': { 'zh-TW': '秋葉原', 'ja': '秋葉原', 'en': 'Akihabara' }
        };
        const rawName = params.stationId.split('.').pop() || '';
        const stationName = stationNameMap[rawName]?.[locale] || stationNameMap[rawName]?.['zh-TW'] || rawName;

        // Humanize weather condition
        const conditionMap: Record<string, Record<string, string>> = {
            'sunny': { 'zh-TW': '天氣晴朗', 'ja': '晴れています', 'en': 'sunny' },
            'clear': { 'zh-TW': '天氣晴朗', 'ja': '晴れています', 'en': 'clear skies' },
            'cloudy': { 'zh-TW': '多雲', 'ja': '曇り', 'en': 'cloudy' },
            'rainy': { 'zh-TW': '正在下雨，建議走地下通道', 'ja': '雨が降っています、地下通路がおすすめ', 'en': 'raining, recommend underground passages' },
            'unknown': { 'zh-TW': '天氣資訊更新中', 'ja': '天気情報更新中', 'en': 'weather data updating' }
        };

        // Temperature comfort level - corrected thresholds for Tokyo climate
        let tempAdvice = '';
        if (temp <= 5) {
            tempAdvice = locale === 'zh-TW' ? '天氣寒冷，請穿著保暖外套和圍巾'
                : locale === 'ja' ? '寒いです、暖かいコートとマフラーをお勧めします'
                    : "it's cold, wear a warm coat and scarf";
        } else if (temp <= 10) {
            tempAdvice = locale === 'zh-TW' ? '氣溫偏低，建議穿外套或毛衣'
                : locale === 'ja' ? '肌寒いです、ジャケットやセーターがおすすめ'
                    : 'chilly weather, a jacket or sweater recommended';
        } else if (temp <= 15) {
            tempAdvice = locale === 'zh-TW' ? '天氣涼爽，可帶件薄外套備用'
                : locale === 'ja' ? '涼しいです、薄手の上着があると安心'
                    : 'cool weather, bring a light jacket';
        } else if (temp <= 25) {
            tempAdvice = locale === 'zh-TW' ? '氣溫舒適宜人'
                : locale === 'ja' ? '快適な気温です'
                    : 'comfortable temperature';
        } else {
            tempAdvice = locale === 'zh-TW' ? '天氣炎熱，注意補充水分'
                : locale === 'ja' ? '暑いです、水分補給を忘れずに'
                    : "it's hot, stay hydrated";
        }

        const conditionText = conditionMap[condition]?.[locale] || conditionMap['unknown'][locale];
        const alertText = alert
            ? (locale === 'zh-TW' ? `⚠️ 氣象警報: ${alert}`
                : locale === 'ja' ? `⚠️ 気象警報: ${alert}`
                    : `⚠️ Weather alert: ${alert}`)
            : '';

        const summary = locale === 'zh-TW'
            ? `目前${stationName}一帶${conditionText}，約 ${temp}°C。${tempAdvice}。${alertText}`
            : locale === 'ja'
                ? `現在${stationName}付近は${conditionText}、約${temp}°C。${tempAdvice}。${alertText}`
                : `Around ${stationName}, it's currently ${conditionText}, about ${temp}°C. ${tempAdvice}. ${alertText}`;

        return summary.trim();
    },
    get_navigation_graph: async (params: { lat: number; lon: number; radius?: number; userProfile?: string; weather?: string }, context: any) => {
        const radius = params.radius || 500;
        const userProfile = params.userProfile || context.userProfile || 'general';
        const weather = params.weather || 'clear';

        const result = await NavigationService.getPedestrianGraph(params.lat, params.lon, radius, userProfile, weather);
        return result;
    },
    get_pedestrian_route: async (params: {
        startNodeId?: string;
        endNodeId?: string;
        startLat?: number;
        startLon?: number;
        endLat?: number;
        endLon?: number;
        userProfile?: string;
        weather?: string;
        searchRadiusMeters?: number;
    }, context: any) => {
        const userProfile = params.userProfile || context.userProfile || 'general';
        const weather = params.weather || 'clear';

        const result = await NavigationService.getPedestrianRoute({
            startNodeId: params.startNodeId,
            endNodeId: params.endNodeId,
            startLat: params.startLat,
            startLon: params.startLon,
            endLat: params.endLat,
            endLon: params.endLon,
            userProfile,
            weather,
            searchRadiusMeters: params.searchRadiusMeters,
        });
        return result;
    },
    retrieve_station_knowledge: async (params: { stationId: string, query?: string }, context: any) => {
        const locale = context.locale || 'zh-TW';
        const userProfile = context.userProfile || 'general';
        const query = params.query || `Tips for ${params.stationId}`;

        try {
            const results = await searchL4Knowledge({
                query,
                stationId: params.stationId,
                userContext: [userProfile as any],
                topK: 3
            });

            if (!results || results.length === 0) {
                return "No specific expert knowledge found for this station. Suggesting standard navigation.";
            }

            let summary = `Expert knowledge for ${params.stationId}:\n`;
            results.forEach((r: any, i: number) => {
                summary += `${i + 1}. [${r.category}] ${r.content}\n`;
            });

            return summary;
        } catch (error) {
            console.error('Error in retrieve_station_knowledge handler:', error);
            return "Knowledge base is currently unavailable.";
        }
    },
    get_station_facilities: async (params: { stationId: string }, context: any) => {
        const { data: facilities } = await supabaseAdmin
            .from('l3_facilities')
            .select('*')
            .eq('station_id', params.stationId);

        if (!facilities || facilities.length === 0) return 'No facility data available for this station.';

        return facilities.map((f: any) => `- ${f.type}: ${f.location_coords?.['en'] || f.location_coords?.['zh-TW'] || 'Unknown location'}`).join('\n');
    },
    get_station_crowd_context: async (params: { stationId: string }, context: any) => {
        // Humanized Advice Templates
        const CONGESTION_ADVICE: Record<string, Record<string, string>> = {
            'Quiet': {
                'zh-TW': '這是一個人流較少的車站，轉乘與等待時間都很輕鬆。',
                'ja': '比較的空いている駅です。乗り換えや待ち時間も余裕があります。',
                'en': 'This is a quiet station. Transfers and waiting times are relaxed.'
            },
            'Moderate': {
                'zh-TW': '人流適中。尖峰時段（08:00-09:30, 17:30-19:00）可能會有些擁擠。',
                'ja': '人の流れは普通です。ラッシュ時は混雑することがあります。',
                'en': 'Moderate traffic. Rush hours (08:00-09:30, 17:30-19:00) may be crowded.'
            },
            'Busy': {
                'zh-TW': '🚨 繁忙車站。建議錯開尖峰時段，或提前抵達以預留轉乘時間。',
                'ja': '🚨 混雑した駅です。ピーク時を避けるか、早めに到着することをお勧めします。',
                'en': '🚨 Busy station. Avoid peak hours or arrive early for transfers.'
            },
            'Very Busy': {
                'zh-TW': '⚠️ 超級繁忙！這是東京最擁擠的車站之一。強烈建議錯開早晚高峰，並使用較少人的出口。',
                'ja': '⚠️ 非常に混雑！東京で最も混雑する駅の一つです。ラッシュ時を避け、すいている出口を使うことを強くお勧めします。',
                'en': '⚠️ Extremely busy! One of Tokyo\'s busiest stations. Strongly recommend avoiding rush hours and using less crowded exits.'
            },
            'Unknown': {
                'zh-TW': '暫無此站的擁擠度資料。',
                'ja': 'この駅の混雑情報はありません。',
                'en': 'No congestion data available for this station.'
            }
        };

        try {
            const locale = context?.locale || 'zh-TW';

            // Query station_stats for latest year
            const { data: statsData } = await supabaseAdmin
                .from('station_stats')
                .select('station_id, survey_year, passenger_journeys')
                .eq('station_id', params.stationId)
                .order('survey_year', { ascending: false })
                .limit(1)
                .maybeSingle();

            // Extract railway ID
            const railwayMatch = params.stationId.match(/odpt\.Station:([^.]+\.[^.]+)/);
            const railwayId = railwayMatch ? `odpt.Railway:${railwayMatch[1]}` : null;

            // Query transit_alerts
            let alertText = '';
            if (railwayId) {
                const { data: alertsData } = await supabaseAdmin
                    .from('transit_alerts')
                    .select('status, text_ja')
                    .eq('railway', railwayId);

                if (alertsData && alertsData.length > 0) {
                    const nonNormalAlerts = alertsData.filter(a =>
                        a.text_ja && !a.text_ja.includes('平常') && !a.text_ja.includes('正常')
                    );
                    if (nonNormalAlerts.length > 0) {
                        alertText = `\n\n🚨 運行異常: ${nonNormalAlerts[0].text_ja}`;
                    }
                }
            }

            // Calculate busy level
            const journeys = statsData?.passenger_journeys || 0;
            let busyLevel: string;
            if (journeys === 0) busyLevel = 'Unknown';
            else if (journeys < 50000) busyLevel = 'Quiet';
            else if (journeys < 200000) busyLevel = 'Moderate';
            else if (journeys < 500000) busyLevel = 'Busy';
            else busyLevel = 'Very Busy';

            // Get localized advice
            const advice = CONGESTION_ADVICE[busyLevel]?.[locale] || CONGESTION_ADVICE[busyLevel]?.['en'] || '';

            return `${advice}${alertText}`;
        } catch (e: any) {
            return `擁擠度資料暫時無法取得。`;
        }
    },

    // ========== L4 Tools (Matching AGENT_TOOLS names) ==========

    /**
     * 時刻表查詢工具 - matches get_timetable in AGENT_TOOLS
     * Now with caching for improved performance (15min TTL)
     */
    get_timetable: async (params: { stationId: string; operator?: string }, context: any) => {
        const locale = context?.locale || 'zh-TW';
        const resolvedStationId = resolveStationAlias(params.stationId);
        const operator = params.operator || 'all';
        const cacheKey = `${CACHE_KEYS.TIMETABLE}:${hashString(`${resolvedStationId}:${operator}:${locale}`)}`;

        return await cached(getTimetableDataCache(), cacheKey, async () => {
            try {
                const timetables = await odptClient.getStationTimetable(resolvedStationId, params.operator);
                if (!timetables || timetables.length === 0) {
                    return locale === 'ja'
                        ? '⚠️ 時刻表が見つかりませんでした。'
                        : locale === 'en'
                            ? '⚠️ Timetable not found.'
                            : '⚠️ 找不到該站時刻表資料。';
                }

                const jst = getJSTTime();
                const nowMin = jst.hour * 60 + jst.minute;
                const wantCalendarKey = jst.isHoliday ? 'SaturdayHoliday' : 'Weekday';
                const chosen =
                    timetables.find((t: any) => String(t['odpt:calendar'] || '').includes(wantCalendarKey)) ||
                    timetables[0];

                const trips = Array.isArray(chosen?.['odpt:stationTimetableObject']) ? chosen['odpt:stationTimetableObject'] : [];
                const normalizedTrips = trips
                    .map((it: any) => {
                        const time = String(it?.['odpt:departureTime'] || '');
                        const m = time.match(/^(\d{1,2}):(\d{2})$/);
                        if (!m) return null;
                        const h = Number(m[1]);
                        const mm = Number(m[2]);
                        if (!Number.isFinite(h) || !Number.isFinite(mm)) return null;
                        const mins = h * 60 + mm;
                        const dest = Array.isArray(it?.['odpt:destinationStation']) ? it['odpt:destinationStation'][0] : '';
                        const destName = String(dest).split('.').pop() || '';
                        return { time: `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`, mins, destName };
                    })
                    .filter(Boolean) as { time: string; mins: number; destName: string }[];

                normalizedTrips.sort((a, b) => a.mins - b.mins);

                const upcoming = normalizedTrips.filter(t => t.mins >= nowMin).slice(0, 3);
                const next = upcoming.length > 0 ? upcoming : normalizedTrips.slice(0, 3);

                const line = String(chosen?.['odpt:railway'] || '').split('.').pop() || String(chosen?.['odpt:railway'] || '');
                const direction = String(chosen?.['odpt:railwayDirection'] || '').split('.').pop() || '';
                const station = resolvedStationId.split('.').pop() || resolvedStationId;

                if (locale === 'ja') {
                    return `🕒 ${station} 時刻表 (${line})\n方向: ${direction}\n次の電車: ${next.map(t => `${t.time} → ${t.destName || direction}`).join(', ')}`;
                }
                if (locale === 'en') {
                    return `🕒 ${station} Timetable (${line})\nDirection: ${direction}\nNext trains: ${next.map(t => `${t.time} → ${t.destName || direction}`).join(', ')}`;
                }

                return `🕒 ${station} 時刻表 (${line})\n方向: ${direction}\n下一班: ${next.map(t => `${t.time} → ${t.destName || direction}`).join(', ')}`;
            } catch (e: any) {
                return locale === 'ja'
                    ? '⚠️ 時刻表取得に失敗しました。'
                    : locale === 'en'
                        ? '⚠️ Failed to fetch timetable.'
                        : '⚠️ 時刻表取得失敗，請稍後再試。';
            }
        });
    },

    /**
     * 票價查詢工具 - matches get_fare in AGENT_TOOLS
     * Now with caching for improved performance (1hr TTL)
     */
    get_fare: async (params: { fromStation: string; toStation: string }, context: any) => {
        // Resolve station aliases if needed
        const resolvedFrom = resolveStationAlias(params.fromStation);
        const resolvedTo = resolveStationAlias(params.toStation);

        const locale = context?.locale || 'zh-TW';

        // Generate cache key
        const cacheKey = `${CACHE_KEYS.FARE}:${hashString(`${resolvedFrom}:${resolvedTo}:${locale}`)}`;

        // Try cache first
        return await cached(getFareDataCache(), cacheKey, async () => {
            const tool = new FareTool();
            const out = await tool.execute({ from: resolvedFrom, to: resolvedTo }, context);

            if (Array.isArray(out) && out.length > 0) {
                const f = out[0] as any;
                const stationFrom = String(f.from || resolvedFrom).split('.').pop() || f.from || resolvedFrom;
                const stationTo = String(f.to || resolvedTo).split('.').pop() || f.to || resolvedTo;
                const ticket = f.ticket;
                const ic = f.ic;

                if (locale === 'ja') {
                    return `💴 運賃: ${stationFrom} → ${stationTo}\nIC: ${ic}円 / 切符: ${ticket}円`;
                }
                if (locale === 'en') {
                    return `💴 Fare: ${stationFrom} → ${stationTo}\nIC: ¥${ic} / Ticket: ¥${ticket}`;
                }
                return `💴 票價: ${stationFrom} → ${stationTo}\nIC: ${ic}円 / 單程票: ${ticket}円`;
            }

            const errMsg = typeof out?.error === 'string' ? out.error : 'Fare not found';
            if (locale === 'ja') return `⚠️ 運賃を取得できませんでした: ${errMsg}`;
            if (locale === 'en') return `⚠️ Unable to fetch fare: ${errMsg}`;
            return `⚠️ 無法取得票價資訊: ${errMsg}`;
        });
    },

    /**
     * 路線查詢工具 - matches get_route in AGENT_TOOLS
     * Now with caching for improved performance (30min TTL)
     */
    get_route: async (params: { fromStation: string; toStation: string }, context: any) => {
        const locale = context.locale || 'zh-TW';

        // Resolve station aliases
        const resolvedFrom = resolveStationAlias(params.fromStation);
        const resolvedTo = resolveStationAlias(params.toStation);

        // Generate cache key (includes locale for language-specific responses)
        const cacheKey = `${CACHE_KEYS.ROUTE}:${hashString(`${resolvedFrom}:${resolvedTo}:${locale}`)}`;

        // Try cache first
        return await cached(
            getRouteDataCache(),
            cacheKey,
            async () => {
                try {
                    // Use algorithmProvider for routing
                    const routes = await algorithmProvider.findRoutes({
                        originId: resolvedFrom,
                        destinationId: resolvedTo,
                        locale: locale as SupportedLocale
                    });

                    if (!routes || routes.length === 0) {
                        // Fallback to basic route info
                        return getBasicRouteInfo(params.fromStation, params.toStation, locale);
                    }

                    // Get expert tips for the route
                    const expertTips = getExpertTipsForRoute(resolvedFrom, resolvedTo, locale);

                    // Format route response
                    let response = '';
                    if (locale === 'zh-TW') {
                        response = `🗺️ 路線規劃結果\n━━━━━━━━━━━━━━━━\n`;
                    } else if (locale === 'ja') {
                        response = `🗺️ ルート案内\n━━━━━━━━━━━━━━━━\n`;
                    } else {
                        response = `🗺️ Route Planning\n━━━━━━━━━━━━━━━━\n`;
                    }

                    response += `🔎 ODPT: ${resolvedFrom} → ${resolvedTo}\n`;

                    routes.slice(0, 2).forEach((route: RouteOption, idx: number) => {
                        const label = locale === 'zh-TW'
                            ? `選項 ${idx + 1}: ${route.label}`
                            : locale === 'ja'
                                ? `オプション ${idx + 1}: ${route.label}`
                                : `Option ${idx + 1}: ${route.label}`;

                        response += `\n${label}\n`;
                        route.steps.forEach((step: RouteStep) => {
                            response += `  ${step.icon || '•'} ${step.text}\n`;
                        });

                        if (route.transfers !== undefined) {
                            const transferText = locale === 'zh-TW'
                                ? `轉乘次數: ${route.transfers}`
                                : locale === 'ja'
                                    ? `乗換回数: ${route.transfers}`
                                    : `Transfers: ${route.transfers}`;
                            response += `  📊 ${transferText}\n`;
                        }
                    });

                    if (expertTips) {
                        response += `\n${expertTips}`;
                    }

                    return response;
                } catch (error) {
                    console.error('[get_route] Error:', error);
                    return getBasicRouteInfo(params.fromStation, params.toStation, locale);
                }
            }
        );
    },

    // Legacy L4 tool names (kept for backwards compatibility)


    get_fare_l4: async (params: { fromStation: string; toStation: string }, context: any) => {
        const tool = new FareTool();
        return await tool.execute({ from: params.fromStation, to: params.toStation }, context);
    },

    // ========== Feedback Analysis Tool (for AI + Admin) ==========
    get_user_feedback_insights: async (params: {
        feedbackType?: string;
        stationId?: string;
        limit?: number;
        summarize?: boolean;
    }, context: any) => {
        const locale = context.locale || 'zh-TW';
        const limit = params.limit || 20;

        try {
            let query = supabaseAdmin
                .from('user_feedback')
                .select('*')
                .order('created_at', { ascending: false });

            // Apply filters
            if (params.feedbackType && params.feedbackType !== 'all') {
                query = query.eq('feedback_type', params.feedbackType);
            }
            if (params.stationId) {
                query = query.eq('node_id', params.stationId);
            }

            const { data, error } = await query.limit(limit);

            if (error) {
                return 'Unable to retrieve feedback data.';
            }

            if (!data || data.length === 0) {
                return locale === 'zh-TW'
                    ? '目前尚無使用者回饋資料。'
                    : locale === 'ja'
                        ? 'ユーザーフィードバックはまだありません。'
                        : 'No user feedback available yet.';
            }

            // If summarize mode, return aggregated stats
            if (params.summarize) {
                const stats = {
                    total: data.length,
                    byType: {
                        general: data.filter(f => f.feedback_type === 'general').length,
                        bug: data.filter(f => f.feedback_type === 'bug').length,
                        spot: data.filter(f => f.feedback_type === 'spot').length,
                        tip: data.filter(f => f.feedback_type === 'tip').length,
                    },
                    avgRating: data.filter(f => f.rating).reduce((sum, f) => sum + (f.rating || 0), 0) / (data.filter(f => f.rating).length || 1),
                    pending: data.filter(f => f.status === 'pending').length,
                    recentTopics: data.slice(0, 5).map(f => f.content.substring(0, 50) + '...')
                };

                if (locale === 'zh-TW') {
                    return `📊 使用者回饋洞察
━━━━━━━━━━━━━━━━
📝 總回饋數: ${stats.total}
🌟 使用感受: ${stats.byType.general}
🐛 問題回報: ${stats.byType.bug}
📍 景點情報: ${stats.byType.spot}
💡 經驗分享: ${stats.byType.tip}
⭐ 平均評分: ${stats.avgRating.toFixed(1)}/5
⏳ 待處理: ${stats.pending}

📋 近期主題:
${stats.recentTopics.map((t, i) => `${i + 1}. ${t}`).join('\n')}`;
                } else {
                    return `📊 User Feedback Insights
━━━━━━━━━━━━━━━━
📝 Total: ${stats.total}
🌟 General: ${stats.byType.general}
🐛 Bugs: ${stats.byType.bug}
📍 Spots: ${stats.byType.spot}
💡 Tips: ${stats.byType.tip}
⭐ Avg Rating: ${stats.avgRating.toFixed(1)}/5
⏳ Pending: ${stats.pending}

📋 Recent Topics:
${stats.recentTopics.map((t, i) => `${i + 1}. ${t}`).join('\n')}`;
                }
            }

            // Return raw items in human-readable format
            const typeLabels: Record<string, Record<string, string>> = {
                general: { 'zh-TW': '使用感受', ja: '使用感想', en: 'General' },
                bug: { 'zh-TW': '問題回報', ja: '不具合', en: 'Bug' },
                spot: { 'zh-TW': '景點情報', ja: 'スポット', en: 'Spot' },
                tip: { 'zh-TW': '經驗分享', ja: '経験', en: 'Tip' },
            };

            let response = locale === 'zh-TW'
                ? `📬 使用者回饋 (${data.length} 筆)\n━━━━━━━━━━━━━━━━\n`
                : `📬 User Feedback (${data.length} items)\n━━━━━━━━━━━━━━━━\n`;

            data.slice(0, 10).forEach((f, i) => {
                const typeLabel = typeLabels[f.feedback_type]?.[locale] || f.feedback_type;
                const rating = f.rating ? '★'.repeat(f.rating) : '';
                const date = new Date(f.created_at).toLocaleDateString(locale);
                const station = f.node_id ? f.node_id.split('.').pop() : '';

                response += `\n${i + 1}. [${typeLabel}] ${rating}\n`;
                response += `   ${f.content.substring(0, 100)}${f.content.length > 100 ? '...' : ''}\n`;
                response += `   📅 ${date}${station ? ` • 📍 ${station}` : ''}\n`;
            });

            return response;
        } catch (error) {
            console.error('[get_user_feedback_insights] Error:', error);
            return 'Error retrieving feedback data.';
        }
    }
};
