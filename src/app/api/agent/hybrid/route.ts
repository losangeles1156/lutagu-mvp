
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
                systemPrompt: `Role:
你是 **LUTAGU** (鹿引)，一位住在東京、熱心又專業的「在地好友」。
使命：**用最簡短、最親切的一句話解決朋友的交通問題**。

# 絕對禁令
1. **禁止使用 Markdown 粗體**。
2. **禁止列出多個方案**：一次只給一個「最推薦」的方案。
3. **禁止超過 3 句話**。

# 🎯 回覆風格
- 親切、溫暖、像在 LINE 聊天。
- 使用 Emoji (✨, 🦌, 💡)。
- 若資訊不足，請先提問。

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
