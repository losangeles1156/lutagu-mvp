/**
 * POI (Point of Interest) 到車站的映射表
 * 支援地標、景點、機場等非車站地點的智能路線建議
 */

export type POICategory = 'landmark' | 'airport' | 'temple' | 'museum' | 'park' | 'shopping' | 'government' | 'stadium';

export interface POIMapping {
    /** POI 名稱關鍵字（支援多語言） */
    keywords: string[];
    /** 最近的車站 ID 列表（按推薦順序排列） */
    nearestStations: Array<{
        stationId: string;
        /** 步行時間（分鐘） */
        walkMinutes: number;
        /** 推薦條件：什麼情況下推薦這個出口 */
        recommendFor?: ('comfort' | 'rushing' | 'luggage' | 'wheelchair' | 'stroller' | 'default')[];
        /** 附加說明 */
        note?: {
            'zh-TW'?: string;
            ja?: string;
            en?: string;
        };
    }>;
    /** POI 類別 */
    category: POICategory;
    /** 顯示名稱 */
    displayName: {
        'zh-TW': string;
        ja: string;
        en: string;
    };
}

/**
 * POI 映射資料庫
 */
export const POI_DATABASE: POIMapping[] = [
    // === 政府/辦公大樓 ===
    {
        keywords: ['東京都廳', '東京都庁', '都廳展望台', '都庁展望台', 'tokyo metropolitan government', 'tochomae', 'tmg', '都廳'],
        nearestStations: [
            {
                stationId: 'odpt.Station:TokyoMetro.Marunouchi.NishiShinjuku',
                walkMinutes: 5,
                recommendFor: ['comfort', 'luggage', 'stroller', 'wheelchair'],
                note: {
                    'zh-TW': '西新宿站出口單純不易迷路，適合第一次來東京的旅客',
                    ja: '西新宿駅は出口がシンプルで迷いにくいです',
                    en: 'Nishi-Shinjuku Station has simple exits, easy to navigate'
                }
            },
            {
                stationId: 'odpt.Station:Toei.Oedo.Tochomae',
                walkMinutes: 1,
                recommendFor: ['rushing', 'default'],
                note: {
                    'zh-TW': '都廳前站是最近的站，但大江戶線月台很深',
                    ja: '都庁前駅が最寄りですが、大江戸線ホームは深いです',
                    en: 'Tochomae is the nearest but Oedo line platform is very deep'
                }
            },
            {
                stationId: 'odpt.Station:JR-East.Yamanote.Shinjuku',
                walkMinutes: 12,
                recommendFor: [],
                note: {
                    'zh-TW': '新宿站很大容易迷路，不推薦觀光客使用',
                    ja: '新宿駅は非常に大きく迷いやすいです',
                    en: 'Shinjuku Station is huge and easy to get lost'
                }
            }
        ],
        category: 'government',
        displayName: {
            'zh-TW': '東京都廳展望台',
            ja: '東京都庁展望台',
            en: 'Tokyo Metropolitan Government Building Observatory'
        }
    },

    // === 機場 ===
    {
        keywords: ['成田機場', '成田空港', 'narita airport', 'narita', 'nrt', '成田'],
        nearestStations: [
            {
                stationId: 'odpt.Station:JR-East.NaritaAirportBranch.NaritaAirportTerminal1',
                walkMinutes: 0,
                recommendFor: ['default', 'rushing'],
                note: {
                    'zh-TW': '第一航廈',
                    ja: '第1ターミナル',
                    en: 'Terminal 1'
                }
            },
            {
                stationId: 'odpt.Station:JR-East.NaritaAirportBranch.NaritaAirportTerminal2and3',
                walkMinutes: 0,
                recommendFor: ['default'],
                note: {
                    'zh-TW': '第二、三航廈（LCC 多在此）',
                    ja: '第2・3ターミナル（LCCはこちら）',
                    en: 'Terminal 2 & 3 (Most LCCs)'
                }
            }
        ],
        category: 'airport',
        displayName: {
            'zh-TW': '成田機場',
            ja: '成田空港',
            en: 'Narita Airport'
        }
    },
    {
        keywords: ['羽田機場', '羽田空港', 'haneda airport', 'haneda', 'hnd'],
        nearestStations: [
            {
                stationId: 'odpt.Station:Keikyu.Airport.HanedaAirportTerminal3',
                walkMinutes: 0,
                recommendFor: ['default'],
                note: {
                    'zh-TW': '國際線航廈',
                    ja: '国際線ターミナル',
                    en: 'International Terminal'
                }
            }
        ],
        category: 'airport',
        displayName: {
            'zh-TW': '羽田機場',
            ja: '羽田空港',
            en: 'Haneda Airport'
        }
    },

    // === 寺廟/神社 ===
    {
        keywords: ['淺草寺', '浅草寺', 'sensoji', 'asakusa temple', '雷門'],
        nearestStations: [
            {
                stationId: 'odpt.Station:TokyoMetro.Ginza.Asakusa',
                walkMinutes: 3,
                recommendFor: ['comfort', 'luggage', 'default'],
                note: {
                    'zh-TW': '1號出口最靠近雷門',
                    ja: '1番出口が雷門に最も近いです',
                    en: 'Exit 1 is closest to Kaminarimon Gate'
                }
            },
            {
                stationId: 'odpt.Station:Toei.Asakusa.Asakusa',
                walkMinutes: 5,
                recommendFor: ['rushing'],
                note: {
                    'zh-TW': '都營淺草線',
                    ja: '都営浅草線',
                    en: 'Toei Asakusa Line'
                }
            }
        ],
        category: 'temple',
        displayName: {
            'zh-TW': '淺草寺（雷門）',
            ja: '浅草寺（雷門）',
            en: 'Sensoji Temple (Kaminarimon)'
        }
    },
    {
        keywords: ['明治神宮', '明治神宫', 'meiji shrine', 'meiji jingu'],
        nearestStations: [
            {
                stationId: 'odpt.Station:JR-East.Yamanote.Harajuku',
                walkMinutes: 5,
                recommendFor: ['default', 'comfort'],
                note: {
                    'zh-TW': '表參道方向',
                    ja: '表参道方面',
                    en: 'Omotesando side'
                }
            }
        ],
        category: 'temple',
        displayName: {
            'zh-TW': '明治神宮',
            ja: '明治神宮',
            en: 'Meiji Shrine'
        }
    },

    // === 博物館/美術館 ===
    {
        keywords: ['上野動物園', '上野动物园', 'ueno zoo'],
        nearestStations: [
            {
                stationId: 'odpt.Station:JR-East.Yamanote.Ueno',
                walkMinutes: 5,
                recommendFor: ['default', 'stroller'],
                note: {
                    'zh-TW': '公園口出口最近',
                    ja: '公園口が最寄りです',
                    en: 'Park Exit is closest'
                }
            },
            {
                stationId: 'odpt.Station:TokyoMetro.Ginza.Ueno',
                walkMinutes: 8,
                recommendFor: ['comfort'],
                note: {
                    'zh-TW': '銀座線上野站',
                    ja: '銀座線上野駅',
                    en: 'Ginza Line Ueno Station'
                }
            }
        ],
        category: 'museum',
        displayName: {
            'zh-TW': '上野動物園',
            ja: '上野動物園',
            en: 'Ueno Zoo'
        }
    },

    // === 購物 ===
    {
        keywords: ['東京迪士尼', '東京ディズニー', 'tokyo disney', 'disneyland', 'disneysea', '迪士尼樂園', '舞浜'],
        nearestStations: [
            {
                stationId: 'odpt.Station:JR-East.Keiyo.Maihama',
                walkMinutes: 2,
                recommendFor: ['default'],
                note: {
                    'zh-TW': '舞濱站是唯一選項，從東京站京葉線月台步行約15分鐘',
                    ja: '舞浜駅が最寄り。東京駅の京葉線ホームまで徒歩約15分',
                    en: 'Maihama is the only option. Note: Keiyo Line platform at Tokyo Station is 15min walk'
                }
            }
        ],
        category: 'shopping',
        displayName: {
            'zh-TW': '東京迪士尼度假區',
            ja: '東京ディズニーリゾート',
            en: 'Tokyo Disney Resort'
        }
    },
    {
        keywords: ['秋葉原', 'akihabara', 'akiba', '電器街'],
        nearestStations: [
            {
                stationId: 'odpt.Station:JR-East.Yamanote.Akihabara',
                walkMinutes: 0,
                recommendFor: ['default', 'rushing'],
                note: {
                    'zh-TW': '電器街口最方便',
                    ja: '電気街口が便利です',
                    en: 'Electric Town Exit is most convenient'
                }
            },
            {
                stationId: 'odpt.Station:TokyoMetro.Hibiya.Akihabara',
                walkMinutes: 3,
                recommendFor: ['comfort'],
                note: {
                    'zh-TW': '日比谷線',
                    ja: '日比谷線',
                    en: 'Hibiya Line'
                }
            }
        ],
        category: 'shopping',
        displayName: {
            'zh-TW': '秋葉原電器街',
            ja: '秋葉原電気街',
            en: 'Akihabara Electric Town'
        }
    },

    // === 公園 ===
    {
        keywords: ['新宿御苑', 'shinjuku gyoen', '御苑'],
        nearestStations: [
            {
                stationId: 'odpt.Station:TokyoMetro.Marunouchi.ShinjukuGyoemmae',
                walkMinutes: 5,
                recommendFor: ['default', 'comfort'],
                note: {
                    'zh-TW': '新宿門入口',
                    ja: '新宿門',
                    en: 'Shinjuku Gate entrance'
                }
            }
        ],
        category: 'park',
        displayName: {
            'zh-TW': '新宿御苑',
            ja: '新宿御苑',
            en: 'Shinjuku Gyoen'
        }
    },

    // === 地標/觀景台 ===
    {
        keywords: ['東京塔', '東京タワー', 'tokyo tower'],
        nearestStations: [
            {
                stationId: 'odpt.Station:Toei.Oedo.Akabanebashi',
                walkMinutes: 5,
                recommendFor: ['default'],
                note: {
                    'zh-TW': '赤羽橋站',
                    ja: '赤羽橋駅',
                    en: 'Akabanebashi Station'
                }
            },
            {
                stationId: 'odpt.Station:Toei.Mita.Onarimon',
                walkMinutes: 6,
                recommendFor: ['comfort'],
                note: {
                    'zh-TW': '御成門站',
                    ja: '御成門駅',
                    en: 'Onarimon Station'
                }
            }
        ],
        category: 'landmark',
        displayName: {
            'zh-TW': '東京鐵塔',
            ja: '東京タワー',
            en: 'Tokyo Tower'
        }
    },
    {
        keywords: ['晴空塔', 'スカイツリー', 'skytree', 'tokyo skytree', '天空樹'],
        nearestStations: [
            {
                stationId: 'odpt.Station:Toei.Asakusa.Oshiage',
                walkMinutes: 1,
                recommendFor: ['default', 'rushing'],
                note: {
                    'zh-TW': '押上站直通晴空塔商場',
                    ja: '押上駅は東京スカイツリータウンに直結',
                    en: 'Oshiage Station connects directly to Skytree Town'
                }
            }
        ],
        category: 'landmark',
        displayName: {
            'zh-TW': '東京晴空塔',
            ja: '東京スカイツリー',
            en: 'Tokyo Skytree'
        }
    },

    // === 體育場 ===
    {
        keywords: ['東京巨蛋', '東京ドーム', 'tokyo dome'],
        nearestStations: [
            {
                stationId: 'odpt.Station:TokyoMetro.Marunouchi.Korakuen',
                walkMinutes: 5,
                recommendFor: ['default', 'comfort'],
                note: {
                    'zh-TW': '後樂園站',
                    ja: '後楽園駅',
                    en: 'Korakuen Station'
                }
            },
            {
                stationId: 'odpt.Station:JR-East.ChuoSobuLocal.Suidobashi',
                walkMinutes: 5,
                recommendFor: ['rushing'],
                note: {
                    'zh-TW': '水道橋站',
                    ja: '水道橋駅',
                    en: 'Suidobashi Station'
                }
            }
        ],
        category: 'stadium',
        displayName: {
            'zh-TW': '東京巨蛋',
            ja: '東京ドーム',
            en: 'Tokyo Dome'
        }
    }
];

