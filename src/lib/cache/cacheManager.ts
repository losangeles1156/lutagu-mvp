/**
 * 快取管理工具
 * 提供高層級的快取操作介面和監控功能
 */

import { CacheService, getCache, clearCache, clearAllCaches, CacheConfig } from './cacheService';
import { CacheKeyBuilder, CACHE_KEYS } from './cacheKeyBuilder';

// ============== 預設快取配置 ==============

export const CACHE_CONFIGS = {
    /** L1 景點快取配置 */
    l1Places: {
        maxSize: 200,
        ttlMs: 3 * 60 * 1000, // 3 分鐘 (景點更新較頻繁)
        cleanupIntervalMs: 30 * 1000,
        evictionRatio: 0.1
    } as CacheConfig,

    /** API 響應快取配置 */
    apiResponse: {
        maxSize: 1000,
        ttlMs: 5 * 60 * 1000, // 5 分鐘
        cleanupIntervalMs: 60 * 1000,
        evictionRatio: 0.1
    } as CacheConfig,

    /** 站台資料快取配置 */
    stationData: {
        maxSize: 500,
        ttlMs: 10 * 60 * 1000, // 10 分鐘
        cleanupIntervalMs: 60 * 1000,
        evictionRatio: 0.1
    } as CacheConfig,

    /** 地圖圖塊快取配置 */
    mapTiles: {
        maxSize: 2000,
        ttlMs: 60 * 60 * 1000, // 1 小時
        cleanupIntervalMs: 5 * 60 * 1000,
        evictionRatio: 0.2
    } as CacheConfig
} as const;

// ============== 快取實例工廠 ==============

let l1PlacesCache: CacheService | null = null;
let apiResponseCache: CacheService | null = null;
let stationDataCache: CacheService | null = null;

/**
 * 獲取 L1 景點快取實例
 */
export function getL1PlacesCache(): CacheService {
    if (!l1PlacesCache) {
        l1PlacesCache = getCache('l1_places', CACHE_CONFIGS.l1Places);
    }
    return l1PlacesCache;
}

/**
 * 獲取 API 響應快取實例
 */
export function getApiResponseCache(): CacheService {
    if (!apiResponseCache) {
        apiResponseCache = getCache('api_response', CACHE_CONFIGS.apiResponse);
    }
    return apiResponseCache;
}

/**
 * 獲取站台資料快取實例
 */
export function getStationDataCache(): CacheService {
    if (!stationDataCache) {
        stationDataCache = getCache('station_data', CACHE_CONFIGS.stationData);
    }
    return stationDataCache;
}

// ============== 封裝的快取操作 ==============

/**
 * 嘗試從快取獲取資料，失敗則回呼並快取結果
 */
export async function cached<T>(
    cache: CacheService,
    key: string,
    fetcher: () => Promise<T>,
    ttlMs?: number
): Promise<T> {
    const cachedValue = cache.get(key);
    if (cachedValue !== null) {
        console.debug(`[Cache] HIT: ${key}`);
        return cachedValue as T;
    }

    console.debug(`[Cache] MISS: ${key}`);
    const value = await fetcher();
    cache.set(key, value, ttlMs);
    return value;
}

/**
 * 封裝 L1 景點快取操作
 */
export async function cachedL1Places<T>(
    stationIds: string[],
    options: {
        category?: string;
        includeCustom?: boolean;
        locale?: string;
    },
    fetcher: () => Promise<T>
): Promise<T> {
    const cache = getL1PlacesCache();
    const key = CacheKeyBuilder.forL1Places(stationIds, options);
    return cached(cache, key, fetcher);
}

/**
 * 封裝 API 響應快取操作
 */
export async function cachedApiResponse<T>(
    endpoint: string,
    params: Record<string, any>,
    fetcher: () => Promise<T>,
    ttlMs?: number
): Promise<T> {
    const cache = getApiResponseCache();
    const key = CacheKeyBuilder.forApiResponse(endpoint, params);
    return cached(cache, key, fetcher, ttlMs);
}

/**
 * 使特定站台相關的快取失效
 */
export function invalidateStationCache(stationIds: string[]): void {
    const l1Cache = getL1PlacesCache();
    const stationCache = getStationDataCache();

    // 清除 L1 景點快取
    for (const stationId of stationIds) {
        // 使用前綴匹配清除相關快取
        const patterns = [
            `${CACHE_KEYS.L1_PLACES}:*${stationId}*`,
            `${CACHE_KEYS.STATION_NEARBY}:${stationId}*`
        ];

        // 清除站台資料快取
        stationCache.delete(`${CACHE_KEYS.STATION_NODE}:${stationId}`);
        stationCache.delete(`${CACHE_KEYS.STATION_NEARBY}:${stationId}`);
    }

    console.log(`[Cache] Invalidated cache for stations: ${stationIds.join(', ')}`);
}

/**
 * 清除所有快取
 */
export function clearAllCache(): void {
    clearAllCaches();
    l1PlacesCache = null;
    apiResponseCache = null;
    stationDataCache = null;
    console.log('[Cache] All caches cleared');
}

// ============== 快取監控 ==============

export interface CacheStats {
    l1Places: ReturnType<CacheService['getStats']>;
    apiResponse: ReturnType<CacheService['getStats']>;
    stationData: ReturnType<CacheService['getStats']>;
}

/**
 * 獲取所有快取的統計資訊
 */
export function getAllCacheStats(): CacheStats {
    return {
        l1Places: getL1PlacesCache().getStats(),
        apiResponse: getApiResponseCache().getStats(),
        stationData: getStationDataCache().getStats()
    };
}

/**
 * 記錄快取統計資訊
 */
export function logCacheStats(): void {
    const stats = getAllCacheStats();
    console.table({
        'L1 Places': stats.l1Places,
        'API Response': stats.apiResponse,
        'Station Data': stats.stationData
    });
}

// ============== 快取預熱 ==============

/**
 * 預熱常用快取
 */
export async function warmCache(
    warmupItems: Array<{
        type: 'l1_places' | 'station_data' | 'api_response';
        key: string;
        fetcher: () => Promise<any>;
    }>
): Promise<void> {
    console.log(`[Cache] Starting cache warmup for ${warmupItems.length} items...`);

    for (const item of warmupItems) {
        try {
            switch (item.type) {
                case 'l1_places':
                    await cachedL1Places([], {}, item.fetcher);
                    break;
                case 'station_data':
                    await cached(getStationDataCache(), item.key, item.fetcher);
                    break;
                case 'api_response':
                    await cached(getApiResponseCache(), item.key, item.fetcher);
                    break;
            }
        } catch (err) {
            console.warn(`[Cache] Warmup failed for ${item.key}:`, err);
        }
    }

    console.log('[Cache] Cache warmup completed');
}

// ============== 匯出 ==============

export { CacheService, CacheKeyBuilder, CACHE_KEYS };
