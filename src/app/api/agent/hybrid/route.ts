
import { NextRequest, NextResponse } from 'next/server';
import { hybridEngine } from '@/lib/l4/HybridEngine';
import { StrategyEngine } from '@/lib/ai/strategyEngine';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { text, locale = 'zh-TW', userLocation, context } = body;

        // 1. Get Strategy Synthesis (L4) - mimicking prod flow for context
        let strategyContext = null;
        if (userLocation?.lat && userLocation?.lon) {
            strategyContext = await StrategyEngine.getSynthesis(userLocation.lat, userLocation.lon, locale);
        }

        // 2. Hybrid Engine Execution
        const hybridMatch = await hybridEngine.processRequest({
            text,
            locale,
            context: {
                ...context,
                userLocation: userLocation?.lat ? { lat: userLocation.lat, lng: userLocation.lon } : undefined,
                currentStation: strategyContext?.nodeId
            }
        });

        // 3. Return structured response with Audit Info

        let finalResult = hybridMatch;
        let modelUsed: string | undefined = hybridMatch?.source;

        // Fallback: If HybridEngine returned null, use MiniMax (Reasoning Brain)
        if (!hybridMatch) {
            const { generateLLMResponse } = await import('@/lib/ai/llmClient');
            const reasoningContent = await generateLLMResponse({
                systemPrompt: `你是 BambiGO 的智慧交通助手 (Reasoning Brain)。
你的任務是處理複雜的行程規劃或邏輯推理問題。
請使用繁體中文(台灣)回答。
上下文資訊: ${JSON.stringify({
                    userLocation,
                    strategy_context: strategyContext
                })}`,
                userPrompt: text,
                taskType: 'reasoning', // Triggers MiniMax
                temperature: 0.4
            });

            if (reasoningContent) {
                finalResult = {
                    source: 'llm',
                    type: 'text',
                    content: reasoningContent,
                    confidence: 0.8,
                    reasoning: 'MiniMax Reasoning Fallback'
                };
                modelUsed = 'minimax-m2.1';
            }
        }

        return NextResponse.json({
            success: true,
            result: finalResult,
            // Audit/Debug Info
            audit: {
                model_used: modelUsed || 'mistral_fallback',
                strategy_context: strategyContext ? 'enriched' : 'none',
                node_id: strategyContext?.nodeId
            }
        });

    } catch (err: any) {
        console.error('[API/Hybrid] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
