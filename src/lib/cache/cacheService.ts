/**
 * LRU + TTL 快取服務 (優化版)
 * 支援 Least Recently Used 淘汰機制、Time-To-Live 過期機制
 * 整合分層快取架構與效能監控
 */

export interface CacheEntry<T> {
    key: string;
    value: T;
    expiresAt: number;
    lastAccessed: number;
    accessCount: number;
    priority: 'hot' | 'normal' | 'cold';
    layer: 1 | 2 | 3;
}

export interface CacheConfig {
    /** 最大快取項目數量 (預設: 1000) */
    maxSize: number;
    /** TTL 過期時間 (毫秒，預設: 5分鐘) */
    ttlMs: number;
    /** 熱門站點 TTL (毫秒，預設: 3分鐘) */
    hotTtlMs: number;
    /** 清理間隔 (毫秒，預設: 1分鐘) */
    cleanupIntervalMs: number;
    /** LRU 淘汰比例 (預設: 0.1) */
    evictionRatio: number;
    /** 熱門站點閾值 (訪問次數) */
    hotThreshold: number;
}

export interface CacheStats {
    size: number;
    maxSize: number;
    hitCount: number;
    missCount: number;
    hitRate: number;
    avgAccessTime: number;
    memoryUsage: number;
    layerDistribution: Record<number, number>;
    evictionCount: number;
}

export interface CacheMetrics {
    hitRate: number;
    hitCount: number;
    missCount: number;
    size: number;
    maxSize: number;
    avgAccessTime: number;
}

// 分層快取配置
export const LAYER_CACHE_CONFIG = {
    L1: { maxSize: 500, ttlMs: 3 * 60 * 1000, evictionRatio: 0.05 },   // 熱門站點
    L2: { maxSize: 300, ttlMs: 5 * 60 * 1000, evictionRatio: 0.1 },    // 一般站點
    L3: { maxSize: 200, ttlMs: 10 * 60 * 1000, evictionRatio: 0.15 }   // 冷門站點/備援
};

const DEFAULT_CONFIG: CacheConfig = {
    maxSize: 1000,
    ttlMs: 5 * 60 * 1000,      // 5 分鐘
    hotTtlMs: 3 * 60 * 1000,   // 3 分鐘 (熱門站點)
    cleanupIntervalMs: 60 * 1000, // 1 分鐘
    evictionRatio: 0.1,
    hotThreshold: 100
};

export class CacheService<T = any> {
    private cache: Map<string, CacheEntry<T>>;
    private config: CacheConfig;
    private cleanupTimer?: NodeJS.Timeout;
    
    // 效能監控
    private hitCount: number = 0;
    private missCount: number = 0;
    private totalAccessTime: number = 0;
    private accessCount: number = 0;
    private evictionCount: number = 0;
    
    // 熱門站點追蹤
    private stationAccessCount: Map<string, number> = new Map();

    constructor(config: Partial<CacheConfig> = {}) {
        this.cache = new Map();
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.startCleanup();
    }

    /**
     * 產生快取鍵
     */
    static generateKey(prefix: string, params: Record<string, any>): string {
        const sortedParams = Object.keys(params)
            .sort()
            .filter(key => params[key] !== undefined && params[key] !== null)
            .map(key => `${key}:${JSON.stringify(params[key])}`);
        return `${prefix}:${sortedParams.join('|')}`;
    }

    /**
     * 獲取快取值
     */
    get(key: string): T | null {
        const startTime = performance.now();
        const entry = this.cache.get(key);
        
        if (!entry) {
            this.recordMiss();
            this.recordAccessTime(performance.now() - startTime);
            return null;
        }

        // 檢查是否過期
        if (Date.now() > entry.expiresAt) {
            this.delete(key);
            this.recordMiss();
            this.recordAccessTime(performance.now() - startTime);
            return null;
        }

        // 更新訪問狀態 (LRU)
        entry.lastAccessed = Date.now();
        entry.accessCount++;

        // 移動到 Map 末尾 (MRU)
        this.cache.delete(key);
        this.cache.set(key, entry);
        
        this.recordHit();
        this.recordAccessTime(performance.now() - startTime);
        return entry.value;
    }