/**
 * 車站別名映射 - 將常見別名或簡稱映射到標準車站ID
 */
export const STATION_ALIAS_MAP: Record<string, string[]> = {
    // 機場
    '成田機場': ['odpt.Station:JR-East.NaritaAirportBranch.NaritaAirportTerminal1', 'odpt.Station:JR-East.NaritaAirportBranch.NaritaAirportTerminal2and3'],
    '成田空港': ['odpt.Station:JR-East.NaritaAirportBranch.NaritaAirportTerminal1', 'odpt.Station:JR-East.NaritaAirportBranch.NaritaAirportTerminal2and3'],
    'narita airport': ['odpt.Station:JR-East.NaritaAirportBranch.NaritaAirportTerminal1', 'odpt.Station:JR-East.NaritaAirportBranch.NaritaAirportTerminal2and3'],
    'narita': ['odpt.Station:JR-East.NaritaAirportBranch.NaritaAirportTerminal1'],
    'nrt': ['odpt.Station:JR-East.NaritaAirportBranch.NaritaAirportTerminal1'],

    // 都廳
    '都廳前': ['odpt.Station:Toei.Oedo.Tochomae'],
    '都庁前': ['odpt.Station:Toei.Oedo.Tochomae'],
    'tochomae': ['odpt.Station:Toei.Oedo.Tochomae'],

    // 羽田
    '羽田機場': ['odpt.Station:Keikyu.Airport.HanedaAirportTerminal3'],
    '羽田空港': ['odpt.Station:Keikyu.Airport.HanedaAirportTerminal3'],
    'haneda': ['odpt.Station:Keikyu.Airport.HanedaAirportTerminal3'],
    'hnd': ['odpt.Station:Keikyu.Airport.HanedaAirportTerminal3'],

    // 迪士尼
    '舞濱': ['odpt.Station:JR-East.Keiyo.Maihama'],
    '舞浜': ['odpt.Station:JR-East.Keiyo.Maihama'],
    'maihama': ['odpt.Station:JR-East.Keiyo.Maihama'],
    '迪士尼': ['odpt.Station:JR-East.Keiyo.Maihama'],
    'disney': ['odpt.Station:JR-East.Keiyo.Maihama'],
};

