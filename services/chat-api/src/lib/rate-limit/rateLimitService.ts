/**
 * API 速率限制服務
 * 支援 IP 層級與端點層級的限流
 */

import { NextRequest, NextResponse } from 'next/server';
import { SlidingWindowRateLimiter, FixedWindowRateLimiter, createRateLimiter, RateLimitConfig } from './slidingWindow';

// ============== 限流配置 ==============

export interface EndpointRateLimitConfig {
    /** 端點路徑 */
    path: string;
    /** IP 層級限流配置 */
    ipLimit: RateLimitConfig;
    /** 端點層級限流配置 */
    endpointLimit: RateLimitConfig;
}

export const DEFAULT_RATE_LIMITS = {
    /** 一般 API 端點 */
    default: {
        maxRequests: 100,
        windowMs: 60 * 1000 // 1 分鐘
    } as RateLimitConfig,

    /** L1 景點相關端點 */
    l1Places: {
        maxRequests: 50,
        windowMs: 60 * 1000 // 1 分鐘
    } as RateLimitConfig,

    /** 地圖相關端點 */
    map: {
        maxRequests: 200,
        windowMs: 60 * 1000 // 1 分鐘
    } as RateLimitConfig,

    /** 搜尋相關端點 */
    search: {
        maxRequests: 30,
        windowMs: 60 * 1000 // 1 分鐘
    } as RateLimitConfig,

    /** 管理相關端點 */
    admin: {
        maxRequests: 20,
        windowMs: 60 * 1000 // 1 分鐘
    } as RateLimitConfig
} as const;

// ============== 限流服務類別 ==============

export class RateLimitService {
    private ipLimiters: Map<string, SlidingWindowRateLimiter | FixedWindowRateLimiter> = new Map();
    private endpointLimiters: Map<string, SlidingWindowRateLimiter | FixedWindowRateLimiter> = new Map();
    private defaultConfig: RateLimitConfig;

    constructor(defaultConfig?: RateLimitConfig) {
        this.defaultConfig = defaultConfig || DEFAULT_RATE_LIMITS.default;
    }

    /**
     * 獲取客戶端 IP
     */
    static getClientIP(request: NextRequest): string {
        // 檢查各種可能的 IP 頭
        const forwarded = request.headers.get('x-forwarded-for');
        if (forwarded) {
            // x-forwarded-for 可能包含多個 IP，取第一個
            return forwarded.split(',')[0].trim();
        }

        const realIP = request.headers.get('x-real-ip');
        if (realIP) {
            return realIP;
        }

        // 降級到遠端位址
        return request.ip || 'unknown';
    }

    /**
     * 為請求檢查限流
     */
    check(request: NextRequest, endpointConfig?: RateLimitConfig): {
        allowed: boolean;
        remaining: number;
        resetAt: number;
        retryAfter?: number;
        rateLimitKey: string;
    } {
        const ip = RateLimitService.getClientIP(request);
        const path = this.normalizePath(request.nextUrl.pathname);
        const config = endpointConfig || this.defaultConfig;

        // IP 層級限流
        const ipKey = `ip:${ip}`;
        const ipLimiter = this.getOrCreateIpLimiter(ipKey, config);
        const ipResult = ipLimiter.check(ip);

        if (!ipResult.allowed) {
            return {
                ...ipResult,
                rateLimitKey: ipKey
            };
        }

        // 端點層級限流
        const endpointKey = `endpoint:${path}`;
        const endpointLimiter = this.getOrCreateEndpointLimiter(endpointKey, config);
        const endpointResult = endpointLimiter.check(path);

        return {
            ...endpointResult,
            rateLimitKey: endpointKey
        };
    }

