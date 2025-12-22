import { supabase } from '../supabase';

// Types aligning with DB schema
export interface NodeDatum {
    id: string;
    city_id: string;
    name: any;
    type: string;
    location: { coordinates: [number, number] }; // Unified to [lon, lat]
    geohash: string;
    vibe: string | null;
    is_hub: boolean;
    parent_hub_id: string | null;
    zone: string;
}

/**
 * Ensures location is always a GeoJSON-like object { coordinates: [lon, lat] }
 * Handles: WKT strings, Objects with coordinates, or raw DB geography format
 */
export function parseLocation(loc: any): { coordinates: [number, number] } {
    if (!loc) return { coordinates: [0, 0] };

    // Case 1: Already correct object
    if (loc.coordinates && Array.isArray(loc.coordinates)) {
        return { coordinates: [loc.coordinates[0], loc.coordinates[1]] };
    }

    // Case 2: WKT String (e.g. "POINT(139.7774 35.7141)")
    if (typeof loc === 'string' && loc.startsWith('POINT')) {
        const matches = loc.match(/\(([^)]+)\)/);
        if (matches) {
            const parts = matches[1].split(' ');
            return { coordinates: [parseFloat(parts[0]), parseFloat(parts[1])] };
        }
    }

    // Case 3: Standard object from PostGIS (Sometime it's {type: "Point", coordinates: [...]})
    if (loc.type === 'Point' && loc.coordinates) {
        return { coordinates: loc.coordinates as [number, number] };
    }

    return { coordinates: [0, 0] };
}

// L1: Location DNA
export interface CategoryCounts {
    // Broad Categories (Legacy/Aggregated)
    medical: number;
    shopping: number;
    dining: number;
    leisure: number;
    education: number;
    finance: number;

    // P1-1 Specific Counts (MVP Guide)
    convenience_count?: number;
    drugstore_count?: number;
    restaurant_count?: number;
    cafe_count?: number;
    shrine_count?: number;
    temple_count?: number;
    museum_count?: number;

    // Others
    nature?: number;
    religion?: number;
    accommodation?: number;
    workspace?: number;
    housing?: number;
}

// L2: Live Status
export interface LiveStatus {
    congestion: number; // 1-5
    line_status: {
        line: string;
        status: 'normal' | 'delay' | 'suspended';
        message?: string;
    }[];
    weather: {
        temp: number;
        condition: string;
    };
}

// L3: Service Facilities
export interface ServiceFacility {
    id: string;
    category: 'toilet' | 'charging' | 'locker' | 'wifi' | 'accessibility' | 'dining' | 'shopping' | 'leisure' | 'transport' | 'religion' | 'nature' | 'accommodation';
    subCategory: string;
    location: string; // e.g., "B1 North Exit"
    attributes: Record<string, any>;
}

// L4: Mobility Strategy
export interface ActionNudge {
    type: 'primary' | 'secondary';
    title: string;
    content: string;
    advice: string;
}

export interface NodeProfile {
    node_id: string;
    category_counts: CategoryCounts;
    vibe_tags: string[];
    l2_status?: LiveStatus;
    l3_facilities?: ServiceFacility[];
    l4_nudges?: ActionNudge[];
}

// Fetch nearby nodes
export async function fetchNearbyNodes(lat: number, lon: number, radiusMeters: number = 2000) {
    const { data, error } = await supabase
        .rpc('nearby_nodes', {
            user_lat: lat,
            user_lon: lon,
            radius_meters: radiusMeters
        });

    if (error) {
        console.error('Error fetching nearby nodes:', error);
        // Fallback to core stations if RPC fails
        return CORE_STATIONS_FALLBACK.filter(node => {
            const nodeLat = node.location.coordinates[1];
            const nodeLon = node.location.coordinates[0];
            // Simple rough distance check for fallback (approx 0.01 deg ~= 1km)
            return Math.abs(nodeLat - lat) < 0.05 && Math.abs(nodeLon - lon) < 0.05;
        });
    }

    // Enforce Multilingual Names & Polyfill is_hub
    const effectiveNodes = (data || []).map((n: any) => {
        const seed = SEED_NODES.find(s => s.id === n.id);
        const name = n.name || (seed ? seed.name : 'Station');

        // V3.0 Logic: ID parent_hub_id is null, it is a Hub.
        const isHub = !n.parent_hub_id;

        return {
            ...n,
            name,
            is_hub: isHub
        };
    });

    return effectiveNodes as NodeDatum[];
}

import { SEED_NODES } from '../nodes/seedNodes';

const CORE_STATIONS_FALLBACK = SEED_NODES.map(node => {
    // Parse coordinates if they are string (WKT)
    let coords = [0, 0];
    if (typeof node.location === 'string' && node.location.startsWith('POINT')) {
        const matches = node.location.match(/\(([^)]+)\)/);
        if (matches) {
            const parts = matches[1].split(' ');
            coords = [parseFloat(parts[0]), parseFloat(parts[1])];
        }
    } else if ((node.location as any).coordinates) {
        coords = (node.location as any).coordinates;
    }

    return {
        ...node,
        location: { coordinates: coords }
    };
});

// Internal Node ID to ODPT Station ID Mapping
const NODE_TO_ODPT: Record<string, string> = {
    'odpt:Station:TokyoMetro.Ueno': 'odpt.Station:TokyoMetro.Ginza.Ueno',
    'odpt:Station:TokyoMetro.Asakusa': 'odpt.Station:TokyoMetro.Ginza.Asakusa',
    'odpt:Station:JR-East.Akihabara': 'odpt.Station:TokyoMetro.Hibiya.Akihabara',
    'odpt:Station:JR-East.Tokyo': 'odpt.Station:TokyoMetro.Marunouchi.Tokyo',
    'odpt:Station:TokyoMetro.Ginza': 'odpt.Station:TokyoMetro.Ginza.Ginza',
    'odpt:Station:Toei.Kuramae': 'odpt.Station:Toei.Asakusa.Kuramae',
    'odpt:Station:Toei.ShinOkachimachi': 'odpt.Station:Toei.Oedo.ShinOkachimachi',
    'odpt:Station:Toei.Ningyocho': 'odpt.Station:TokyoMetro.Hibiya.Ningyocho',
    'odpt:Station:JR-East.Kanda': 'odpt.Station:TokyoMetro.Ginza.Kanda',
    'odpt:Station:Toei.Nihombashi': 'odpt.Station:TokyoMetro.Ginza.Nihombashi',
    'odpt:Station:TokyoMetro.Mitsukoshimae': 'odpt.Station:TokyoMetro.Ginza.Mitsukoshimae',
    'odpt:Station:Toei.HigashiGinza': 'odpt.Station:TokyoMetro.Hibiya.HigashiGinza'
};

