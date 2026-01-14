/**
 * Redis L2 分散式快取服務
 * 為 Lutagu 提供跨實例的快取共享能力
 */

import { CacheConfig, CacheStats } from './cacheService';

// Redis 客戶端介面（支援 ioredis 或其他實現）
interface RedisClient {
    get(key: string): Promise<string | null>;
    set(key: string, value: string, mode?: 'EX' | 'PX', duration?: number): Promise<'OK'>;
    del(keys: string | string[]): Promise<number>;
    keys(pattern: string): Promise<string[]>;
    ping(): Promise<string>;
    quit(): Promise<'OK'>;
    on(event: string, callback: (...args: any[]) => void): void;
    isConnected: boolean;
}

// Redis 連線配置
export interface RedisConfig {
    /** Redis URL (redis://host:port) */
    url?: string;
    /** 主機地址 */
    host?: string;
    /** 連接埠 */
    port?: number;
    /** 密碼 */
    password?: string;
    /** 資料庫編號 */
    db?: number;
    /** 連接超時 (ms) */
    connectTimeout?: number;
    /** 最大重試次數 */
    maxRetriesPerRequest?: number;
    /** 啟用離線佇列 */
    enableOfflineQueue?: boolean;
}

// Redis 快取配置
export interface RedisCacheConfig extends CacheConfig {
    /** 預設 TTL (毫秒) */
    defaultTtlMs: number;
    /** 鍵前綴 */
    keyPrefix: string;
    /** 連線池大小 */
    poolSize?: number;
    /** 啟用壓縮 */
    enableCompression?: boolean;
}

// 預設配置
const DEFAULT_REDIS_CONFIG: Partial<RedisConfig> = {
    host: 'localhost',
    port: 6379,
    db: 0,
    connectTimeout: 10000,
    maxRetriesPerRequest: 3,
    enableOfflineQueue: true
};

const DEFAULT_CACHE_CONFIG: Partial<RedisCacheConfig> = {
    defaultTtlMs: 5 * 60 * 1000, // 5 分鐘
    keyPrefix: 'lutagu:cache:',
    enableCompression: false
};

export class RedisCacheService<T = any> {
    private client: RedisClient | null = null;
    private config: RedisCacheConfig;
    private isConnected: boolean = false;
    private localCache: Map<string, { value: T; expiresAt: number }> = new Map();
    
    // 統計資訊
    private hitCount: number = 0;
    private missCount: number = 0;
    private localHitCount: number = 0;
    private remoteHitCount: number = 0;

    constructor(config: Partial<RedisCacheConfig> = {}) {
        this.config = {
            ...DEFAULT_CACHE_CONFIG,
            ...config,
            maxSize: config.maxSize ?? 1000,
            ttlMs: config.ttlMs ?? 5 * 60 * 1000,
            hotTtlMs: config.hotTtlMs ?? 3 * 60 * 1000,
            cleanupIntervalMs: config.cleanupIntervalMs ?? 60000,
            evictionRatio: config.evictionRatio ?? 0.1,
            hotThreshold: config.hotThreshold ?? 100
        } as RedisCacheConfig;
    }

    isRemoteConnected(): boolean {
        return Boolean(this.client && this.isConnected);
    }