    /**
     * 創建限流響應
     */
    createTooManyRequestsResponse(result: {
        remaining: number;
        resetAt: number;
        retryAfter?: number;
    }): NextResponse {
        const response = NextResponse.json(
            {
                error: 'Too Many Requests',
                message: '請求頻率過高，請稍後再試',
                retryAfter: result.retryAfter
            },
            { status: 429 }
        );

        // 添加標準限流頭
        response.headers.set('X-RateLimit-Limit', '0');
        response.headers.set('X-RateLimit-Remaining', '0');
        response.headers.set('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000).toString());
        response.headers.set('Retry-After', (result.retryAfter || 60).toString());

        return response;
    }

    /**
     * 為 Next.js API Route 創建限流 Middleware
     */
    createMiddleware(options?: {
        customConfig?: RateLimitConfig;
        skipPaths?: string[];
        skipIPs?: string[];
    }): (request: NextRequest) => Promise<NextResponse | null>;

    createMiddleware(options: {
        customConfig?: RateLimitConfig;
        skipPaths?: string[];
        skipIPs?: string[];
    } = {}) {
        const { customConfig, skipPaths = [], skipIPs = [] } = options;

        return async (request: NextRequest): Promise<NextResponse | null> => {
            const ip = RateLimitService.getClientIP(request);
            const path = request.nextUrl.pathname;

            // 跳過指定路徑
            if (skipPaths.some(skipPath => path.startsWith(skipPath))) {
                return null;
            }

            // 跳過指定 IP
            if (skipIPs.includes(ip)) {
                return null;
            }

            const result = this.check(request, customConfig);

            if (!result.allowed) {
                return this.createTooManyRequestsResponse(result);
            }

            // 添加限流頭到響應
            return null; // 返回 null 表示不阻擋請求，響應頭會在後續處理中添加
        };
    }

    /**
     * 為 Next.js Route Handler 創建裝飾器
     */
    withRateLimit(endpointConfig?: RateLimitConfig) {
        const limiter = this; // 使用實例而非全域變量
        return function <T extends (...args: any[]) => Promise<Response>>(
            handler: T
        ): T {
            return (async (...args: Parameters<T>) => {
                const request = args[0] as NextRequest;
                const result = limiter.check(request, endpointConfig);

                if (!result.allowed) {
                    return limiter.createTooManyRequestsResponse(result);
                }

                const response = await handler(...args);

                // 添加限流頭
                if (response instanceof NextResponse) {
                    response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
                    response.headers.set('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000).toString());
                }

                return response;
            }) as T;
        };
    }

    /**
     * 重置特定 IP 的限流
     */
    resetIP(ip: string): void {
        const key = `ip:${ip}`;
        this.ipLimiters.get(key)?.destroy();
        this.ipLimiters.delete(key);
    }

    /**
     * 重置特定端點的限流
     */
    resetEndpoint(path: string): void {
        const key = `endpoint:${path}`;
        this.endpointLimiters.get(key)?.destroy();
        this.endpointLimiters.delete(key);
    }

    /**
     * 重置所有限流
     */
    resetAll(): void {
        for (const limiter of this.ipLimiters.values()) {
            if (limiter instanceof SlidingWindowRateLimiter) limiter.resetAll();
            else limiter.destroy();
        }
        for (const limiter of this.endpointLimiters.values()) {
            if (limiter instanceof SlidingWindowRateLimiter) limiter.resetAll();
            else limiter.destroy();
        }
    }

    /**
     * 獲取限流統計
     */
    getStats(): { activeIPLimiters: number; activeEndpointLimiters: number } {
        return {
            activeIPLimiters: this.ipLimiters.size,
            activeEndpointLimiters: this.endpointLimiters.size
        };
    }

    private normalizePath(path: string): string {
        // 移除動態參數以獲得通用端點
        return path.replace(/\/\[.*?\]/g, '/*').replace(/\/:[^\/]+/g, '/*');
    }

    private getOrCreateIpLimiter(key: string, config: RateLimitConfig): SlidingWindowRateLimiter | FixedWindowRateLimiter {
        if (!this.ipLimiters.has(key)) {
            this.ipLimiters.set(key, createRateLimiter(config));
        }
        return this.ipLimiters.get(key)!;
    }

    private getOrCreateEndpointLimiter(key: string, config: RateLimitConfig): SlidingWindowRateLimiter | FixedWindowRateLimiter {
        if (!this.endpointLimiters.has(key)) {
            this.endpointLimiters.set(key, createRateLimiter(config));
        }
        return this.endpointLimiters.get(key)!;
    }
}

// ============== 全域限流服務實例 ==============

let globalLimiter: RateLimitService | null = null;

export function getRateLimitService(): RateLimitService {
    if (!globalLimiter) {
        globalLimiter = new RateLimitService();
    }
    return globalLimiter;
}

export function getL1PlacesRateLimiter(): RateLimitService {
    if (!globalLimiter) {
        globalLimiter = new RateLimitService(DEFAULT_RATE_LIMITS.l1Places);
    }
    return globalLimiter;
}

// ============== 便捷函數 ==============

/**
 * 為 API Route 快速添加限流
 */
export async function withRateLimit(
    request: NextRequest,
    options?: {
        maxRequests?: number;
        windowMs?: number;
    }
): Promise<{ allowed: boolean; response?: NextResponse }> {
    const limiter = getRateLimitService();
    const config: RateLimitConfig = {
        maxRequests: options?.maxRequests || 100,
        windowMs: options?.windowMs || 60 * 1000
    };

    const result = limiter.check(request, config);

    if (!result.allowed) {
        return {
            allowed: false,
            response: limiter.createTooManyRequestsResponse(result)
        };
    }

    return { allowed: true };
}

/**
 * 創建標準的 429 響應
 */
export function create429Response(retryAfter: number = 60): NextResponse {
    const response = NextResponse.json(
        {
            error: 'Too Many Requests',
            message: '請求頻率過高，請稍後再試',
            retryAfter
        },
        { status: 429 }
    );

    response.headers.set('Retry-After', retryAfter.toString());
    return response;
}
