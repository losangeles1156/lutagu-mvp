/**
 * L2 Cache Service - Redis/Memory hybrid caching for L2 Status
 * 
 * Reduces ODPT API calls by caching L2 status data.
 * Refactored to use generic Redis Cache Service.
 */

import { getCached, invalidateCache } from './redisCacheService';

/**
 * Get L2 Status with caching (TTL: 60s)
 * Uses shared redisCacheService (Memory -> Redis -> Fetch)
 */
export async function getL2StatusCached(nodeId: string): Promise<any | null> {
    const cacheKey = `l2:status:${nodeId}`;

    return getCached(
        cacheKey,
        () => fetchL2StatusFresh(nodeId),
        30 // 30 seconds TTL (reduced from 60s for Phase 1 fix)
    );
}

/**
 * Fetch fresh L2 status from Rust service or ODPT
 */
async function fetchL2StatusFresh(nodeId: string): Promise<any | null> {
    // Try Rust L2 service first
    const rustServiceUrl = process.env.RUST_L2_SERVICE_URL;
    if (rustServiceUrl) {
        try {
            const res = await fetch(`${rustServiceUrl}/status/${nodeId}`, {
                signal: AbortSignal.timeout(3000)
            });
            if (res.ok) {
                return await res.json();
            }
        } catch (e) {
            // Fall through to alternative
        }
    }

    // Fallback: Use internal API
    try {
        const { fetchL2Status } = await import('@/lib/api/rustServices');
        return await fetchL2Status(nodeId);
    } catch (e) {
        console.warn('[L2Cache] rustServices import failed:', e);
        return null;
    }
}

/**
 * Invalidate cache for a specific node
 */
export async function invalidateL2Cache(nodeId: string): Promise<void> {
    await invalidateCache(`l2:status:${nodeId}`);
}

/**
 * Warm cache for multiple nodes (batch prefetch)
 */
export async function warmL2Cache(nodeIds: string[]): Promise<void> {
    const promises = nodeIds.slice(0, 20).map(id => getL2StatusCached(id));
    await Promise.allSettled(promises);
}