/**
 * 根據 POI 名稱查找最佳車站推薦
 * 使用較嚴格的匹配邏輯避免誤匹配（如「東京」不應匹配「東京都廳」）
 */
export function findPOIStations(input: string, userNeeds?: ('comfort' | 'rushing' | 'luggage' | 'wheelchair' | 'stroller')[]): {
    poi: POIMapping | null;
    recommendedStation: POIMapping['nearestStations'][0] | null;
    allStations: POIMapping['nearestStations'];
} {
    const normalizedInput = input.toLowerCase().trim();

    // 避免過短的輸入觸發 POI 匹配（如「東京」、「新宿」這類車站名）
    // 這些短輸入應該優先使用車站名稱解析
    const MIN_POI_INPUT_LENGTH = 4;

    // 查找匹配的 POI（使用嚴格匹配）
    const matchedPoi = POI_DATABASE.find(poi =>
        poi.keywords.some(keyword => {
            const normalizedKeyword = keyword.toLowerCase();

            // 1. 精確匹配
            if (normalizedInput === normalizedKeyword) return true;

            // 2. 輸入包含完整關鍵字（如輸入「東京都廳展望台夜景」包含「東京都廳」）
            if (normalizedInput.includes(normalizedKeyword)) return true;

            // 3. 關鍵字包含輸入時，需要輸入足夠長且有意義
            // 避免「東京」匹配「東京都廳」，但允許「都廳展望台」匹配「東京都廳展望台」
            if (normalizedKeyword.includes(normalizedInput)) {
                // 輸入必須足夠長（至少4個字符）
                if (normalizedInput.length < MIN_POI_INPUT_LENGTH) return false;

                // 輸入必須佔關鍵字的相當比例（至少40%）
                const ratio = normalizedInput.length / normalizedKeyword.length;
                if (ratio < 0.4) return false;

                return true;
            }

            return false;
        })
    );

    if (!matchedPoi) {
        return { poi: null, recommendedStation: null, allStations: [] };
    }

    // 根據用戶需求選擇最佳車站
    const needs = userNeeds || ['default'];
    let bestStation = matchedPoi.nearestStations[0]; // 預設第一個

    for (const station of matchedPoi.nearestStations) {
        const recommendFor = station.recommendFor || ['default'];
        if (needs.some(need => recommendFor.includes(need))) {
            bestStation = station;
            break;
        }
    }

    return {
        poi: matchedPoi,
        recommendedStation: bestStation,
        allStations: matchedPoi.nearestStations
    };
}

