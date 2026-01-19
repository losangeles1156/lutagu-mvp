type Bucket = {
    tokens: number;
    updatedAtMs: number;
};

const buckets = new Map<string, Bucket>();

function enabled() {
    return process.env.RATE_LIMIT_ENABLED !== 'false';
}

export function rateLimit(params: {
    key: string;
    capacity: number;
    refillPerSecond: number;
}) {
    if (!enabled()) return { allowed: true, remaining: Number.POSITIVE_INFINITY, retryAfterSec: 0 };

    const now = Date.now();
    const bucket = buckets.get(params.key) || { tokens: params.capacity, updatedAtMs: now };
    const elapsedSec = Math.max(0, (now - bucket.updatedAtMs) / 1000);
    const refill = elapsedSec * params.refillPerSecond;
    const tokens = Math.min(params.capacity, bucket.tokens + refill);

    const allowed = tokens >= 1;
    const nextTokens = allowed ? tokens - 1 : tokens;
    const remaining = Math.floor(nextTokens);
    const retryAfterSec = allowed ? 0 : Math.ceil((1 - tokens) / params.refillPerSecond);

    buckets.set(params.key, { tokens: nextTokens, updatedAtMs: now });
    return { allowed, remaining, retryAfterSec };
}
