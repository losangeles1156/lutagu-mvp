
import { NextRequest, NextResponse } from 'next/server';
import { hybridEngine } from '@/lib/l4/HybridEngine';
import { StrategyEngine } from '@/lib/ai/strategyEngine';
import { prepareDecision } from '@/lib/agent/decision/DecisionOrchestrator';
import { decisionMetrics } from '@/lib/agent/decision/DecisionMetrics';
import { buildScenarioPreview } from '@/lib/agent/decision/scenarioPreview';
import type { SupportedLocale } from '@/lib/l4/assistantEngine';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { text, locale = 'zh-TW', userLocation, context } = body;

        // 1. Determine Context Priority
        // GPS (StrategyEngine) is a guess; Frontend (nodeId) is explicit.
        let strategyContext = null;
        if (userLocation?.lat && userLocation?.lon) {
            strategyContext = await StrategyEngine.getSynthesis(userLocation.lat, userLocation.lon, locale);
        }

        const effectiveNodeId = body.nodeId || body.current_station || strategyContext?.nodeId;
        const effectiveStationName = body.stationName || strategyContext?.nodeName;

        const decision = await prepareDecision({
            text,
            locale: locale as SupportedLocale,
            currentStation: effectiveNodeId
        });
        decisionMetrics.recordIntent(decision.intent.intent);

        // 2. Hybrid Engine Execution
        const hybridMatch = await hybridEngine.processRequest({
            text,
            locale,
            context: {
                ...context,
                userLocation: userLocation?.lat ? { lat: userLocation.lat, lng: userLocation.lon } : undefined,
                currentStation: effectiveNodeId,
                nodeContext: decision.context.nodeContext,
                relayText: decision.context.relay.relayText,
                tagsContext: decision.context.tags_context,
                scenarioPreview: buildScenarioPreview({
                    intent: decision.intent,
                    toolResults: [],
                    locale
                }).preview,
                decisionTrace: {
                    intent: decision.intent,
                    relay: decision.context.relay,
                    requiredTools: decision.requiredTools,
                    toolCalls: [],
                    scenarioPreview: buildScenarioPreview({
                        intent: decision.intent,
                        toolResults: [],
                        locale
                    }).preview,
                    warnings: []
                }
            }
        });
        decisionMetrics.recordAdequacy(Boolean(hybridMatch));

        // 3. MiniMax Fallback with strict Anomaly Instruction
        let finalResult = hybridMatch;
        let modelUsed: string | undefined = hybridMatch?.source;

        if (!hybridMatch) {
            const { generateLLMResponse } = await import('@/lib/ai/llmClient');
            const reasoningContent = await generateLLMResponse({
                systemPrompt: `Role:
你是 **LUTAGU** (鹿引)，一位住在東京、熱心又專業的「在地好友」。

# 核心使命 (Priority)
你會收到當前車站資訊：【${effectiveStationName || '未知車站'}】(ID: ${effectiveNodeId || '無'})。
1. **地點優先**：優先處理此車站相關的交通、轉乘或周邊資訊。
2. **異常報警**：如果有效車站 ID 為「無」或「未知」，代表系統偵測不到使用者所在的地點節點。此時，請在回覆中禮貌提醒：「系統目前偵測不到您所在的車站位置，但我仍會盡力就您提到的地點提供資訊。」
3. **資訊完整度**：如果該車站沒有任何 L4 專家建議，請誠實告知，並根據您的東京在地知識給予通用建議。

# 絕對禁令
1. **禁止使用 Markdown 粗體**。
2. **禁止列出多個方案**：一次只給一個「最推薦」的方案。
3. **禁止超過 3 句話**。

# 🎯 回覆風格
- 親切、溫暖、像在 LINE 聊天。
- 使用 Emoji (✨, 🦌, 💡)。

上下文補充: ${JSON.stringify({
                    userLocation,
                    station_id: effectiveNodeId,
                    strategy_context: strategyContext
                })}`,
                userPrompt: text,
                taskType: 'reasoning', // MiniMax
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
            audit: {
                model_used: modelUsed || 'mistral_fallback',
                effective_node: effectiveNodeId,
                found_via: body.nodeId ? 'frontend_id' : (strategyContext ? 'gps' : 'none')
            }
        });

    } catch (err: any) {
        console.error('[API/Hybrid] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