/**
 * 根據車站別名查找標準車站 ID
 * 使用嚴格匹配避免誤匹配
 */
export function resolveStationAlias(input: string): string[] | null {
    const normalizedInput = input.toLowerCase().trim();

    // 避免過短的輸入誤觸發別名匹配
    const MIN_ALIAS_INPUT_LENGTH = 3;

    // 先檢查完整匹配（大小寫不敏感）
    for (const [alias, stationIds] of Object.entries(STATION_ALIAS_MAP)) {
        if (normalizedInput === alias.toLowerCase()) {
            return stationIds;
        }
    }

    // 如果輸入包含完整別名（如「成田機場第一航廈」包含「成田機場」）
    for (const [alias, stationIds] of Object.entries(STATION_ALIAS_MAP)) {
        if (normalizedInput.includes(alias.toLowerCase())) {
            return stationIds;
        }
    }

    // 如果別名包含輸入，需要輸入足夠長且有意義
    if (normalizedInput.length >= MIN_ALIAS_INPUT_LENGTH) {
        for (const [alias, stationIds] of Object.entries(STATION_ALIAS_MAP)) {
            const normalizedAlias = alias.toLowerCase();
            if (normalizedAlias.includes(normalizedInput)) {
                // 輸入必須佔別名的相當比例（至少50%）
                const ratio = normalizedInput.length / normalizedAlias.length;
                if (ratio >= 0.5) {
                    return stationIds;
                }
            }
        }
    }

    return null;
}
