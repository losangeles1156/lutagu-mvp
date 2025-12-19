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
    medical: number;
    shopping: number;
    dining: number;
    leisure: number;
    education: number;
    finance: number;
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

    return data as NodeDatum[];
}

const CORE_STATIONS_FALLBACK = [
    {
        id: 'odpt:Station:TokyoMetro.Ueno',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '上野', 'en': 'Ueno', 'ja': '上野' },
        type: 'station',
        location: { coordinates: [139.7773, 35.7138] },
        vibe: 'culture',
        is_hub: true
    },
    {
        id: 'odpt:Station:TokyoMetro.Asakusa',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '淺草', 'en': 'Asakusa', 'ja': '淺草' },
        type: 'station',
        location: { coordinates: [139.7976, 35.7119] },
        vibe: 'tourism',
        is_hub: true
    },
    {
        id: 'odpt:Station:JR-East.Tokyo',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '東京', 'en': 'Tokyo', 'ja': '東京' },
        type: 'station',
        location: { coordinates: [139.7671, 35.6812] },
        vibe: 'transit',
        is_hub: true
    },
    {
        id: 'odpt:Station:JR-East.Akihabara',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '秋葉原', 'en': 'Akihabara', 'ja': '秋葉原' },
        type: 'station',
        location: { coordinates: [139.7753, 35.6984] },
        vibe: 'geek',
        is_hub: true
    },
    {
        id: 'odpt:Station:TokyoMetro.Ginza',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '銀座', 'en': 'Ginza', 'ja': '銀座' },
        type: 'station',
        location: { coordinates: [139.7619, 35.6719] },
        vibe: 'luxury',
        is_hub: true
    },
    {
        id: 'odpt:Station:TokyoMetro.Yushima',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '湯島', 'en': 'Yushima', 'ja': '湯島' },
        type: 'station',
        location: { coordinates: [139.7711, 35.7077] },
        vibe: 'scholar',
        is_hub: false
    }
];

// Helper to determine operator from ID
function getOperatorFromId(nodeId: string): string | null {
    if (nodeId.includes('TokyoMetro')) return 'TokyoMetro';
    if (nodeId.includes('Toei')) return 'Toei';
    if (nodeId.includes('JR-East')) return 'JR-East';
    return null;
}