// Mapping of ODPT Station IDs to Coordinates (MVP Core 14 Stations + Key Hubs)
export const STATION_MAP: Record<string, { lat: number; lon: number }> = {
    'odpt.Station:TokyoMetro.Ginza.Ueno': { lat: 35.7141, lon: 139.7774 },
    'odpt.Station:TokyoMetro.Hibiya.Ueno': { lat: 35.7141, lon: 139.7774 },
    'odpt.Station:JR-East.Yamanote.Ueno': { lat: 35.7141, lon: 139.7774 },
    'odpt.Station:TokyoMetro.Ginza.Asakusa': { lat: 35.7112, lon: 139.7963 },
    'odpt.Station:Toei.Asakusa.Asakusa': { lat: 35.7112, lon: 139.7963 },
    'odpt.Station:TokyoMetro.Hibiya.Akihabara': { lat: 35.6984, lon: 139.7731 },
    'odpt.Station:JR-East.Yamanote.Akihabara': { lat: 35.6984, lon: 139.7731 },
    'odpt.Station:TokyoMetro.Marunouchi.Tokyo': { lat: 35.6812, lon: 139.7671 },
    'odpt.Station:JR-East.Yamanote.Tokyo': { lat: 35.6812, lon: 139.7671 },
    'odpt.Station:TokyoMetro.Ginza.Ginza': { lat: 35.6717, lon: 139.7636 },
    'odpt.Station:Toei.Asakusa.Kuramae': { lat: 35.7019, lon: 139.7867 },
    'odpt.Station:Toei.Oedo.ShinOkachimachi': { lat: 35.7073, lon: 139.7793 },
    'odpt.Station:TokyoMetro.Ginza.Kanda': { lat: 35.6918, lon: 139.7709 },
    'odpt.Station:TokyoMetro.Marunouchi.Otemachi': { lat: 35.6867, lon: 139.7639 }
};

// Helper to determine operator from ID
function getOperatorFromId(nodeId: string): string | null {
    if (nodeId.includes('TokyoMetro')) return 'TokyoMetro';
    if (nodeId.includes('Toei')) return 'Toei';
    if (nodeId.includes('JR-East')) return 'JR-East';
    return null;
}

