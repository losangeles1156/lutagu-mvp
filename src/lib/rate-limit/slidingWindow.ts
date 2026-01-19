/**
 * 滑動視窗限流算法
 * 支援固定視窗與滑動視窗兩種模式
 */

export interface RateLimitConfig {
    /** 最大請求次數 */
    maxRequests: number;
    /** 時間窗口 (毫秒) */
    windowMs: number;
    /** 模式: 'fixed' | 'sliding' */
    mode?: 'fixed' | 'sliding';
}

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: number;
    retryAfter?: number;
}

/**
 * 滑動視窗計數器條目
 */
interface WindowEntry {
    count: number;
    windowStart: number;
}

/**
 * 滑動視窗限流器
 */
export class SlidingWindowRateLimiter {
    private config: RateLimitConfig;
    private windows: Map<string, WindowEntry> = new Map();
    private cleanupTimer?: NodeJS.Timeout;

    constructor(config: RateLimitConfig) {
        this.config = {
            mode: 'sliding',
            ...config
        };
        this.startCleanup();
    }

    /**
     * 檢查並增加計數
     */
    check(key: string): RateLimitResult {
        const now = Date.now();
        const windowStart = now - this.config.windowMs;
        const existing = this.windows.get(key);

        // 計算當前視窗內的請求數
        let currentCount = 0;

        if (existing && existing.windowStart > windowStart) {
            // 現有條目仍在視窗內
            currentCount = existing.count;
        }

        // 檢查是否超限
        if (currentCount >= this.config.maxRequests) {
            const resetAt = existing
                ? existing.windowStart + this.config.windowMs
                : now + this.config.windowMs;

            return {
                allowed: false,
                remaining: 0,
                resetAt,
                retryAfter: Math.ceil((resetAt - now) / 1000)
            };
        }

        // 增加計數
        this.windows.set(key, {
            count: currentCount + 1,
            windowStart: now
        });

        const resetAt = now + this.config.windowMs;

        return {
            allowed: true,
            remaining: this.config.maxRequests - currentCount - 1,
            resetAt
        };
    }

    /**
     * 獲取剩餘配額
     */
    getRemaining(key: string): number {
        const now = Date.now();
        const windowStart = now - this.config.windowMs;
        const existing = this.windows.get(key);

        if (!existing || existing.windowStart <= windowStart) {
            return this.config.maxRequests;
        }

        return Math.max(0, this.config.maxRequests - existing.count);
    }

    /**
     * 重置特定鍵的計數
     */
    reset(key: string): void {
        this.windows.delete(key);
    }

    /**
     * 重置所有計數
     */
    resetAll(): void {
        this.windows.clear();
    }

    /**
     * 清理過期的視窗
     */
    private cleanup(): void {
        const now = Date.now();
        const windowStart = now - this.config.windowMs;

        for (const [key, entry] of this.windows.entries()) {
            if (entry.windowStart <= windowStart) {
                this.windows.delete(key);
            }
        }
    }

    /**
     * 啟動定期清理
     */
    private startCleanup(): void {
        if (typeof window === 'undefined') {
            const cleanupInterval = Math.min(this.config.windowMs, 60000);
            this.cleanupTimer = setInterval(() => this.cleanup(), cleanupInterval);
        }
    }

    /**
     * 銷毀計時器
     */
    destroy(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = undefined;
        }
        this.resetAll();
    }
}

/**
 * 固定視窗限流器 (更簡單的實現)
 */
export class FixedWindowRateLimiter {
    private config: RateLimitConfig;
    private counters: Map<string, { count: number; windowStart: number }> = new Map();

    constructor(config: RateLimitConfig) {
        this.config = {
            mode: 'fixed',
            ...config
        };
    }

    /**
     * 檢查並增加計數
     */
    check(key: string): RateLimitResult {
        const now = Date.now();
        const windowMs = this.config.windowMs;
        const windowStart = Math.floor(now / windowMs) * windowMs;
        const windowEnd = windowStart + windowMs;

        const existing = this.counters.get(key);

        let currentCount = 0;
        if (existing && existing.windowStart === windowStart) {
            currentCount = existing.count;
        }

        if (currentCount >= this.config.maxRequests) {
            return {
                allowed: false,
                remaining: 0,
                resetAt: windowEnd,
                retryAfter: Math.ceil((windowEnd - now) / 1000)
            };
        }

        this.counters.set(key, {
            count: currentCount + 1,
            windowStart
        });

        return {
            allowed: true,
            remaining: this.config.maxRequests - currentCount - 1,
            resetAt: windowEnd
        };
    }

    /**
     * 獲取剩餘配額
     */
    getRemaining(key: string): number {
        const now = Date.now();
        const windowMs = this.config.windowMs;
        const windowStart = Math.floor(now / windowMs) * windowMs;
        const existing = this.counters.get(key);

        if (!existing || existing.windowStart !== windowStart) {
            return this.config.maxRequests;
        }

        return Math.max(0, this.config.maxRequests - existing.count);
    }

    /**
     * 重置計數
     */
    reset(key: string): void {
        this.counters.delete(key);
    }

    destroy(): void {
        this.counters.clear();
    }
}

/**
 * 創建滑動視窗限流器的工廠函數
 */
export function createRateLimiter(config: RateLimitConfig): SlidingWindowRateLimiter | FixedWindowRateLimiter {
    if (config.mode === 'fixed') {
        return new FixedWindowRateLimiter(config);
    }
    return new SlidingWindowRateLimiter(config);
}

/**
 * 創建固定視窗限流器
 */
export function createFixedWindowLimiter(config: RateLimitConfig): FixedWindowRateLimiter {
    return new FixedWindowRateLimiter(config);
}