// Mock Enrichment for Demo Stations (L1-L4 compliant)
const mockProfiles: Record<string, any> = {
    'Ueno': {
        category_counts: {
            medical: 8, shopping: 120, dining: 150, leisure: 45, education: 12, finance: 20,
            nature: 45, religion: 12, accommodation: 35, workspace: 50, housing: 10
        },
        vibe_tags: ['#阿美橫町', '#文化森林', '#美術館巡禮', '#下町風情', '#交通心臟'],
        l2_status: {
            congestion: 2,
            line_status: [], // Fetched dynamically
            weather: { temp: 24, condition: 'Cloudy' }
        },
        l3_facilities: [
            { id: 'u-t-1', category: 'toilet', subCategory: 'station_toilet', location: 'B1 不忍口改札內', attributes: { has_washlet: true, wheelchair_accessible: true } },
            { id: 'u-l-1', category: 'locker', subCategory: 'coin_locker', location: '1F 中央口旁', attributes: { sizes: ['S', 'M', 'L'], count: 150 } }
        ],
        l4_nudges: [
            { type: 'primary', title: '建議不忍口出站', content: '阿美橫町正在打折，且此出口人流較少。', advice: '往京成上野方向移動。' }
        ]
    },
    'Asakusa': {
        category_counts: { medical: 15, shopping: 200, dining: 180, leisure: 150, education: 5, finance: 10 },
        vibe_tags: ['#雷門', '#仲見世通', '#水上巴士', '#下町風情', '#傳統工藝'],
        l2_status: {
            congestion: 5,
            line_status: [],
            weather: { temp: 24, condition: 'Clear' }
        },
        l3_facilities: [
            { id: 'a-t-1', category: 'toilet', subCategory: 'public_toilet', location: '雷門對面觀光中心 8F', attributes: { is_free: true, has_view: true } },
            { id: 'a-l-1', category: 'locker', subCategory: 'coin_locker', location: '銀座線 1 號出口旁', attributes: { sizes: ['L', 'XL'], count: 80 } },
            { id: 'a-e-1', category: 'accessibility', subCategory: 'elevator', location: 'A2b 出口', attributes: { note: '唯一地面直達電梯' } }
        ],
        l4_nudges: [
            { type: 'primary', title: '避開雷門正面人潮', content: '仲見世通目前極度擁擠。', advice: '建議從傳法院通繞道，或走地下街直通新仲見世。' }
        ]
    },
    'Akihabara': {
        category_counts: {
            medical: 5, shopping: 250, dining: 120, leisure: 100, education: 2, finance: 10,
            workspace: 60, housing: 5, religion: 8, nature: 2, accommodation: 15
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
    'Tokyo': {
        category_counts: {
            medical: 20, shopping: 150, dining: 200, leisure: 50, education: 5, finance: 80,
            workspace: 300, housing: 0, religion: 2, nature: 30, accommodation: 50
        },
        vibe_tags: ['#國家門戶', '#紅磚建築', '#商務中樞', '#丸之內', '#伴手禮戰區'],
        l2_status: { congestion: 4, line_status: [], weather: { temp: 24, condition: 'Cloudy' } },
        l3_facilities: [
            { id: 't-a-1', category: 'accommodation', subCategory: 'luxury_hotel', location: '丸之內南口直結', attributes: { name: '東京車站大飯店' } },
            { id: 't-e-1', category: 'accessibility', subCategory: 'elevator', location: '丸之內北口', attributes: { connects_floors: ['B1', '1F'] } }
        ],
        l4_nudges: [
            { type: 'primary', title: '京葉線轉乘警示', content: '前往迪士尼的京葉線月台距離極遠 (800m)。', advice: '請預留至少 20 分鐘步行時間，或使用電動步道。' }
        ]
    },
    'Ginza': {
        category_counts: {
            medical: 30, shopping: 300, dining: 250, leisure: 80, education: 5, finance: 40,
            workspace: 100, housing: 10, religion: 5, nature: 5, accommodation: 40
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
    'Kuramae': {
        category_counts: {
            medical: 5, shopping: 40, dining: 60, leisure: 15, education: 2, finance: 5,
            workspace: 30, housing: 80, religion: 5, nature: 20, accommodation: 10
        },
        vibe_tags: ['#東京布魯克林', '#職人咖啡', '#手工藝', '#隅田川', '#倉庫改建'],
        l2_status: { congestion: 2, line_status: [], weather: { temp: 24, condition: 'Cloudy' } },
        l3_facilities: [
            { id: 'k-c-1', category: 'dining', subCategory: 'cafe', location: 'A2 出口旁', attributes: { name: 'Dandelion Chocolate', note: '附設內用區' } },
            { id: 'k-n-1', category: 'nature', subCategory: 'riverside', location: '隅田川露台', attributes: { note: '適合散步' } }
        ],
        l4_nudges: [
            { type: 'primary', title: '隅田川散步建議', content: '接近黃昏時分。', advice: '現在是前往隅田川露台欣賞晴空塔點燈的最佳時刻。' }
        ]
    },
    'Okachimachi': {
        category_counts: {
            medical: 10, shopping: 300, dining: 200, leisure: 50, education: 2, finance: 15,
            workspace: 40, housing: 20, religion: 5, nature: 0, accommodation: 15
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
    'Uguisudani': {
        category_counts: {
            medical: 5, shopping: 20, dining: 40, leisure: 30, education: 1, finance: 5,
            workspace: 10, housing: 60, religion: 10, nature: 15, accommodation: 80
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
    'Asakusabashi': {
        category_counts: {
            medical: 5, shopping: 150, dining: 80, leisure: 10, education: 1, finance: 10,
            workspace: 40, housing: 30, religion: 2, nature: 5, accommodation: 20
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
    'Tawaramachi': {
        category_counts: {
            medical: 5, shopping: 200, dining: 50, leisure: 5, education: 0, finance: 5,
            workspace: 10, housing: 30, religion: 15, nature: 0, accommodation: 15
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
    'Iriya': {
        category_counts: {
            medical: 8, shopping: 30, dining: 40, leisure: 10, education: 5, finance: 5,
            workspace: 10, housing: 100, religion: 20, nature: 10, accommodation: 10
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
    'Higashi-ginza': {
        category_counts: {
            medical: 15, shopping: 100, dining: 150, leisure: 60, education: 5, finance: 10,
            workspace: 50, housing: 10, religion: 5, nature: 0, accommodation: 30
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
    'Nihombashi': {
        category_counts: {
            medical: 20, shopping: 200, dining: 150, leisure: 40, education: 5, finance: 100,
            workspace: 150, housing: 5, religion: 10, nature: 5, accommodation: 40
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
    'Ningyocho': {
        category_counts: {
            medical: 15, shopping: 80, dining: 120, leisure: 20, education: 5, finance: 10,
            workspace: 30, housing: 60, religion: 25, nature: 5, accommodation: 20
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
    'Higashi-nihombashi': {
        category_counts: {
            medical: 5, shopping: 100, dining: 50, leisure: 10, education: 2, finance: 10,
            workspace: 60, housing: 40, religion: 5, nature: 5, accommodation: 50
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
    'Kyobashi': {
        category_counts: {
            medical: 10, shopping: 30, dining: 80, leisure: 60, education: 5, finance: 50,
            workspace: 120, housing: 10, religion: 0, nature: 2, accommodation: 30
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
    'Mitsukoshimae': {
        category_counts: {
            medical: 15, shopping: 250, dining: 150, leisure: 50, education: 5, finance: 80,
            workspace: 100, housing: 5, religion: 15, nature: 5, accommodation: 20
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
    'Kanda': {
        category_counts: {
            medical: 20, shopping: 50, dining: 300, leisure: 40, education: 30, finance: 40,
            workspace: 80, housing: 20, religion: 10, nature: 5, accommodation: 50
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
    'Inaricho': {
        category_counts: {
            medical: 10, shopping: 40, dining: 50, leisure: 20, education: 5, finance: 5,
            workspace: 10, housing: 80, religion: 50, nature: 5, accommodation: 15
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
    'Minowa': {
        category_counts: {
            medical: 10, shopping: 60, dining: 40, leisure: 20, education: 2, finance: 5,
            workspace: 5, housing: 80, religion: 10, nature: 5, accommodation: 10
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
    'Shin-Okachimachi': {
        category_counts: {
            medical: 5, shopping: 100, dining: 50, leisure: 10, education: 2, finance: 10,
            workspace: 40, housing: 80, religion: 10, nature: 5, accommodation: 5
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
    'Yushima': {
        category_counts: {
            medical: 15, shopping: 30, dining: 60, leisure: 40, education: 80, finance: 10,
            workspace: 20, housing: 80, religion: 60, nature: 20, accommodation: 30
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
    // Simple mock key matching
    const mockKey = Object.keys(mockProfiles).find(key => nodeId.includes(key));

    if (mockKey) {
        enrichedProfile = {
            node_id: nodeId,
            ...mockProfiles[mockKey],
            ...(finalProfile || {})
        };

        // --- REAL-TIME STATUS INJECTION ---
        const operator = getOperatorFromId(nodeId);
        if (operator) {
            try {
                // Determine if we need to fetch status
                // Only fetch for Hubs or specific nodes to save API calls
                // Client-side, we might want to do this in React Query, but here is "API lib" level
                // For simplicity in this `fetchNodeConfig` (which seems to be called once on click),
                // we will TRY to fetch real status.

                const statusRes = await fetch(`/api/odpt/train-status?operator=${operator}`);
                if (statusRes.ok) {
                    const statusData = await statusRes.json();
                    if (Array.isArray(statusData) && statusData.length > 0) {
                        // Map ODPT format to our internal format
                        // ODPT returns array of info objects.
                        const realStatus = statusData.map((info: any) => ({
                            line: info['odpt:railway'].replace('odpt.Railway:', '').split('.').pop(), // Simple name extraction
                            status: (info['odpt:trainInformationText']?.en || '').toLowerCase().includes('delay') ? 'delay' : 'normal', // Naive check
                            message: info['odpt:trainInformationText']?.zh || info['odpt:trainInformationText']?.ja // Prefer ZH or JA
                        }));

                        // Inject into profile (Clone object first to avoid mutating mock const)
                        enrichedProfile = {
                            ...enrichedProfile,
                            l2_status: {
                                ...enrichedProfile.l2_status,
                                line_status: realStatus
                            }
                        };
                    }
                }
            } catch (e) {
                console.warn('Real-time fetch failed, using default', e);
            }
        }
        // ----------------------------------

        return {
            node: { ...finalNode, location: parseLocation(finalNode.location) },
            profile: enrichedProfile,
            error: null
        };
    }

    return {
        node: { ...finalNode, location: parseLocation(finalNode?.location) },
        profile: finalProfile,
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

    return (data as any[]).map(n => ({
        ...n,
        location: parseLocation(n.location)
    })) as NodeDatum[];
}