    /**
     * 設定快取值
     */
    set(key: string, value: T, ttlMs?: number, priority: 'hot' | 'normal' | 'cold' = 'normal'): void {
        // 檢查是否需要淘汰
        if (this.cache.size >= this.config.maxSize) {
            this.evictLRU();
        }

        const expiresAt = Date.now() + (ttlMs ?? this.config.ttlMs);
        
        // 判斷快取層級
        const layer = this.determineLayer(key, priority);
        
        this.cache.set(key, {
            key,
            value,
            expiresAt,
            lastAccessed: Date.now(),
            accessCount: 1,
            priority,
            layer
        });
    }

    /**
     * 設定快取值 (快取層級版本)
     */
    setWithLayer(key: string, value: T, layer: 1 | 2 | 3, ttlMs?: number): void {
        if (this.cache.size >= this.config.maxSize) {
            this.evictLRU();
        }

        const ttl = ttlMs ?? this.getLayerTTL(layer);
        
        this.cache.set(key, {
            key,
            value,
            expiresAt: Date.now() + ttl,
            lastAccessed: Date.now(),
            accessCount: 1,
            priority: this.getPriorityFromLayer(layer),
            layer
        });
    }

    /**
     * 刪除快取值
     */
    delete(key: string): boolean {
        return this.cache.delete(key);
    }

    /**
     * 檢查快取是否存在且有效
     */
    has(key: string): boolean {
        const entry = this.cache.get(key);
        if (!entry) return false;
        
        if (Date.now() > entry.expiresAt) {
            this.delete(key);
            return false;
        }
        
        return true;
    }

    /**
     * 清空所有快取
     */
    clear(): void {
        this.cache.clear();
        this.hitCount = 0;
        this.missCount = 0;
        this.totalAccessTime = 0;
        this.accessCount = 0;
        this.evictionCount = 0;
        this.stationAccessCount.clear();
    }

    /**
     * 獲取快取統計資訊 (新版本)
     */
    getStats(): CacheStats {
        const layerDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
        
        for (const entry of this.cache.values()) {
            layerDistribution[entry.layer] = (layerDistribution[entry.layer] || 0) + 1;
        }

        return {
            size: this.cache.size,
            maxSize: this.config.maxSize,
            hitCount: this.hitCount,
            missCount: this.missCount,
            hitRate: this.hitCount + this.missCount > 0 
                ? (this.hitCount / (this.hitCount + this.missCount)) * 100 
                : 0,
            avgAccessTime: this.accessCount > 0 ? this.totalAccessTime / this.accessCount : 0,
            memoryUsage: this.estimateMemoryUsage(),
            layerDistribution,
            evictionCount: this.evictionCount
        };
    }

    /**
     * 獲取快取監控指標
     */
    getMetrics(): CacheMetrics {
        return {
            hitCount: this.hitCount,
            missCount: this.missCount,
            hitRate: this.hitCount + this.missCount > 0 
                ? (this.hitCount / (this.hitCount + this.missCount)) * 100 
                : 0,
            size: this.cache.size,
            maxSize: this.config.maxSize,
            avgAccessTime: this.accessCount > 0 ? this.totalAccessTime / this.accessCount : 0
        };
    }

    /**
     * 記錄站點訪問
     */
    recordStationAccess(stationId: string): void {
        const count = this.stationAccessCount.get(stationId) || 0;
        this.stationAccessCount.set(stationId, count + 1);
    }

    /**
     * 檢查是否為熱門站點
     */
    isHotStation(stationId: string): boolean {
        return (this.stationAccessCount.get(stationId) || 0) >= this.config.hotThreshold;
    }

    /**
     * LRU 淘汰機制
     */
    private evictLRU(): void {
        const evictCount = Math.ceil(this.config.maxSize * this.config.evictionRatio);
        const entries: Array<[string, CacheEntry<T>]> = [];

        // 收集所有條目
        for (const [key, entry] of this.cache.entries()) {
            entries.push([key, entry]);
        }

        // 按訪問時間和優先級排序
        entries.sort((a, b) => {
            // 優先淘汰冷門優先級
            const priorityOrder = { cold: 0, normal: 1, hot: 2 };
            const priorityDiff = priorityOrder[a[1].priority] - priorityOrder[b[1].priority];
            if (priorityDiff !== 0) return priorityDiff;
            
            // 同優先級下按訪問時間
            return a[1].lastAccessed - b[1].lastAccessed;
        });

        // 淘汰項目
        for (let i = 0; i < evictCount && i < entries.length; i++) {
            this.cache.delete(entries[i][0]);
            this.evictionCount++;
        }
    }