    /**
     * 連線到 Redis
     */
    async connect(redisConfig?: Partial<RedisConfig>): Promise<void> {
        const config = { ...DEFAULT_REDIS_CONFIG, ...redisConfig };
        
        try {
            // 嘗試載入 ioredis
            const Redis = await import('ioredis');
            
            const redisOptionsBase: any = {
                db: config.db,
                connectTimeout: config.connectTimeout,
                maxRetriesPerRequest: config.maxRetriesPerRequest,
                enableOfflineQueue: config.enableOfflineQueue,
                retryStrategy: (times: number) => {
                    if (times > 3) return null;
                    return Math.min(times * 200, 2000);
                }
            };

            const redisOptions: any = config.url
                ? redisOptionsBase
                : {
                    ...redisOptionsBase,
                    host: config.host,
                    port: config.port
                };

            if (config.password) {
                redisOptions.password = config.password;
            }

            const redisInstance = config.url
                ? new Redis.default(config.url, redisOptions)
                : new Redis.default(redisOptions);
            
            // 確保 client 不為 null
            this.client = redisInstance as unknown as RedisClient;
            this.client.isConnected = true;
            
            this.client.on('connect', () => {
                console.log('[RedisCache] 已連線到 Redis');
                this.isConnected = true;
                if (this.client) this.client.isConnected = true;
            });

            this.client.on('error', (err: Error) => {
                console.warn('[RedisCache] Redis 連線錯誤:', err.message);
                this.isConnected = false;
                if (this.client) this.client.isConnected = false;
            });

            this.client.on('close', () => {
                console.log('[RedisCache] Redis 連線已關閉');
                this.isConnected = false;
                if (this.client) this.client.isConnected = false;
            });

            // 測試連線
            await this.client.ping();
            this.isConnected = true;
            console.log('[RedisCache] Redis 連線測試成功');
        } catch (error) {
            console.warn('[RedisCache] 無法載入 ioredis 或連線失敗，使用僅本地快取模式');
            this.isConnected = false;
        }
    }

    /**
     * 斷開 Redis 連線
     */
    async disconnect(): Promise<void> {
        if (this.client) {
            await this.client.quit();
            this.client = null;
            this.isConnected = false;
            console.log('[RedisCache] 已斷開 Redis 連線');
        }
    }

    /**
     * 更新本地快取
     */
    private setLocalCache(key: string, value: T): void {
        const ttl = this.config.defaultTtlMs;
        this.localCache.set(key, {
            value,
            expiresAt: Date.now() + ttl
        });
    }

    /**
     * 獲取快取值
     */
    async get(key: string): Promise<T | null> {
        // 1. 先檢查本地快取
        const localEntry = this.localCache.get(key);
        if (localEntry && Date.now() < localEntry.expiresAt) {
            this.localHitCount++;
            this.hitCount++;
            return localEntry.value;
        }

        // 2. 移除過期的本地項目
        this.localCache.delete(key);

        // 3. 檢查 Redis（如果已連線）
        if (this.client && this.isConnected) {
            try {
                const redisKey = this.getFullKey(key);
                const value = await this.client.get(redisKey);
                
                if (value) {
                    const parsed = JSON.parse(value) as T;
                    this.remoteHitCount++;
                    this.hitCount++;
                    
                    // 更新本地快取
                    this.setLocalCache(key, parsed);
                    
                    return parsed;
                }
            } catch (error) {
                console.warn('[RedisCache] Redis get 錯誤:', error);
            }
        }

        this.missCount++;
        return null;
    }

    /**
     * 設定快取值
     */
    async set(key: string, value: T, ttlMs?: number): Promise<void> {
        const ttl = ttlMs ?? this.config.defaultTtlMs;
        const expiresAt = Date.now() + ttl;

        // 1. 更新本地快取
        this.localCache.set(key, { value, expiresAt });

        // 2. 更新 Redis（如果已連線）
        if (this.client && this.isConnected) {
            try {
                const redisKey = this.getFullKey(key);
                const serialized = JSON.stringify(value);
                
                await this.client.set(redisKey, serialized, 'PX', ttl);
            } catch (error) {
                console.warn('[RedisCache] Redis set 錯誤:', error);
            }
        }
    }

    /**
     * 刪除快取值
     */
    async delete(key: string): Promise<boolean> {
        // 1. 刪除本地快取
        this.localCache.delete(key);

        // 2. 刪除 Redis（如果已連線）
        if (this.client && this.isConnected) {
            try {
                const redisKey = this.getFullKey(key);
                const result = await this.client.del(redisKey);
                return result > 0;
            } catch (error) {
                console.warn('[RedisCache] Redis delete 錯誤:', error);
            }
        }

        return false;
    }

    /**
     * 檢查快取是否存在
     */
    async has(key: string): Promise<boolean> {
        const entry = this.localCache.get(key);
        if (entry && Date.now() < entry.expiresAt) {
            return true;
        }

        this.localCache.delete(key);

        if (this.client && this.isConnected) {
            try {
                const redisKey = this.getFullKey(key);
                const value = await this.client.get(redisKey);
                return value !== null;
            } catch (error) {
                console.warn('[RedisCache] Redis has 錯誤:', error);
            }
        }

        return false;
    }

