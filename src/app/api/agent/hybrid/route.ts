import { NextRequest, NextResponse } from 'next/server';
import { hybridEngine } from '@/lib/l4/HybridEngine';

export const runtime = 'nodejs'; // Valid for using ioredis/fs

// Fast timeout for HybridEngine - if it takes too long, pass to LLM
const HYBRID_TIMEOUT_MS = 2000; // 2 seconds max

/**
 * HybridEngine API - Fast Path for Level 1/2 queries
 *
 * Performance targets:
 * - Level 1 (Template): < 50ms
 * - Level 2 (Algorithm): < 200ms
 * - Timeout: 2s (then pass to LLM)
 */
export async function POST(req: NextRequest) {
    const startTime = Date.now();

    try {
        const body = await req.json();
        const { text, locale, context } = body;

        if (!text) {
            return NextResponse.json({ passToLLM: true, reason: 'empty_text' });
        }

        // Race between HybridEngine and timeout
        const timeoutPromise = new Promise<null>((resolve) => {
            setTimeout(() => resolve(null), HYBRID_TIMEOUT_MS);
        });

        const result = await Promise.race([
            hybridEngine.processRequest({ text, locale, context }),
            timeoutPromise
        ]);

        const latency = Date.now() - startTime;

        // Timeout or no match - pass to LLM
        if (!result) {
            console.log(`[API/Hybrid] Timeout or no match (${latency}ms) -> passToLLM`);
            return NextResponse.json({
                passToLLM: true,
                reason: latency >= HYBRID_TIMEOUT_MS ? 'timeout' : 'no_match',
                latency
            });
        }

        console.log(`[API/Hybrid] Fast path success: ${result.source} (${latency}ms)`);
        return NextResponse.json({
            ...result,
            latency,
            _hybridPath: true
        });

    } catch (err: any) {
        const latency = Date.now() - startTime;
        console.error(`[API/Hybrid] Error (${latency}ms):`, err.message);

        // On error, gracefully pass to LLM instead of failing
        return NextResponse.json({
            passToLLM: true,
            reason: 'error',
            error: err.message,
            latency
        });
    }
}
