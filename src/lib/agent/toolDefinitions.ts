import { STATION_WISDOM, KNOWLEDGE_BASE } from '@/data/stationWisdom';
import { supabaseAdmin } from '@/lib/supabase';
import { buildStationIdSearchCandidates } from '@/lib/api/nodes';
import { WeatherTool, TrainStatusTool, FareTool, TimetableTool } from './tools/standardTools';
import { odptClient } from '@/lib/odpt/client';
import { getJSTTime } from '@/lib/utils/timeUtils';
import { findSimpleRoutes, RailwayTopology, normalizeOdptStationId } from '@/lib/l4/assistantEngine';
import { NavigationService } from '@/lib/navigation/NavigationService';
import { searchL4Knowledge } from '@/lib/l4/searchService';

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

    // ========== L4 新增工具 ==========

    /**
     * 時刻表查詢工具
     */
    get_timetable_l4: async (params: { stationId: string; operator?: string }, context: any) => {
        const tool = new TimetableTool();
        // Map stationId to station for TimetableTool.execute
        return await tool.execute({ station: params.stationId, operator: params.operator }, context);
    },

    /**
     * 票價查詢工具
     */
    get_fare_l4: async (params: { fromStation: string; toStation: string }, context: any) => {
        const tool = new FareTool();
        // Map fromStation/toStation to from/to for FareTool.execute
        return await tool.execute({ from: params.fromStation, to: params.toStation }, context);
    }
};