// Mock Enrichment for Demo Stations (L1-L4 compliant)
export const mockProfiles: Record<string, any> = {
    'odpt:Station:TokyoMetro.Ueno': {
        category_counts: {
            medical: 8, shopping: 120, dining: 150, leisure: 45, education: 12, finance: 20,
            nature: 45, religion: 12, accommodation: 35, workspace: 50, housing: 10,
            convenience_count: 15, drugstore_count: 8, restaurant_count: 80, cafe_count: 35,
            shrine_count: 5, temple_count: 7, museum_count: 6
        },
        vibe_tags: ['#阿美橫町', '#文化森林', '#美術館巡禮', '#下町風情', '#交通心臟'],
        l2_status: {
            congestion: 2,
            line_status: [
                { line: '銀座線', status: 'normal' },
                { line: '日比谷線', status: 'normal' },
                { line: '京成線', status: 'normal' }
            ],
            weather: { temp: 24, condition: 'Cloudy' }
        },
        l3_facilities: [
            // Tokyo Metro (B1-B2 地下層)
            { id: 'u-t-1', category: 'toilet', subCategory: 'station_toilet', location: 'Metro銀座線 往JR方向驗票口內', attributes: { has_washlet: true, wheelchair_accessible: true } },
            { id: 'u-t-2', category: 'toilet', subCategory: 'station_toilet', location: 'Metro日比谷線 電梯專用出口驗票口外', attributes: { has_washlet: true, wheelchair_accessible: true } },
            // JR East (3F 高架層)
            { id: 'u-t-3', category: 'toilet', subCategory: 'station_toilet', location: 'JR 3F 大連絡橋通道', attributes: { has_washlet: true, wheelchair_accessible: true } },
            { id: 'u-t-4', category: 'toilet', subCategory: 'station_toilet', location: 'JR 3F ecute Ueno 內', attributes: { has_washlet: true, wheelchair_accessible: true, note: '含育嬰室' } },
            // 置物櫃
            { id: 'u-l-1', category: 'locker', subCategory: 'coin_locker', location: 'JR 1F 中央口改札外', attributes: { sizes: ['S', 'M', 'L', 'XL'], count: 300, note: '最大量置物櫃區' } },
            { id: 'u-l-2', category: 'locker', subCategory: 'coin_locker', location: 'Metro B1 不忍口改札外', attributes: { sizes: ['S', 'M', 'L'], count: 80 } },
            { id: 'u-l-3', category: 'locker', subCategory: 'coin_locker', location: 'JR 3F 公園口改札內', attributes: { sizes: ['S', 'M', 'L'], count: 100 } },
            { id: 'u-l-4', category: 'locker', subCategory: 'coin_locker', location: 'JR 3F 入谷口改札內', attributes: { sizes: ['S', 'M', 'L', 'XL'], count: 150, note: 'ecute 方向通道' } },
            // 無障礙電梯
            { id: 'u-e-1', category: 'accessibility', subCategory: 'elevator', location: 'Metro銀座線 月台～JR方向驗票口', attributes: { wheelchair_accessible: true } },
            { id: 'u-e-2', category: 'accessibility', subCategory: 'elevator', location: 'Metro銀座線 公園驗票口～5a出口', attributes: { wheelchair_accessible: true, note: '通往上野公園' } },
            { id: 'u-e-3', category: 'accessibility', subCategory: 'elevator', location: 'Metro日比谷線 1號月台～驗票口', attributes: { wheelchair_accessible: true } },
            { id: 'u-e-4', category: 'accessibility', subCategory: 'elevator', location: 'JR 正面廣場 通往Metro驗票口層', attributes: { wheelchair_accessible: true, note: '7:30-22:00 限定' } },
            // 充電 & WiFi
            { id: 'u-c-1', category: 'charging', subCategory: 'charging_spot', location: 'JR 3F ecute Ueno 咖啡廳', attributes: { outlet_type: ['Type-A', 'Type-C'], is_free: true } },
            { id: 'u-w-1', category: 'wifi', subCategory: 'free_wifi', location: 'Metro 改札內全區', attributes: { name: 'METRO_FREE_WiFi', note: '限時30分' } },
            { id: 'u-w-2', category: 'wifi', subCategory: 'free_wifi', location: 'JR 改札內外全站', attributes: { name: 'JR-EAST_FREE_WiFi', note: '需登錄' } }
        ],
        l4_nudges: [
            { type: 'primary', title: '建議不忍口出站', content: '阿美橫町正在打折，且此出口人流較少。', advice: '往京成上野方向移動。' },
            { type: 'secondary', title: '美術館巡禮路線', content: '上野公園內有五座美術館。', advice: '從公園口出站，依順序參觀：東京都美術館 → 國立西洋美術館 → 上野之森美術館，可享受完整藝術饗宴。' },
            { type: 'secondary', title: '深夜注意', content: '夜間人流稀少區域較多。', advice: '22:00後建議避免從湯島方向步行，可使用計程車或選擇JR站內動線。' }
        ]
    },
    // Duplicates removed (Asakusa) - see reconciled entry below

    'odpt:Station:JR-East.Akihabara': {
        category_counts: {
            medical: 5, shopping: 250, dining: 120, leisure: 100, education: 2, finance: 10,
            workspace: 60, housing: 5, religion: 8, nature: 2, accommodation: 15,
            convenience_count: 12, drugstore_count: 15, restaurant_count: 60, cafe_count: 40, // Maid cafes included
            shrine_count: 2, temple_count: 0, museum_count: 1
        },
        vibe_tags: ['#電氣街', '#御宅文化', '#IT產業', '#女僕喫茶', '#次文化聖地'],
        l2_status: {
            congestion: 4,
            line_status: [], // Fetched dynamically
            weather: { temp: 25, condition: 'Sunny' }
        },
        l3_facilities: [
            { id: 'ak-l-1', category: 'locker', subCategory: 'coin_locker', location: '昭和通口改札外', attributes: { sizes: ['XL', 'XXL'], count: 200, note: '適合動漫戰利品' } },
            { id: 'ak-c-1', category: 'charging', subCategory: 'free_outlet', location: '電氣街口咖啡廳', attributes: { outlet_type: ['Type-A', 'Type-C'], is_free: true } }
        ],
        l4_nudges: [
            { type: 'primary', title: '週日步行者天國', content: '中央通目前禁止車輛通行。', advice: '這是在馬路中央拍照的絕佳機會，但請小心人群。' }
        ]
    },
    'odpt:Station:JR-East.Tokyo': {
        category_counts: {
            medical: 20, shopping: 150, dining: 200, leisure: 50, education: 5, finance: 80,
            workspace: 300, housing: 0, religion: 2, nature: 30, accommodation: 50,
            convenience_count: 20, drugstore_count: 10, restaurant_count: 120, cafe_count: 60,
            shrine_count: 1, temple_count: 0, museum_count: 3
        },
        vibe_tags: ['#國家門戶', '#紅磚建築', '#商務中樞', '#丸之內', '#伴手禮戰區'],
        l2_status: {
            congestion: 4,
            line_status: [
                { line: '中央線', status: 'normal' },
                { line: '山手線', status: 'normal' },
                { line: '京葉線', status: 'normal' },
                { line: '東海道新幹線', status: 'normal' }
            ],
            weather: { temp: 24, condition: 'Cloudy' }
        },
        l3_facilities: [
            { id: 't-t-1', category: 'toilet', subCategory: 'station_toilet', location: '丸之內南口改札內', attributes: { has_washlet: true, wheelchair_accessible: true } },
            { id: 't-t-2', category: 'toilet', subCategory: 'station_toilet', location: '八重洲北口改札外', attributes: { has_washlet: true, wheelchair_accessible: true } },
            { id: 't-l-1', category: 'locker', subCategory: 'coin_locker', location: '丸之內地下改札', attributes: { sizes: ['S', 'M', 'L', 'XL'], count: 500 } },
            { id: 't-l-2', category: 'locker', subCategory: 'coin_locker', location: '八重洲地下街', attributes: { sizes: ['S', 'M', 'L', 'XL', 'XXL'], count: 800 } },
            { id: 't-a-1', category: 'accommodation', subCategory: 'luxury_hotel', location: '丸之內南口直結', attributes: { name: '東京車站大飯店', note: '站內唯一五星級' } },
            { id: 't-e-1', category: 'accessibility', subCategory: 'elevator', location: '丸之內北口', attributes: { connects_floors: ['B1', '1F'], wheelchair_accessible: true } },
            { id: 't-e-2', category: 'accessibility', subCategory: 'elevator', location: '八重洲南口', attributes: { connects_floors: ['B5', 'B1', '1F'], wheelchair_accessible: true, note: '直達京葉線' } },
            { id: 't-c-1', category: 'charging', subCategory: 'charging_lounge', location: 'KITTE 1F', attributes: { outlet_type: ['Type-A', 'Type-C', 'USB'], is_free: true } },
            { id: 't-w-1', category: 'wifi', subCategory: 'free_wifi', location: '改札內外全區', attributes: { name: 'JR-EAST_FREE_WiFi', note: '需登錄' } }
        ],
        l4_nudges: [
            { type: 'primary', title: '京葉線轉乘警示', content: '前往迪士尼的京葉線月台距離極遠 (800m)。', advice: '請預留至少 20 分鐘步行時間，或使用電動步道。' },
            { type: 'primary', title: '便當激戰區', content: '東京車站是全日本車站便當種類最多的地方。', advice: '祭 MATSURI (南口)、駅弁屋 (中央口) 提供 200 種以上車站便當，建議發車前 30 分先選購。' },
            { type: 'secondary', title: '丸之內側 vs 八重洲側', content: '車站東西兩側氛圍迥異。', advice: '丸之內：紅磚站舍、商業區、KITTE。八重洲：現代化購物中心、高速巴士站。依目的選擇出口。' }
        ]
    },
    'odpt:Station:TokyoMetro.Ginza': {
        category_counts: {
            medical: 30, shopping: 300, dining: 250, leisure: 80, education: 5, finance: 40,
            workspace: 100, housing: 10, religion: 5, nature: 5, accommodation: 40,
            convenience_count: 18, drugstore_count: 12, restaurant_count: 180, cafe_count: 55,
            shrine_count: 3, temple_count: 1, museum_count: 2
        },
        vibe_tags: ['#奢華購物', '#步行者天國', '#歌舞伎座', '#大人味', '#米其林'],
        l2_status: { congestion: 3, line_status: [], weather: { temp: 25, condition: 'Clear' } },
        l3_facilities: [
            { id: 'g-l-1', category: 'leisure', subCategory: 'theater', location: '4號出口', attributes: { name: '歌舞伎座' } },
            { id: 'g-w-1', category: 'wifi', subCategory: 'free_public_wifi', location: 'G-Six 前', attributes: { speed: 'Fast' } }
        ],
        l4_nudges: [
            { type: 'primary', title: '善用地下連通道', content: '今日天氣炎熱。', advice: '利用地下道可直通各大百貨，避開地面日曬。' }
        ]
    },
    // Duplicates removed (Kuramae) - see reconciled entry below

    'odpt:Station:JR-East.Okachimachi': {
        category_counts: {
            medical: 10, shopping: 300, dining: 200, leisure: 50, education: 2, finance: 15,
            workspace: 40, housing: 20, religion: 5, nature: 0, accommodation: 15,
            convenience_count: 10, drugstore_count: 8, restaurant_count: 90, cafe_count: 25,
            shrine_count: 2, temple_count: 1, museum_count: 0
        },
        vibe_tags: ['#阿美橫町尾端', '#珠寶批發', '#吉池海鮮', '#高架下', '#便宜好貨'],
        l2_status: { congestion: 4, line_status: [], weather: { temp: 24, condition: 'Clear' } },
        l3_facilities: [
            { id: 'o-s-1', category: 'shopping', subCategory: 'supermarket', location: '吉池大樓', attributes: { name: '吉池', note: '專業海鮮超市' } },
            { id: 'o-e-1', category: 'accessibility', subCategory: 'elevator', location: '吉池大樓側', attributes: { note: '避開人潮捷徑' } }
        ],
        l4_nudges: [
            { type: 'primary', title: '高架下通行', content: '主要道路人潮擁擠。', advice: '沿著高架橋下移動，不僅有很多特色小店，還能避開日曬雨淋。' }
        ]
    },
    'odpt:Station:JR-East.Uguisudani': {
        category_counts: {
            medical: 5, shopping: 20, dining: 40, leisure: 30, education: 1, finance: 5,
            workspace: 10, housing: 60, religion: 10, nature: 15, accommodation: 80,
            convenience_count: 8, drugstore_count: 3, restaurant_count: 25, cafe_count: 10,
            shrine_count: 3, temple_count: 4, museum_count: 1
        },
        vibe_tags: ['#昭和感', '#情侶旅館街', '#串燒', '#公共澡堂', '#隱密後花園'],
        l2_status: { congestion: 1, line_status: [], weather: { temp: 24, condition: 'Night' } },
        l3_facilities: [
            { id: 'u-b-1', category: 'leisure', subCategory: 'sento', location: '北口步行 3 分', attributes: { name: '萩之湯', note: '都內最大級錢湯' } },
            { id: 'u-e-1', category: 'accessibility', subCategory: 'elevator', location: '南口天橋', attributes: { note: '隱密出口' } }
        ],
        l4_nudges: [
            { type: 'primary', title: '北口 vs 南口', content: '兩出口氛圍截然不同。', advice: '南口通往上野公園的寧靜，北口則是熱鬧的夜生活區，請依需求選擇。' }
        ]
    },
    'odpt:Station:Toei.Asakusabashi': {
        category_counts: {
            medical: 5, shopping: 150, dining: 80, leisure: 10, education: 1, finance: 10,
            workspace: 40, housing: 30, religion: 2, nature: 5, accommodation: 20,
            convenience_count: 9, drugstore_count: 5, restaurant_count: 40, cafe_count: 15,
            shrine_count: 2, temple_count: 0, museum_count: 0
        },
        vibe_tags: ['#問屋街', '#手作材料', '#人形老舖', '#總武線轉乘', '#職人聖地'],
        l2_status: { congestion: 3, line_status: [{ line: '淺草線', status: 'normal' }], weather: { temp: 24, condition: 'Cloudy' } },
        l3_facilities: [
            { id: 'ab-s-1', category: 'shopping', subCategory: 'stationery', location: '東口步行 1 分', attributes: { name: 'Shimojima', note: '包裝用品/文具/廁所' } },
            { id: 'ab-d-1', category: 'dining', subCategory: 'izakaya', location: '高架下', attributes: { note: '老派居酒屋聚集' } }
        ],
        l4_nudges: [
            { type: 'primary', title: '垂直轉乘陷阱', content: '淺草線(地下) <-> 總武線(高架)。', advice: '轉乘落差極大且距離較遠，請預留 10 分鐘以上移動時間。' }
        ]
    },
    'odpt:Station:TokyoMetro.Tawaramachi': {
        category_counts: {
            medical: 5, shopping: 200, dining: 50, leisure: 5, education: 0, finance: 5,
            workspace: 10, housing: 30, religion: 15, nature: 0, accommodation: 15,
            convenience_count: 6, drugstore_count: 2, restaurant_count: 30, cafe_count: 12,
            shrine_count: 1, temple_count: 8, museum_count: 0
        },
        vibe_tags: ['#合羽橋道具街', '#食品模型', '#料理人', '#金色河童', '#職人魂'],
        l2_status: { congestion: 2, line_status: [], weather: { temp: 24, condition: 'Clear' } },
        l3_facilities: [
            { id: 'tm-s-1', category: 'shopping', subCategory: 'specialty_store', location: '道具街入口', attributes: { name: 'Niimi', note: '巨型廚師像地標' } },
            { id: 'tm-r-1', category: 'religion', subCategory: 'temple', location: '步行 5 分', attributes: { name: '東本願寺' } }
        ],
        l4_nudges: [
            { type: 'primary', title: '職人街的作息', content: '店家打烊時間極早。', advice: '合羽橋道具街大多在 17:00 關門，請務必在白天前往。' }
        ]
    },
    'odpt:Station:TokyoMetro.Iriya': {
        category_counts: {
            medical: 8, shopping: 30, dining: 40, leisure: 10, education: 5, finance: 5,
            workspace: 10, housing: 100, religion: 20, nature: 10, accommodation: 10,
            convenience_count: 7, drugstore_count: 4, restaurant_count: 25, cafe_count: 8,
            shrine_count: 4, temple_count: 10, museum_count: 0
        },
        vibe_tags: ['#入谷朝顏市', '#鬼子母神', '#昭和巷弄', '#下町生活', '#鰻魚飯'],
        l2_status: { congestion: 1, line_status: [], weather: { temp: 24, condition: 'Clear' } },
        l3_facilities: [
            { id: 'ir-s-1', category: 'shopping', subCategory: 'supermarket', location: '十字路口', attributes: { name: '業務超市', note: '便宜補給' } },
            { id: 'ir-r-1', category: 'religion', subCategory: 'temple', location: '步行 3 分', attributes: { name: '真源寺', note: '入谷鬼子母神' } }
        ],
        l4_nudges: [
            { type: 'primary', title: '生活禮儀', content: '此區為純住宅區。', advice: '許多名店藏身於巷弄民宅中，排隊或移動時請降低音量。' }
        ]
    },
    'odpt:Station:Toei.HigashiGinza': {
        category_counts: {
            medical: 15, shopping: 100, dining: 150, leisure: 60, education: 5, finance: 10,
            workspace: 50, housing: 10, religion: 5, nature: 0, accommodation: 30,
            convenience_count: 10, drugstore_count: 6, restaurant_count: 80, cafe_count: 40,
            shrine_count: 1, temple_count: 0, museum_count: 1
        },
        vibe_tags: ['#歌舞伎座直結', '#排隊三明治', '#岩手銀河廣場', '#演藝場', '#大人約會'],
        l2_status: { congestion: 3, line_status: [], weather: { temp: 24, condition: 'Clear' } },
        l3_facilities: [
            { id: 'hg-s-1', category: 'shopping', subCategory: 'specialty_store', location: '3號出口', attributes: { name: '歌舞伎座地下街', note: '免票入場買伴手禮' } },
            { id: 'hg-d-1', category: 'dining', subCategory: 'cafe', location: '4號出口', attributes: { name: '喫茶You', note: '傳說級蛋包飯' } }
        ],
        l4_nudges: [
            { type: 'primary', title: '避開散場人潮', content: '歌舞伎座散場時極度擁擠。', advice: '建議利用地下連通道步行至銀座站乘車，僅需 5 分鐘。' }
        ]
    },
    'odpt:Station:Toei.Nihombashi': {
        category_counts: {
            medical: 20, shopping: 200, dining: 150, leisure: 40, education: 5, finance: 100,
            workspace: 150, housing: 5, religion: 10, nature: 5, accommodation: 40,
            convenience_count: 15, drugstore_count: 8, restaurant_count: 100, cafe_count: 45,
            shrine_count: 3, temple_count: 0, museum_count: 2
        },
        vibe_tags: ['#道路元標', '#百貨本店', '#麒麟之翼', '#金融街', '#傳統革新'],
        l2_status: { congestion: 3, line_status: [], weather: { temp: 24, condition: 'Cloudy' } },
        l3_facilities: [
            { id: 'nb-l-1', category: 'leisure', subCategory: 'landmark', location: '橋上', attributes: { name: '日本國道路元標', note: '日本公路原點' } },
            { id: 'nb-s-1', category: 'shopping', subCategory: 'department_store', location: 'B4 出口', attributes: { name: '三越本店', note: '歷史建築' } }
        ],
        l4_nudges: [
            { type: 'primary', title: '免費巡迴巴士', content: '周邊歷史建築眾多。', advice: '推薦搭乘免費的「Metrolink」巡迴巴士，輕鬆遊覽日本橋與東京站周邊。' }
        ]
    },
    'odpt:Station:Toei.Ningyocho': {
        category_counts: {
            medical: 15, shopping: 80, dining: 120, leisure: 20, education: 5, finance: 10,
            workspace: 30, housing: 60, religion: 25, nature: 5, accommodation: 20,
            convenience_count: 12, drugstore_count: 6, restaurant_count: 70, cafe_count: 25,
            shrine_count: 8, temple_count: 4, museum_count: 0
        },
        vibe_tags: ['#甘酒橫丁', '#水天宮', '#人形燒', '#老舖壽喜燒', '#江戶情懷'],
        l2_status: { congestion: 2, line_status: [], weather: { temp: 24, condition: 'Clear' } },
        l3_facilities: [
            { id: 'nc-r-1', category: 'religion', subCategory: 'shrine', location: '6號出口', attributes: { name: '水天宮', note: '安產祈願名所' } },
            { id: 'nc-d-1', category: 'dining', subCategory: 'sweets', location: '甘酒橫丁', attributes: { name: '柳屋', note: '百年鯛魚燒' } }
        ],
        l4_nudges: [
            { type: 'primary', title: '甘酒橫丁必吃', content: '排隊名店眾多。', advice: '柳屋鯛魚燒建議避開下午 3 點高峰，或選擇平日上午前往。' }
        ]
    },
    'odpt:Station:Toei.HigashiNihombashi': {
        category_counts: {
            medical: 5, shopping: 100, dining: 50, leisure: 10, education: 2, finance: 10,
            workspace: 60, housing: 40, religion: 5, nature: 5, accommodation: 50,
            convenience_count: 8, drugstore_count: 3, restaurant_count: 35, cafe_count: 10,
            shrine_count: 1, temple_count: 0, museum_count: 0
        },
        vibe_tags: ['#批發街', '#成衣問屋', '#新宿線轉乘', '#多站共構', '#商旅聚集'],
        l2_status: { congestion: 3, line_status: [{ line: '新宿線', status: 'normal' }], weather: { temp: 24, condition: 'Cloudy' } },
        l3_facilities: [
            { id: 'hn-s-1', category: 'shopping', subCategory: 'wholesale', location: '周邊', attributes: { note: '大多店鋪謝絕零售' } },
            { id: 'hn-t-1', category: 'transport', subCategory: 'transfer', location: '地下通路', attributes: { note: '連接馬喰橫山/馬喰町' } }
        ],
        l4_nudges: [
            { type: 'primary', title: '三角轉乘迷宮', content: '三站共構(淺草/新宿/總武)。', advice: '轉乘通道極為複雜且長，請務必確認地面上的顏色指引：淺草(紅)、新宿(草綠)、總武(黃)。' }
        ]
    },
    'odpt:Station:TokyoMetro.Kyobashi': {
        category_counts: {
            medical: 10, shopping: 30, dining: 80, leisure: 60, education: 5, finance: 50,
            workspace: 120, housing: 10, religion: 0, nature: 2, accommodation: 30,
            convenience_count: 10, drugstore_count: 5, restaurant_count: 50, cafe_count: 25,
            shrine_count: 0, temple_count: 0, museum_count: 4
        },
        vibe_tags: ['#藝術畫廊', '#古董街', '#高級辦公區', '#京橋Edogrand', '#隱藏美食'],
        l2_status: { congestion: 2, line_status: [], weather: { temp: 24, condition: 'Clear' } },
        l3_facilities: [
            { id: 'kb-l-1', category: 'leisure', subCategory: 'museum', location: '步行 5 分', attributes: { name: 'Artizon Museum', note: '前石橋美術館' } },
            { id: 'kb-s-1', category: 'shopping', subCategory: 'mall', location: '直結', attributes: { name: 'Kyobashi Edogrand', note: '現代化複合設施' } }
        ],
        l4_nudges: [
            { type: 'primary', title: '免費藝術散步', content: '周邊畫廊林立。', advice: '許多古董店與畫廊歡迎參觀，是東京最密集的藝術區域之一。' }
        ]
    },
    'odpt:Station:TokyoMetro.Mitsukoshimae': {
        category_counts: {
            medical: 15, shopping: 250, dining: 150, leisure: 50, education: 5, finance: 80,
            workspace: 100, housing: 5, religion: 15, nature: 5, accommodation: 20,
            convenience_count: 12, drugstore_count: 8, restaurant_count: 90, cafe_count: 35,
            shrine_count: 1, temple_count: 0, museum_count: 1
        },
        vibe_tags: ['#三越獅像', '#Coredo室町', '#金魚展', '#福德神社', '#購物天國'],
        l2_status: { congestion: 3, line_status: [{ line: '半藏門線', status: 'normal' }], weather: { temp: 24, condition: 'Cloudy' } },
        l3_facilities: [
            { id: 'mm-r-1', category: 'religion', subCategory: 'shrine', location: 'Coredo 後方', attributes: { name: '福德神社', note: '求中獎運' } },
            { id: 'mm-d-1', category: 'dining', subCategory: 'restaurant', location: 'Coredo 室町', attributes: { note: '老舖新開聚集地' } }
        ],
        l4_nudges: [
            { type: 'primary', title: '地下直通攻略', content: '雨天最佳備案。', advice: '地下通道可從三越前一路走到日本橋甚至東京站，完全不必淋雨。' }
        ]
    },
    'odpt:Station:JR-East.Kanda': {
        category_counts: {
            medical: 20, shopping: 50, dining: 300, leisure: 40, education: 30, finance: 40,
            workspace: 80, housing: 20, religion: 10, nature: 5, accommodation: 50,
            convenience_count: 15, drugstore_count: 10, restaurant_count: 150, cafe_count: 30,
            shrine_count: 2, temple_count: 1, museum_count: 0
        },
        vibe_tags: ['#咖哩激戰區', '#古書店街', '#學生街', '#居酒屋', '#運動用品'],
        l2_status: { congestion: 3, line_status: [{ line: 'JR線', status: 'normal' }], weather: { temp: 24, condition: 'Sunny' } },
        l3_facilities: [
            { id: 'kd-d-1', category: 'dining', subCategory: 'restaurant', location: '車站周邊', attributes: { name: '神田咖哩街', note: '超過 400 間咖哩店' } },
            { id: 'kd-s-1', category: 'shopping', subCategory: 'bookstore', location: '靖國通', attributes: { name: '神保町古書街', note: '世界最大規模(步行圈)' } }
        ],
        l4_nudges: [
            { type: 'primary', title: '午餐時間警報', content: '上班族用餐一級戰區。', advice: '平日 11:30-13:30 各大咖哩名店皆需排隊，建議錯峰前往。' }
        ]
    },
    'odpt:Station:TokyoMetro.Inaricho': {
        category_counts: {
            medical: 10, shopping: 40, dining: 50, leisure: 20, education: 5, finance: 5,
            workspace: 10, housing: 80, religion: 50, nature: 5, accommodation: 15,
            convenience_count: 6, drugstore_count: 3, restaurant_count: 20, cafe_count: 8,
            shrine_count: 5, temple_count: 8, museum_count: 0
        },
        vibe_tags: ['#佛壇街', '#下町錢湯', '#稻荷神社', '#寧靜巷弄', '#淺草玄關'],
        l2_status: { congestion: 2, line_status: [], weather: { temp: 24, condition: 'Clear' } },
        l3_facilities: [
            { id: 'in-l-1', category: 'leisure', subCategory: 'sento', location: '步行 5 分', attributes: { name: '壽湯', note: '附設露天風呂的有名錢湯' } },
            { id: 'in-r-1', category: 'religion', subCategory: 'shrine', location: '車站旁', attributes: { name: '下谷神社', note: '東京最古老的稻荷神社' } }
        ],
        l4_nudges: [
            { type: 'primary', title: '錢湯禮儀', content: '體驗在地入浴文化。', advice: '進入浴池前請務必先將身體洗淨，並將盤起的頭髮或毛巾置於頭上，勿浸入水中。' }
        ]
    },
    'odpt:Station:TokyoMetro.Minowa': {
        category_counts: {
            medical: 10, shopping: 60, dining: 40, leisure: 20, education: 2, finance: 5,
            workspace: 5, housing: 80, religion: 10, nature: 5, accommodation: 10,
            convenience_count: 5, drugstore_count: 4, restaurant_count: 25, cafe_count: 10,
            shrine_count: 2, temple_count: 3, museum_count: 1
        },
        vibe_tags: ['#JoyfulMinowa', '#都電荒川線', '#復古商店街', '#下町生活', '#昭和風情'],
        l2_status: { congestion: 2, line_status: [], weather: { temp: 24, condition: 'Cloudy' } },
        l3_facilities: [
            { id: 'mi-s-1', category: 'shopping', subCategory: 'arcade', location: '車站旁', attributes: { name: 'Joyful Minowa', note: '有屋頂的復古商店街' } },
            { id: 'mi-t-1', category: 'transport', subCategory: 'tram', location: '步行 5 分', attributes: { name: '都電荒川線', note: '三之輪橋站' } }
        ],
        l4_nudges: [
            { type: 'primary', title: '路面電車轉乘', content: '東京僅存的路面電車。', advice: '若要前往早稻田方向，請步行至「三之輪橋站」搭乘都電荒川線，可享受悠閒的東京散策。' }
        ]
    },
    'odpt:Station:Toei.ShinOkachimachi': {
        category_counts: {
            medical: 5, shopping: 100, dining: 50, leisure: 10, education: 2, finance: 10,
            workspace: 40, housing: 80, religion: 10, nature: 5, accommodation: 5,
            convenience_count: 8, drugstore_count: 4, restaurant_count: 30, cafe_count: 12,
            shrine_count: 2, temple_count: 2, museum_count: 0
        },
        vibe_tags: ['#佐竹商店街', '#大江戶線轉乘', '#職人批發', '#懷舊拱廊', '#下町中心'],
        l2_status: { congestion: 2, line_status: [{ line: '大江戶線', status: 'normal' }], weather: { temp: 24, condition: 'Cloudy' } },
        l3_facilities: [
            { id: 'so-s-1', category: 'shopping', subCategory: 'arcade', location: 'A2 出口', attributes: { name: '佐竹商店街', note: '日本第二古老商店街' } },
            { id: 'so-t-1', category: 'transport', subCategory: 'transfer', location: '地下', attributes: { note: '筑波快線轉乘' } }
        ],
        l4_nudges: [
            { type: 'primary', title: '深層地下鐵陷阱', content: '大江戶線月台極深。', advice: '從地面改札口到月台需搭乘 3 次長扶梯，請預留 5-8 分鐘進站時間。' }
        ]
    },
    'odpt:Station:TokyoMetro.Yushima': {
        category_counts: {
            medical: 15, shopping: 30, dining: 60, leisure: 40, education: 80, finance: 10,
            workspace: 20, housing: 80, religion: 60, nature: 20, accommodation: 30,
            convenience_count: 6, drugstore_count: 3, restaurant_count: 40, cafe_count: 15,
            shrine_count: 5, temple_count: 2, museum_count: 2
        },
        vibe_tags: ['#湯島天神', '#學問之神', '#梅花祭', '#男坂女坂', '#夫婦坂'],
        l2_status: { congestion: 2, line_status: [], weather: { temp: 24, condition: 'Clear' } },
        l3_facilities: [
            { id: 'yu-r-1', category: 'religion', subCategory: 'shrine', location: '3號出口步行 2 分', attributes: { name: '湯島天滿宮', note: '考生必拜' } },
            { id: 'yu-d-1', category: 'dining', subCategory: 'cafe', location: '神社旁', attributes: { name: '甘味處 Minnato', note: '日式甜點' } }
        ],
        l4_nudges: [
            { type: 'primary', title: '男坂與女坂', content: '通往神社的兩條坡道。', advice: '男坂極陡峭，適合想挑戰且快速登頂的人；女坂較緩和，適合悠閒散步。' }
        ]
    },
    'odpt:Station:TokyoMetro.Tsukiji': {
        category_counts: {
            medical: 10, shopping: 50, dining: 300, leisure: 20, transport: 15, nature: 10,
            convenience_count: 5, drugstore_count: 2, restaurant_count: 150, cafe_count: 20, // Market stalls counted
            shrine_count: 1, temple_count: 2, museum_count: 0
        },
        vibe_tags: ['#場外市場', '#新鮮海產', '#本願寺', '#美食天堂', '#早市體驗'],
        l2_status: { congestion: 4, line_status: [], weather: { temp: 24, condition: 'Clear' } },
        l3_facilities: [
            { id: 'tj-s-1', category: 'dining', subCategory: 'market', location: '車站 1 號出口步行 1 分', attributes: { name: '築地場外市場', note: '壽司與海鮮丼集中地' } },
            { id: 'tj-r-1', category: 'religion', subCategory: 'temple', location: '車站出口旁', attributes: { name: '築地本願寺', note: '印度風格特殊建築' } }
        ],
        l4_nudges: [
            { type: 'primary', title: '築地早市攻略', content: '場外市場大多數名店在中午即打烊。', advice: '建議在上午 10 點前抵達，避開正午收攤時刻，並享受最新鮮的漁獲。' }
        ]
    },
    'odpt:Station:TokyoMetro.Ochanomizu': {
        category_counts: {
            medical: 50, shopping: 80, dining: 100, education: 150, leisure: 30, religion: 20,
            convenience_count: 15, drugstore_count: 10, restaurant_count: 60, cafe_count: 40,
            shrine_count: 2, temple_count: 1, museum_count: 1
        },
        vibe_tags: ['#樂器街', '#醫學中樞', '#尼古拉堂', '#神田川', '#學術氛圍'],
        l2_status: { congestion: 4, line_status: [], weather: { temp: 23, condition: 'Cloudy' } },
        l3_facilities: [
            { id: 'om-s-1', category: 'shopping', subCategory: 'musical_instruments', location: '明大通', attributes: { name: '樂器街', note: '吉他愛好者聖地' } },
            { id: 'om-r-1', category: 'religion', subCategory: 'church', location: '聖橋旁', attributes: { name: '尼古拉堂', note: '重要文化財' } }
        ],
        l4_nudges: [
            { type: 'primary', title: '兩站轉乘注意', content: 'JR 與丸之內線站體獨立。', advice: '兩線轉乘需出站步行過聖橋，雨天請攜帶雨具，步行時間約 5 分鐘。' }
        ]
    },
    'odpt:Station:TokyoMetro.Kasumigaseki': {
        category_counts: {
            medical: 5, shopping: 20, dining: 60, workspace: 400, transport: 20, nature: 50,
            convenience_count: 20, drugstore_count: 5, restaurant_count: 40, cafe_count: 25,
            shrine_count: 0, temple_count: 0, museum_count: 1
        },
        vibe_tags: ['#官廳街', '#政治中樞', '#日比谷公園', '#公務員', '#嚴謹氛圍'],
        l2_status: { congestion: 3, line_status: [], weather: { temp: 24, condition: 'Clear' } },
        l3_facilities: [
            { id: 'ks-n-1', category: 'nature', subCategory: 'park', location: 'A1 出口直結', attributes: { name: '日比谷公園', note: '都會綠洲' } },
            { id: 'ks-t-1', category: 'transport', subCategory: 'transfer', location: '地下通路', attributes: { note: '連接丸之內/日比谷/千代田三線' } }
        ],
        l4_nudges: [
            { type: 'primary', title: '隱藏的政府食堂', content: '在此上班的人極多。', advice: '部分政府機關大樓開放民眾進入使用地下食堂，價格實惠且份量十足，是午餐的好選擇。' }
        ]
    },
    'odpt:Station:TokyoMetro.Iidabashi': {
        category_counts: {
            medical: 10, shopping: 100, dining: 120, education: 40, leisure: 30, nature: 20,
            convenience_count: 12, drugstore_count: 8, restaurant_count: 70, cafe_count: 40,
            shrine_count: 3, temple_count: 2, museum_count: 1
        },
        vibe_tags: ['#五線交匯', '#神樂坂玄關', '#東京大神宮', '#外濠公園', '#運河咖啡'],
        l2_status: { congestion: 4, line_status: [], weather: { temp: 24, condition: 'Cloudy' } },
        l3_facilities: [
            { id: 'ib-r-1', category: 'religion', subCategory: 'shrine', location: '西口步行 5 分', attributes: { name: '東京大神宮', note: '最強戀愛結緣' } },
            { id: 'ib-d-1', category: 'dining', subCategory: 'cafe', location: '神樂坂方向', attributes: { name: 'Canal Cafe', note: '運河景觀咖啡' } }
        ],
        l4_nudges: [
            { type: 'primary', title: '神樂坂散步起點', content: '此處坡道較多。', advice: '從地下鐵 B3 出口直接抵達神樂坂下，沿坡而上可感受隱藏在巷弄間的小巴黎風情。' }
        ]
    },
    'odpt:Station:TokyoMetro.Otemachi': {
        category_counts: {
            medical: 20, shopping: 80, dining: 150, workspace: 500, finance: 120, nature: 40,
            convenience_count: 25, drugstore_count: 12, restaurant_count: 100, cafe_count: 60,
            shrine_count: 1, temple_count: 0, museum_count: 0
        },
        vibe_tags: ['#地鐵心臟', '#企業總部', '#皇居外苑', '#地下迷宮', '#商務精英'],
        l2_status: { congestion: 4, line_status: [], weather: { temp: 24, condition: 'Clear' } },
        l3_facilities: [
            { id: 'ot-t-1', category: 'transport', subCategory: 'hub', location: '地下', attributes: { note: '東京都內規模最大的地鐵站' } },
            { id: 'ot-n-1', category: 'nature', subCategory: 'garden', location: 'C13 出口', attributes: { name: '皇居東御苑', note: '免費進入' } }
        ],
        l4_nudges: [
            { type: 'primary', title: '究極轉乘陷阱', content: '五條路線(丸/東/千/半/三)交織。', advice: '轉乘距离可達 500m 以上，請預留充足時間，並善用地下連通道直通東京站換乘 JR。' }
        ]
    },
    'odpt:Station:TokyoMetro.Asakusa': {
        category_counts: {
            medical: 20, shopping: 300, dining: 400, leisure: 100, education: 5, finance: 20,
            workspace: 30, housing: 80, religion: 50, nature: 20, accommodation: 150,
            convenience_count: 25, drugstore_count: 15, restaurant_count: 200, cafe_count: 80,
            shrine_count: 5, temple_count: 15, museum_count: 3
        },
        vibe_tags: ['#雷門', '#仲見世通', '#淺草寺', '#水上巴士', '#下町風情'],
        l2_status: { congestion: 4, line_status: [{ line: '銀座線', status: 'normal' }, { line: '淺草線', status: 'normal' }], weather: { temp: 24, condition: 'Cloudy' } },
        l3_facilities: [
            { id: 'as-l-1', category: 'leisure', subCategory: 'landmark', location: '1號出口', attributes: { name: '雷門', note: '東京地標' } },
            { id: 'as-d-1', category: 'dining', subCategory: 'street_food', location: '仲見世通', attributes: { name: '人型燒', note: '現烤必吃' } }
        ],
        l4_nudges: [
            { type: 'primary', title: '人力車體驗', content: '從不同視角看淺草。', advice: '人力車伕通常熟知隱藏拍照點，若懂日語還能聽到有趣的歷史故事。' }
        ]
    },
    'odpt:Station:Toei.Kuramae': {
        category_counts: {
            medical: 10, shopping: 50, dining: 60, leisure: 10, education: 5, finance: 5,
            workspace: 40, housing: 100, religion: 10, nature: 10, accommodation: 20,
            convenience_count: 8, drugstore_count: 3, restaurant_count: 35, cafe_count: 25,
            shrine_count: 2, temple_count: 3, museum_count: 0
        },
        vibe_tags: ['#東京布魯克林', '#職人咖啡', '#隅田川', '#文具控', '#倉庫改建'],
        l2_status: { congestion: 2, line_status: [{ line: '淺草線', status: 'normal' }, { line: '大江戶線', status: 'normal' }], weather: { temp: 24, condition: 'Cloudy' } },
        l3_facilities: [
            { id: 'ku-d-1', category: 'dining', subCategory: 'cafe', location: '隅田川旁', attributes: { name: 'Dandelion Chocolate', note: '來自舊金山的巧克力工廠' } },
            { id: 'ku-s-1', category: 'shopping', subCategory: 'stationery', location: '步行 5 分', attributes: { name: 'Kakimori', note: '自製筆記本' } }
        ],
        l4_nudges: [
            { type: 'primary', title: '地上轉乘注意', content: '兩條與地下鐵無地下連通。', advice: '淺草線與大江戶線需出站轉乘，且距離約 300 公尺，請預留轉乘時間。' }
        ]
    },
    'odpt:Station:Toei.UenoOkachimachi': {
        category_counts: {
            medical: 15, shopping: 250, dining: 200, leisure: 30, education: 2, finance: 10,
            workspace: 20, housing: 50, religion: 5, nature: 5, accommodation: 30,
            convenience_count: 12, drugstore_count: 10, restaurant_count: 120, cafe_count: 40,
            shrine_count: 2, temple_count: 1, museum_count: 1
        },
        vibe_tags: ['#阿美橫町', '#大江戶線', '#御徒町轉乘', '#平價購物', '#多國籍料理'],
        l2_status: { congestion: 3, line_status: [{ line: '大江戶線', status: 'normal' }], weather: { temp: 24, condition: 'Cloudy' } },
        l3_facilities: [
            { id: 'uo-s-1', category: 'shopping', subCategory: 'market', location: 'A7 出口直結', attributes: { name: '阿美橫町', note: '南端入口' } },
            { id: 'uo-s-2', category: 'shopping', subCategory: 'department_store', location: 'A1 出口', attributes: { name: '松坂屋', note: '老牌百貨' } }
        ],
        l4_nudges: [
            { type: 'primary', title: '超級轉乘樞紐', content: '連接銀座線、日比谷線、JR。', advice: '透過地下通道可連接上野廣小路站(銀座線)、仲御徒町站(日比谷線)與御徒町站(JR)，雨天也非常方便。' }
        ]
    },
    'odpt:Station:TokyoMetro.Kayabacho': {
        category_counts: {
            medical: 20, shopping: 30, dining: 100, leisure: 10, education: 5, finance: 30,
            workspace: 200, housing: 40, religion: 5, nature: 10, accommodation: 40,
            convenience_count: 10, drugstore_count: 5, restaurant_count: 70, cafe_count: 30,
            shrine_count: 1, temple_count: 0, museum_count: 0
        },
        vibe_tags: ['#證券街', '#商業午餐', '#隅田川露台', '#下班小酌', '#交通便利'],
        l2_status: { congestion: 3, line_status: [{ line: '東西線', status: 'normal' }, { line: '日比谷線', status: 'normal' }], weather: { temp: 24, condition: 'Clear' } },
        l3_facilities: [
            { id: 'ky-d-1', category: 'dining', subCategory: 'restaurant', location: '車站周邊', attributes: { note: '午餐選擇豐富' } },
            { id: 'ky-t-1', category: 'transport', subCategory: 'transfer', location: '地下', attributes: { note: '東西線與日比谷線交會' } }
        ],
        l4_nudges: [
            { type: 'primary', title: '隱藏的河岸散步道', content: '靠近隅田川分支。', advice: '往永代橋方向步行約 5 分鐘，即是景色優美的隅田川露台，適合轉換心情。' }
        ]
    }
};

