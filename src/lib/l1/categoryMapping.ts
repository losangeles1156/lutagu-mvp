/**
 * OSM 類別對應表
 * 將 OSM 標籤映射到內部 L1 類別
 */

export interface CategoryMapping {
    /** 內部類別 ID */
    id: string;
    /** 顯示名稱 (多語言) */
    name: Record<string, string>;
    /** 對應的 OSM 標籤 key */
    osmKeys: string[];
    /** 對應的 OSM 標籤值 (可選) */
    osmValues?: string[];
    /** 圖標 */
    icon?: string;
    /** 排序權重 */
    weight: number;
}

export const CATEGORY_MAPPINGS: CategoryMapping[] = [
    {
        id: 'restaurant',
        name: { ja: 'レストラン', en: 'Restaurant', 'zh-TW': '餐廳', 'zh-CN': '餐厅' },
        osmKeys: ['amenity', 'shop'],
        osmValues: ['restaurant', 'fast_food', 'food_court'],
        icon: '🍽️',
        weight: 1
    },
    {
        id: 'cafe',
        name: { ja: 'カフェ', en: 'Cafe', 'zh-TW': '咖啡廳', 'zh-CN': '咖啡厅' },
        osmKeys: ['amenity'],
        osmValues: ['cafe', 'bar', 'ice_cream'],
        icon: '☕',
        weight: 2
    },
    {
        id: 'convenience',
        name: { ja: 'コンビニ', en: 'Convenience Store', 'zh-TW': '便利店', 'zh-CN': '便利店' },
        osmKeys: ['shop'],
        osmValues: ['convenience', 'supermarket'],
        icon: '🏪',
        weight: 3
    },
    {
        id: 'atm',
        name: { ja: 'ATM', en: 'ATM', 'zh-TW': 'ATM', 'zh-CN': 'ATM' },
        osmKeys: ['amenity'],
        osmValues: ['atm', 'bank'],
        icon: '🏧',
        weight: 4
    },
    {
        id: 'pharmacy',
        name: { ja: '薬局', en: 'Pharmacy', 'zh-TW': '藥局', 'zh-CN': '药房' },
        osmKeys: ['amenity'],
        osmValues: ['pharmacy'],
        icon: '💊',
        weight: 5
    },
    {
        id: 'station_facility',
        name: { ja: '駅施設', en: 'Station Facility', 'zh-TW': '車站設施', 'zh-CN': '车站设施' },
        osmKeys: ['railway', 'station'],
        osmValues: ['station', 'halt', 'tram_stop'],
        icon: '🚉',
        weight: 6
    },
    {
        id: 'entrance',
        name: { ja: '改札口', en: 'Entrance/Exit', 'zh-TW': '出入口', 'zh-CN': '出入口' },
        osmKeys: ['railway'],
        osmValues: ['entrance', 'subway_entrance'],
        icon: '🚪',
        weight: 7
    },
    {
        id: 'toilet',
        name: { ja: 'トイレ', en: 'Restroom', 'zh-TW': '廁所', 'zh-CN': '厕所' },
        osmKeys: ['amenity'],
        osmValues: ['toilets'],
        icon: '🚻',
        weight: 8
    },
    {
        id: 'parking',
        name: { ja: '駐車場', en: 'Parking', 'zh-TW': '停車場', 'zh-CN': '停车场' },
        osmKeys: ['amenity', 'highway'],
        osmValues: ['parking', 'parking_space', 'parking_entrance'],
        icon: '🅿️',
        weight: 9
    },
    {
        id: 'ticket',
        name: { ja: '券売機', en: 'Ticket Machine', 'zh-TW': '售票機', 'zh-CN': '售票机' },
        osmKeys: ['amenity'],
        osmValues: ['ticket_office', 'vending_machine'],
        icon: '🎫',
        weight: 10
    },
    {
        id: 'post_office',
        name: { ja: '郵便局', en: 'Post Office', 'zh-TW': '郵局', 'zh-CN': '邮局' },
        osmKeys: ['amenity'],
        osmValues: ['post_office', 'post_box'],
        icon: '📮',
        weight: 11
    },
    {
        id: 'hotel',
        name: { ja: 'ホテル', en: 'Hotel', 'zh-TW': '飯店', 'zh-CN': '饭店' },
        osmKeys: ['tourism'],
        osmValues: ['hotel', 'motel', 'hostel', 'guesthouse'],
        icon: '🏨',
        weight: 12
    },
    {
        id: 'attraction',
        name: { ja: '観光地', en: 'Attraction', 'zh-TW': '景點', 'zh-CN': '景点' },
        osmKeys: ['tourism', 'leisure', 'historic', 'amenity'],
        osmValues: ['attraction', 'museum', 'artwork', 'monument', 'viewpoint', 'theme_park'],
        icon: '🎡',
        weight: 13
    },
    {
        id: 'landmark',
        name: { ja: 'ランドマーク', en: 'Landmark', 'zh-TW': '地標', 'zh-CN': '地标' },
        osmKeys: ['historic', 'building'],
        osmValues: ['landmark', 'yes'],
        icon: '🗽',
        weight: 14
    },
    {
        id: 'school',
        name: { ja: '学校', en: 'School', 'zh-TW': '學校', 'zh-CN': '学校' },
        osmKeys: ['amenity'],
        osmValues: ['school', 'university', 'college', 'kindergarten'],
        icon: '🏫',
        weight: 15
    },
    {
        id: 'hospital',
        name: { ja: '病院', en: 'Hospital', 'zh-TW': '醫院', 'zh-CN': '医院' },
        osmKeys: ['amenity', 'healthcare'],
        osmValues: ['hospital', 'clinic', 'doctors', 'dentist'],
        icon: '🏥',
        weight: 16
    },
    {
        id: 'other',
        name: { ja: 'その他', en: 'Other', 'zh-TW': '其他', 'zh-CN': '其他' },
        osmKeys: [],
        osmValues: [],
        icon: '📍',
        weight: 99
    }
];

