/**
 * 快取模組入口
 * 整合所有快取相關服務與工具
 */

export {
    CacheService,
    type CacheConfig,
    type LAYER_CACHE_CONFIG,
    getCache,
    getAllCacheStats,
    cachedL1Places
} from './cacheService';

export {
    CacheKeyBuilder,
    hashStationIds
} from './cacheKeyBuilder';

export {
    CacheWarmer,
    getCacheWarmer,
    getWarmerStats,
    destroyCacheWarmer
} from './cacheWarmer';

export {
    CacheMonitor,
    type MonitorConfig,
    getCacheMonitor,
    destroyCacheMonitor
} from './cacheMonitor';

export {
    RedisCacheService,
    type RedisConfig,
    type RedisCacheConfig,
    getRedisCache,
    initRedisCache
} from './redisCacheService';
