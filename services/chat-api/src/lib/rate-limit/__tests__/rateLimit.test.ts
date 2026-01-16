/**
 * 速率限制服務測試
 * 測試滑動視窗算法與 IP/端點限流
 */

import assert from 'node:assert/strict';
import { afterEach, before, beforeEach, describe, it } from 'node:test';
import { SlidingWindowRateLimiter, FixedWindowRateLimiter, createRateLimiter, RateLimitConfig } from '../slidingWindow';

const expect = (actual: any) => ({
    toBe: (expected: any) => assert.equal(actual, expected),
    toBeTruthy: () => assert.ok(actual),
    toBeFalsy: () => assert.ok(!actual),
    toBeDefined: () => assert.notEqual(actual, undefined),
    toEqual: (expected: any) => assert.deepEqual(actual, expected),
    toBeGreaterThan: (n: number) => assert.ok(actual > n),
    toBeLessThanOrEqual: (n: number) => assert.ok(actual <= n),
    toBeInstanceOf: (ctor: any) => assert.ok(actual instanceof ctor),
    get not() {
        return {
            toBe: (expected: any) => assert.notEqual(actual, expected),
            toEqual: (expected: any) => assert.notDeepEqual(actual, expected)
        };
    }
});

describe('SlidingWindowRateLimiter', () => {
    let limiter: SlidingWindowRateLimiter;

    beforeEach(() => {
        limiter = new SlidingWindowRateLimiter({
            maxRequests: 5,
            windowMs: 1000 // 1 second
        });
    });

    afterEach(() => {
        limiter.destroy();
    });

    describe('Basic Rate Limiting', () => {
        it('should allow requests within limit', () => {
            for (let i = 0; i < 5; i++) {
                const result = limiter.check('user1');
                expect(result.allowed).toBe(true);
                expect(result.remaining).toBe(5 - i - 1);
            }
        });

        it('should block requests exceeding limit', () => {
            // Fill up the limit
            for (let i = 0; i < 5; i++) {
                limiter.check('user1');
            }

            // Next request should be blocked
            const result = limiter.check('user1');
            expect(result.allowed).toBe(false);
            expect(result.remaining).toBe(0);
            expect(result.retryAfter).toBeDefined();
        });

        it('should track different keys separately', () => {
            limiter.check('user1');
            limiter.check('user1');
            limiter.check('user2');

            const result1 = limiter.check('user1');
            const result2 = limiter.check('user2');

            expect(result1.remaining).toBe(2); // 5 - 3 = 2
            expect(result2.remaining).toBe(3); // 5 - 2 = 3
        });
    });

    describe('Window Reset', () => {
        it('should reset specific key', () => {
            limiter.check('user1');
            limiter.check('user1');
            
            limiter.reset('user1');
            
            const result = limiter.check('user1');
            expect(result.remaining).toBe(4);
        });

        it('should reset all keys', () => {
            limiter.check('user1');
            limiter.check('user2');
            
            limiter.resetAll();
            
            expect(limiter.check('user1').remaining).toBe(4);
            expect(limiter.check('user2').remaining).toBe(4);
        });
    });

    describe('Remaining Quota', () => {
        it('should return correct remaining quota', () => {
            expect(limiter.getRemaining('user1')).toBe(5);
            
            limiter.check('user1');
            expect(limiter.getRemaining('user1')).toBe(4);
        });

        it('should return max requests for non-existent key', () => {
            expect(limiter.getRemaining('newuser')).toBe(5);
        });
    });

    describe('Reset Time', () => {
        it('should return correct reset time', () => {
            const result = limiter.check('user1');
            expect(result.resetAt).toBeGreaterThan(Date.now());
            expect(result.resetAt).toBeLessThanOrEqual(Date.now() + 1000);
        });
    });
});

describe('FixedWindowRateLimiter', () => {
    let limiter: FixedWindowRateLimiter;

    beforeEach(() => {
        limiter = new FixedWindowRateLimiter({
            maxRequests: 5,
            windowMs: 1000
        });
    });

    describe('Basic Rate Limiting', () => {
        it('should allow requests within limit', () => {
            for (let i = 0; i < 5; i++) {
                const result = limiter.check('user1');
                expect(result.allowed).toBe(true);
            }
        });

        it('should block requests exceeding limit', () => {
            for (let i = 0; i < 5; i++) {
                limiter.check('user1');
            }

            const result = limiter.check('user1');
            expect(result.allowed).toBe(false);
            expect(result.remaining).toBe(0);
        });
    });

    describe('Window Behavior', () => {
        it('should reset at window boundary', async () => {
            // Fill the window
            for (let i = 0; i < 5; i++) {
                limiter.check('user1');
            }

            // Blocked
            expect(limiter.check('user1').allowed).toBe(false);

            // Wait for window to pass
            await new Promise(resolve => setTimeout(resolve, 1100));

            // Should be allowed again
            const result = limiter.check('user1');
            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(4);
        });
    });
});

describe('Rate Limit Service', () => {
    // Mock NextRequest
    const createMockRequest = (ip: string, pathname: string): any => ({
        headers: {
            get: (header: string) => {
                if (header === 'x-forwarded-for') return ip;
                if (header === 'x-real-ip') return null;
                return null;
            }
        },
        ip: ip,
        nextUrl: { pathname }
    });

    let rateLimitService: any;

    before(async () => {
        // Dynamically import to avoid issues with NextRequest
        const imported = await import('../rateLimitService');
        rateLimitService = imported.RateLimitService;
    });

    describe('Client IP Detection', () => {
        it('should extract IP from x-forwarded-for', () => {
            const request = createMockRequest('192.168.1.1, 10.0.0.1', '/api/test');
            const ip = rateLimitService.getClientIP(request);
            expect(ip).toBe('192.168.1.1');
        });

        it('should fallback to request.ip', () => {
            const request = createMockRequest(undefined as any, '/api/test');
            const ip = rateLimitService.getClientIP(request);
            expect(ip).toBe('unknown');
        });
    });

    describe('429 Response Creation', () => {
        it('should create proper 429 response', () => {
            const service = new rateLimitService();
            const result = {
                remaining: 0,
                resetAt: Date.now() + 60000,
                retryAfter: 60
            };

            const response = service.createTooManyRequestsResponse(result);
            
            expect(response.status).toBe(429);
            expect(response.headers.get('Retry-After')).toBe('60');
            expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
        });
    });
});

describe('Factory Functions', () => {
    it('should create sliding window limiter', () => {
        const config: RateLimitConfig = {
            maxRequests: 10,
            windowMs: 60000,
            mode: 'sliding'
        };
        
        const limiter = createRateLimiter(config);
        expect(limiter).toBeInstanceOf(SlidingWindowRateLimiter);
        limiter.destroy();
    });

    it('should create fixed window limiter', () => {
        const config: RateLimitConfig = {
            maxRequests: 10,
            windowMs: 60000,
            mode: 'fixed'
        };
        
        const limiter = createRateLimiter(config);
        expect(limiter).toBeInstanceOf(FixedWindowRateLimiter);
        limiter.destroy();
    });
});