    /**
     * 清空所有快取
     */
    async clear(): Promise<void> {
        // 清空本地快取
        this.localCache.clear();
        this.hitCount = 0;
        this.missCount = 0;
        this.localHitCount = 0;
        this.remoteHitCount = 0;

        // 清空 Redis（如果已連線）
        if (this.client && this.isConnected) {
            try {
                const pattern = `${this.config.keyPrefix}*`;
                const keys = await this.client.keys(pattern);
                if (keys.length > 0) {
                    await this.client.del(keys);
                }
            } catch (error) {
                console.warn('[RedisCache] Redis clear 錯誤:', error);
            }
        }
    }

    /**
     * 獲取快取統計資訊
     */
    getStats(): CacheStats {
        const totalAccess = this.hitCount + this.missCount;
        const memoryUsage = this.localCache.size * 200; // 粗略估計

        return {
            size: this.localCache.size,
            maxSize: this.config.maxSize,
            hitCount: this.hitCount,
            missCount: this.missCount,
            hitRate: totalAccess > 0 ? (this.hitCount / totalAccess) * 100 : 0,
            avgAccessTime: 0,
            memoryUsage,
            layerDistribution: { 1: this.localHitCount, 2: this.remoteHitCount, 3: 0 },
            evictionCount: 0
        };
    }

    /**
     * 獲取詳細統計
     */
    getDetailedStats(): {
        localCacheSize: number;
        isConnected: boolean;
        localHits: number;
        remoteHits: number;
        totalHits: number;
        totalMisses: number;
        hitRate: number;
    } {
        const totalAccess = this.hitCount + this.missCount;
        return {
            localCacheSize: this.localCache.size,
            isConnected: this.isConnected,
            localHits: this.localHitCount,
            remoteHits: this.remoteHitCount,
            totalHits: this.hitCount,
            totalMisses: this.missCount,
            hitRate: totalAccess > 0 ? (this.hitCount / totalAccess) * 100 : 0
        };
    }

    /**
     * 清理過期的本地快取項目
     */
    cleanup(): void {
        const now = Date.now();
        const expiredKeys: string[] = [];

        for (const [key, entry] of this.localCache.entries()) {
            if (now > entry.expiresAt) {
                expiredKeys.push(key);
            }
        }

        for (const key of expiredKeys) {
            this.localCache.delete(key);
        }

        if (expiredKeys.length > 0) {
            console.log(`[RedisCache] 清理了 ${expiredKeys.length} 個過期的本地快取項目`);
        }
    }

    /**
     * 銷毀服務
     */
    async destroy(): Promise<void> {
        await this.disconnect();
        this.localCache.clear();
    }

    /**
     * 產生完整的 Redis 鍵
     */
    private getFullKey(key: string): string {
        return `${this.config.keyPrefix}${key}`;
    }
}

// ============== 全域工廠 ==============

let globalRedisCache: RedisCacheService | null = null;

export function getRedisCache<T = any>(name: string = 'default'): RedisCacheService<T> {
    // 注意：每個名稱應該有不同的實例
    // 這裡簡化為單例，實際應用可改為 Map 儲存多個實例
    if (!globalRedisCache) {
        globalRedisCache = new RedisCacheService<T>();
    }
    return globalRedisCache;
}

export async function initRedisCache(config?: Partial<RedisConfig>): Promise<RedisCacheService> {
    const cache = getRedisCache();
    await cache.connect(config);
    return cache;
}

let envInitPromise: Promise<RedisCacheService | null> | null = null;

export function getRedisUrlFromEnv(): string | undefined {
    return process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL || process.env.KV_URL;
}

export async function initRedisCacheFromEnv(): Promise<RedisCacheService | null> {
    if (envInitPromise) return envInitPromise;

    envInitPromise = (async () => {
        const url = getRedisUrlFromEnv();
        if (!url) return null;

        try {
            const cache = await initRedisCache({ url });
            return cache;
        } catch {
            return null;
        }
    })();

    return envInitPromise;
}

export default RedisCacheService;
