/**
 * 快取鍵生成器
 * 為不同類型的資料產生一致且有意義的快取鍵
 */

export interface KeyBuilderOptions {
    /** 鍵前綴 */
    prefix: string;
    /** 是否包含雜湊 (處理長參數) */
    hashLongParams?: boolean;
    /** 雜湊閾值 (超過此長度的參數會被雜湊) */
    hashThreshold?: number;
}

/**
 * 簡單的 DJB2 雜湊函數
 */
function hashString(str: string): string {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i);
    }
    return (hash >>> 0).toString(36);
}

/**
 * 標準化參數值
 */
function normalizeValue(value: any): string {
    if (value === null || value === undefined) {
        return 'null';
    }
    if (typeof value === 'boolean') {
        return value.toString();
    }
    if (typeof value === 'number') {
        return value.toString();
    }
    if (typeof value === 'string') {
        return value;
    }
    if (Array.isArray(value)) {
        return value.map(normalizeValue).join(',');
    }
    if (typeof value === 'object') {
        return JSON.stringify(value);
    }
    return String(value);
}

/**
 * 快取鍵生成器類別
 */
export class CacheKeyBuilder {
    private options: KeyBuilderOptions;

    constructor(options: KeyBuilderOptions) {
        this.options = {
            hashLongParams: true,
            hashThreshold: 200,
            ...options
        };
    }

    /**
     * 生成快取鍵
     */
    build(params: Record<string, any>): string {
        const parts: string[] = [];

        // 排序參數鍵以確保一致性
        const sortedKeys = Object.keys(params).sort();

        for (const key of sortedKeys) {
            const value = params[key];

            // 跳過 undefined 值
            if (value === undefined) continue;

            const normalizedValue = normalizeValue(value);

            // 檢查是否需要雜湊
            if (this.options.hashLongParams && normalizedValue.length > (this.options.hashThreshold || 200)) {
                parts.push(`${key}:${hashString(normalizedValue)}`);
            } else {
                parts.push(`${key}:${normalizedValue}`);
            }
        }

        const keyBody = parts.join('|');
        return `${this.options.prefix}:${hashString(keyBody)}`;
    }

    /**
     * 生成簡單鍵 (無參數雜湊)
     */
    buildSimple(key: string): string {
        return `${this.options.prefix}:${key}`;
    }

    /**
     * 生成站台相關的快取鍵
     */
    static forStation(stationId: string, suffix?: string): string {
        const parts = ['station', stationId];
        if (suffix) parts.push(suffix);
        return parts.join(':');
    }

    /**
     * 生成 L1 景點快取鍵
     */
    static forL1Places(stationIds: string[], options?: {
        category?: string;
        includeCustom?: boolean;
        locale?: string;
    }): string {
        const parts: string[] = ['l1', 'places'];

        // 站台 ID 排序後雜湊
        const sortedStations = [...stationIds].sort().join(',');
        parts.push(hashString(sortedStations));

        if (options?.category) {
            parts.push(`cat:${options.category}`);
        }
        if (options?.includeCustom !== undefined) {
            parts.push(`custom:${options.includeCustom}`);
        }
        if (options?.locale) {
            parts.push(`locale:${options.locale}`);
        }

        return parts.join(':');
    }

    /**
     * 生成 API 響應快取鍵
     */
    static forApiResponse(endpoint: string, params: Record<string, any>): string {
        return CacheKeyBuilder.generate({
            prefix: `api:${endpoint}`,
            ...params
        });
    }

    /**
     * 靜態工廠方法 - 快速生成鍵
     */
    static generate(params: { prefix: string } & Record<string, any>): string {
        const { prefix, ...rest } = params;
        const builder = new CacheKeyBuilder({ prefix });
        return builder.build(rest);
    }
}

/**
 * 預定義的快取鍵前綴
 */
export const CACHE_KEYS = {
    /** L1 景點列表 */
    L1_PLACES: 'l1_places',
    /** L1 景點詳細資訊 */
    L1_PLACE_DETAIL: 'l1_place_detail',
    /** 站台節點 */
    STATION_NODE: 'station_node',
    /** 站台附近景點 */
    STATION_NEARBY: 'station_nearby',
    /** 地圖圖塊 */
    MAP_TILE: 'map_tile',
    /** API 響應 */
    API_RESPONSE: 'api_response',
    /** 使用者偏好 */
    USER_PREFERENCES: 'user_prefs',
    /** 翻譯文字 */
    TRANSLATION: 'i18n',
    /** 天氣資料 */
    WEATHER: 'weather',
    /** AI 回應快取 */
    AI_RESPONSE: 'ai_response',
    /** 票價快取 */
    FARE: 'fare',
    /** 路線快取 */
    ROUTE: 'route',
    /** 時刻表快取 */
    TIMETABLE: 'timetable'
} as const;

/**
 * 站台 ID 排序雜湊工具
 */
export function hashStationIds(stationIds: string[]): string {
    const sorted = [...stationIds].sort();
    return hashString(sorted.join(','));
}

/**
 * 快速 DJB2 雜湊 (導出)
 */
export { hashString };