// Fetch single node with profile (Enhanced with Real-time)
export async function fetchNodeConfig(nodeId: string) {
    const { data: node, error: nodeError } = await supabase
        .from('nodes')
        .select('*')
        .eq('id', nodeId)
        .single();

    let finalNode = node;
    let finalProfile = null;

    if (nodeError) {
        console.warn(`Node fetch failed for ${nodeId}, checking fallbacks...`);
        // Try to find in CORE_STATIONS_FALLBACK
        const fallbackNode = CORE_STATIONS_FALLBACK.find(n => n.id === nodeId || nodeId.includes(n.name.en));
        if (fallbackNode) {
            finalNode = {
                ...fallbackNode,
                location: { type: 'Point', coordinates: fallbackNode.location.coordinates }
            };
        }
    }

    const { data: profile, error: profileError } = await supabase
        .from('node_facility_profiles')
        .select('*')
        .eq('node_id', nodeId)
        .single();

    finalProfile = profile;

    // Existing Mock Profile Logic
    let enrichedProfile = null;
    // Strict mock key matching
    if (mockProfiles[nodeId]) {
        enrichedProfile = {
            node_id: nodeId,
            ...mockProfiles[nodeId],
            ...(finalProfile || {})
        };
    }

    // [New] Real-time L2 Data Override
    try {
        // Only fetch if running on client or if we can access the internal API URL
        // In this case, we use a simple fetch to the Next.js API route we just fixed
        if (typeof window !== 'undefined') {
            const l2Res = await fetch(`/api/l2/status?station_id=${nodeId}`);
            if (l2Res.ok) {
                const l2Data = await l2Res.json();
                if (l2Data) {
                    if (!enrichedProfile) enrichedProfile = { node_id: nodeId, category_counts: {} as any, vibe_tags: [] };

                    // Override with Real Data
                    enrichedProfile.l2_status = l2Data;
                    console.log(`[L2] Applied real-time data for ${nodeId}`, l2Data);
                }
            }
        }
    } catch (e) {
        console.warn('Failed to fetch real-time L2 data', e);
    }
    // --- REAL-TIME STATUS INJECTION (MVP FIX) ---
    // --- REAL-TIME STATUS INJECTION (MVP FIX) ---
    const odptId = NODE_TO_ODPT[nodeId];

    if (odptId) {
        try {
            // 1. Fetch L2 Status (Congestion, Weather, Train Status)
            const l2Res = await fetch(`/api/l2/status?station_id=${encodeURIComponent(odptId)}`);
            if (l2Res.ok) {
                const l2Data = await l2Res.json();

                if (l2Data) {
                    if (!enrichedProfile) {
                        enrichedProfile = {
                            node_id: nodeId,
                            category_counts: (finalProfile as any)?.category_counts || {},
                            vibe_tags: (finalProfile as any)?.vibe_tags || [],
                            l3_facilities: (finalProfile as any)?.l3_facilities || []
                        };
                    }

                    enrichedProfile = {
                        ...enrichedProfile,
                        l2_status: {
                            congestion: l2Data.status_code === 'DELAY' ? 4 : 2, // Simple mapping
                            line_status: l2Data.status_code === 'DELAY'
                                ? [{ line: 'Transit', status: 'delay', message: l2Data.reason_ja || 'Delay reported' }]
                                : [{ line: 'Transit', status: 'normal' }],
                            weather: {
                                temp: l2Data.weather_info?.temp ? parseInt(l2Data.weather_info.temp) : 24,
                                condition: 'Cloudy'
                            }
                        }
                    };
                }
            }

            // 2. Fetch Accessibility/Facilities (Mock/Static for now or separate API)
            const facRes = await fetch(`/api/train?mode=facility&station=${odptId}`);
            if (facRes.ok) {
                const { facilities } = await facRes.json();
                if (facilities && facilities.length > 0) {
                    // Merge logic would go here if we were using it
                }
            }

        } catch (e) {
            console.warn('Failed to inject real-time L2 data', e);
        }
    }

    // --- END REAL-TIME INJECTION ---

    return {
        node: { ...finalNode, location: parseLocation(finalNode.location) },
        profile: enrichedProfile,
        error: null
    };
}



// Fetch logic for specific zones (e.g., get all Hubs in a city)
export async function fetchCityHubs(cityId: string) {
    const { data, error } = await supabase
        .from('nodes')
        .select('*')
        .eq('city_id', cityId)
        .eq('is_hub', true);

    if (error) {
        console.error('Error fetching city hubs:', error);
        return [];
    }
    return data;
}

// Fetch ALL nodes for manual map exploration (Using large radius from Tokyo center)
export async function fetchAllNodes() {
    // 35.6895, 139.6917 is Tokyo Station
    // 50000 meters = 50km radius covers all of Tokyo + suburbs
    const { data, error } = await supabase
        .rpc('nearby_nodes', {
            user_lat: 35.6895,
            user_lon: 139.6917,
            radius_meters: 50000
        });

    if (error) {
        console.error('Error fetching nodes from RPC, using hardcoded fallback:', error);
        return CORE_STATIONS_FALLBACK.map(n => ({ ...n, location: parseLocation(n.location) })) as any[];
    }

    return (data as any[]).map(n => {
        const seed = SEED_NODES.find(s => s.id === n.id);
        return {
            ...n,
            name: seed ? seed.name : n.name,
            location: parseLocation(n.location)
        };
    }) as NodeDatum[];
}
