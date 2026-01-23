/**
 * Generic Redis Cache Service for LUTAGU
 * 
 * Provides a standardized way to cache async operations (API calls, DB queries).
 * Supports hierarchical keys, TTL, and automatic fetch/refresh.
 */

import { LRUCache } from 'lru-cache';

// In-memory fallback
const memoryCache = new LRUCache<string, any>({
    max: 500,
    ttl: 60 * 1000,
});

let redisClient: any = null;
let redisInitPromise: Promise<any> | null = null;

const defaultRedisOpTimeoutMs = Number(process.env.REDIS_OP_TIMEOUT_MS ?? 800);

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return promise;
    return new Promise<T>((resolve, reject) => {
        const timeoutId = setTimeout(() => reject(new Error('Redis operation timeout')), timeoutMs);
        promise.then(
            value => {
                clearTimeout(timeoutId);
                resolve(value);
            },
            err => {
                clearTimeout(timeoutId);
                reject(err);
            }
        );
    });
}

async function getRedisClient() {
    if (redisClient) return redisClient;

    if (redisInitPromise) {
        try {
            return await withTimeout(redisInitPromise, defaultRedisOpTimeoutMs);
        } catch {
            return null;
        }
    }

    const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

    if (!url || !token) return null;

    redisInitPromise = (async () => {
        const mod = await withTimeout(import('@upstash/redis'), defaultRedisOpTimeoutMs);
        const Redis = (mod as any).Redis;
        redisClient = new Redis({ url, token });
        return redisClient;
    })();

    try {
        return await withTimeout(redisInitPromise, defaultRedisOpTimeoutMs);
    } catch {
        redisInitPromise = null;
        return null;
    }
}

/**
 * Get cached value or fetch fresh
 */
export async function getCached<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = 300
): Promise<T> {
    // 1. Try Memory (Fastest)
    const mem = memoryCache.get(key);
    if (mem) return mem as T;

    // 2. Try Redis
    try {
        const redis = await getRedisClient();
        if (redis) {
            const cached = await withTimeout(redis.get(key), defaultRedisOpTimeoutMs);
            if (cached) {
                // Update memory cache
                memoryCache.set(key, cached, { ttl: ttlSeconds * 1000 });
                return typeof cached === 'string' ? JSON.parse(cached) : cached as T;
            }
        }
    } catch (e) {
        console.warn('[RedisCache] Redis get error:', e);
    }

    // 3. Fetch Fresh
    const fresh = await fetcher();

    // 4. Set Cache
    memoryCache.set(key, fresh, { ttl: ttlSeconds * 1000 });
    try {
        const redis = await getRedisClient();
        if (redis) {
            await withTimeout(redis.set(key, JSON.stringify(fresh), { ex: ttlSeconds }), defaultRedisOpTimeoutMs);
        }
    } catch (e) {
        // ignore set errors
    }

    return fresh;
}

/**
 * Delete cache key
 */
export async function invalidateCache(key: string): Promise<void> {
    memoryCache.delete(key);
    try {
        const redis = await getRedisClient();
        if (redis) await withTimeout(redis.del(key), defaultRedisOpTimeoutMs);
    } catch (e) { }
}

export async function initRedisCacheFromEnv(): Promise<void> {
    await getRedisClient();
}

export function getRedisCache<T>(_namespace?: string): {
    get: (key: string) => Promise<T | null>;
    set: (key: string, value: T, ttlMs?: number) => Promise<void>;
} {
    return {
        async get(key: string) {
            const mem = memoryCache.get(key);
            if (mem !== undefined) return mem as T;

            try {
                const redis = await getRedisClient();
                if (!redis) return null;

                const cached = await withTimeout(redis.get(key), defaultRedisOpTimeoutMs);
                if (cached === null || cached === undefined) return null;

                const parsed = typeof cached === 'string' ? (JSON.parse(cached) as T) : (cached as T);
                memoryCache.set(key, parsed);
                return parsed;
            } catch {
                return null;
            }
        },
        async set(key: string, value: T, ttlMs?: number) {
            const ttl = typeof ttlMs === 'number' && Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : undefined;
            if (ttl) memoryCache.set(key, value, { ttl });
            else memoryCache.set(key, value);

            try {
                const redis = await getRedisClient();
                if (!redis) return;

                if (ttl) {
                    await withTimeout(
                        redis.set(key, JSON.stringify(value), { ex: Math.max(1, Math.ceil(ttl / 1000)) }),
                        defaultRedisOpTimeoutMs
                    );
                } else {
                    await withTimeout(redis.set(key, JSON.stringify(value)), defaultRedisOpTimeoutMs);
                }
            } catch {
                return;
            }
        },
    };
}