// ============== 快速查找表 ==============

const CATEGORY_BY_ID = new Map(CATEGORY_MAPPINGS.map(c => [c.id, c]));
const OSM_KEY_VALUE_MAP = new Map<string, Set<string>>();

for (const mapping of CATEGORY_MAPPINGS) {
    for (const key of mapping.osmKeys) {
        const values = mapping.osmValues || [];
        if (values.length > 0) {
            for (const value of values) {
                const mapKey = `${key}:${value}`;
                OSM_KEY_VALUE_MAP.set(mapKey, new Set(values));
            }
        }
    }
}

/**
 * 根據 OSM 標籤獲取對應的類別 ID
 */
export function getCategoryFromOSMTags(tags: Record<string, string>): string {
    // 優先檢查常見組合
    const priorityCombinations = [
        ['amenity', 'restaurant'],
        ['amenity', 'cafe'],
        ['amenity', 'fast_food'],
        ['shop', 'convenience'],
        ['tourism', 'hotel'],
        ['tourism', 'attraction'],
        ['railway', 'station'],
        ['railway', 'entrance'],
        ['amenity', 'toilets'],
        ['amenity', 'bank'],
        ['amenity', 'atm'],
        ['amenity', 'pharmacy'],
        ['amenity', 'hospital'],
        ['amenity', 'post_office'],
        ['shop', 'supermarket']
    ];

    for (const [key, value] of priorityCombinations) {
        if (tags[key] === value) {
            for (const mapping of CATEGORY_MAPPINGS) {
                if (mapping.osmKeys.includes(key) && 
                    mapping.osmValues?.includes(value)) {
                    return mapping.id;
                }
            }
        }
    }

    // 通用匹配
    for (const mapping of CATEGORY_MAPPINGS) {
        for (const key of mapping.osmKeys) {
            if (tags[key]) {
                const values = mapping.osmValues || [];
                if (values.length === 0 || values.includes(tags[key])) {
                    return mapping.id;
                }
            }
        }
    }

    return 'other';
}

/**
 * 根據類別 ID 獲取類別資訊
 */
export function getCategoryById(id: string): CategoryMapping | undefined {
    return CATEGORY_BY_ID.get(id);
}

/**
 * 獲取所有類別列表
 */
export function getAllCategories(): CategoryMapping[] {
    return CATEGORY_MAPPINGS;
}

/**
 * 翻譯類別名稱
 */
export function getCategoryName(categoryId: string, locale: string = 'zh-TW'): string {
    const category = CATEGORY_BY_ID.get(categoryId);
    if (!category) return categoryId;
    
    return category.name[locale] || category.name['en'] || category.name['ja'] || categoryId;
}

/**
 * 類別權重比較函數
 */
export function compareCategoriesByWeight(a: string, b: string): number {
    const catA = CATEGORY_BY_ID.get(a);
    const catB = CATEGORY_BY_ID.get(b);
    
    const weightA = catA?.weight ?? 999;
    const weightB = catB?.weight ?? 999;
    
    return weightA - weightB;
}