    /**
     * 清理過期項目
     */
    private cleanup(): void {
        const now = Date.now();
        const expiredKeys: string[] = [];

        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                expiredKeys.push(key);
            }
        }

        for (const key of expiredKeys) {
            this.cache.delete(key);
        }
    }

    /**
     * 啟動定期清理
     */
    private startCleanup(): void {
        if (typeof window === 'undefined') {
            this.cleanupTimer = setInterval(() => this.cleanup(), this.config.cleanupIntervalMs);
        }
    }

    /**
     * 停止清理計時器
     */
    destroy(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = undefined;
        }
        this.clear();
    }

    /**
     * 判斷快取層級
     */
    private determineLayer(key: string, priority: 'hot' | 'normal' | 'cold'): 1 | 2 | 3 {
        const priorityMap: Record<string, 1 | 2 | 3> = {
            hot: 1,
            normal: 2,
            cold: 3
        };
        return priorityMap[priority];
    }

    /**
     * 從層級獲取優先級
     */
    private getPriorityFromLayer(layer: 1 | 2 | 3): 'hot' | 'normal' | 'cold' {
        const map: Record<number, 'hot' | 'normal' | 'cold'> = {
            1: 'hot',
            2: 'normal',
            3: 'cold'
        };
        return map[layer];
    }

    /**
     * 獲取層級對應的 TTL
     */
    private getLayerTTL(layer: 1 | 2 | 3): number {
        const ttlMap: Record<number, number> = {
            1: this.config.hotTtlMs,
            2: this.config.ttlMs,
            3: 10 * 60 * 1000  // 10 分鐘
        };
        return ttlMap[layer];
    }

    /**
     * 記錄命中
     */
    private recordHit(): void {
        this.hitCount++;
        this.accessCount++;
    }

    /**
     * 記錄未命中
     */
    private recordMiss(): void {
        this.missCount++;
        this.accessCount++;
    }

    /**
     * 記錄存取時間
     */
    private recordAccessTime(time: number): void {
        this.totalAccessTime += time;
    }

    /**
     * 估計記憶體使用量
     */
    private estimateMemoryUsage(): number {
        // 粗略估計：每個條目約 200 bytes
        return this.cache.size * 200;
    }
}

/**
 * 全域快取服務工廠
 */
const globalCaches = new Map<string, CacheService>();

export function getCache<T>(name: string, config?: Partial<CacheConfig>): CacheService<T> {
    if (!globalCaches.has(name)) {
        globalCaches.set(name, new CacheService<T>(config));
    }
    return globalCaches.get(name) as CacheService<T>;
}

export function clearCache(name: string): void {
    const cache = globalCaches.get(name);
    if (cache) {
        cache.destroy();
        globalCaches.delete(name);
    }
}

export function clearAllCaches(): void {
    for (const cache of globalCaches.values()) {
        cache.destroy();
    }
    globalCaches.clear();
}

/**
 * 獲取所有快取統計
 */
export function getAllCacheStats(): Record<string, CacheStats> {
    const stats: Record<string, CacheStats> = {};
    for (const [name, cache] of globalCaches.entries()) {
        stats[name] = cache.getStats();
    }
    return stats;
}

/**
 * L1 Places 快取輔助函數
 * 為 L1 景點資料提供便捷的快取介面
 */
export async function cachedL1Places<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: { ttlMs?: number; priority?: 'hot' | 'normal' | 'cold' }
): Promise<T> {
    const cache = getCache<T>('l1_places', {
        maxSize: 200,
        ttlMs: options?.ttlMs ?? 5 * 60 * 1000,
        hotTtlMs: options?.ttlMs ? options.ttlMs * 2 : 10 * 60 * 1000
    });

    const cached = cache.get(key);
    if (cached !== null) {
        return cached;
    }

    const value = await fetcher();
    cache.set(key, value, options?.ttlMs, options?.priority ?? 'normal');
    return value;
}
