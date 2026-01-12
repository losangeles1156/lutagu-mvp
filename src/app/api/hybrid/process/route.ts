import { NextRequest, NextResponse } from 'next/server';
import { hybridEngine } from '@/lib/l4/HybridEngine';
import { StrategyEngine } from '@/lib/ai/strategyEngine';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { text, locale, context } = body;

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        let enrichedContext = context || {};

        // L4/L5 Implicit Context Injection
        // If we have location but no strategy context, synthesize it server-side
        if (enrichedContext.userLocation && !enrichedContext.strategyContext) {
            try {
                const { lat, lng } = enrichedContext.userLocation;
                // Default to 'zh-TW' if locale is not provided or simple 'zh'
                const targetLocale = locale || 'zh-TW';

                const synthesis = await StrategyEngine.getSynthesis(lat, lng, targetLocale);
                if (synthesis) {
                    enrichedContext.strategyContext = synthesis;
                    console.log(`[API Hybrid] Synthesized StrategyContext for node: ${synthesis.nodeName} (${synthesis.nodeId})`);
                }
            } catch (error) {
                console.warn('[API Hybrid] Failed to synthesize strategy context:', error);
                // Continue without strategy context
            }
        }

        const result = await hybridEngine.processRequest({
            text,
            locale: locale || 'zh-TW',
            context: enrichedContext
        });

        return NextResponse.json({
            success: true,
            result: result || { source: 'llm', confidence: 0 }
        });
    } catch (error) {
        console.error('[API Hybrid] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
