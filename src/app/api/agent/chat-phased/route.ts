
import { NextRequest } from 'next/server';
import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { templateEngine } from '@/lib/l4/intent/TemplateEngine';
import { preDecisionEngine, DecisionLevel } from '@/lib/ai/PreDecisionEngine';
import { StrategyEngine } from '@/lib/ai/strategyEngine';
import { getL2StatusCached } from '@/lib/cache/l2CacheService';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Configure Zeabur / OpenAI compatible provider for Gemini 3 / DeepSeek
const zeabur = createOpenAI({
    baseURL: 'https://hnd1.aihub.zeabur.ai/v1',
    apiKey: process.env.ZEABUR_API_KEY || process.env.GEMINI_API_KEY,
});

interface PhasedRequestBody {
    text: string;
    nodeId?: string;
    locale?: string;
    userId?: string;
    sessionId?: string;
}

type SupportedLocale = 'zh-TW' | 'zh' | 'en' | 'ja';

export async function POST(req: NextRequest) {
    const encoder = new TextEncoder();

    let body: PhasedRequestBody;
    try {
        body = await req.json();
    } catch {
        return new Response('Invalid JSON', { status: 400 });
    }

    const { text, nodeId, locale: inputLocale = 'zh-TW' } = body;
    const locale = (inputLocale || 'zh-TW') as SupportedLocale;

    if (!text?.trim()) {
        return new Response('Missing text', { status: 400 });
    }

    const stream = new ReadableStream({
        async start(controller) {
            // Helper for Vercel AI Data Stream Protocol
            const enqueueText = (content: string) => {
                // 0: Text part
                controller.enqueue(encoder.encode(`0:${JSON.stringify(content)}\n`));
            };

            const enqueueData = (data: any) => {
                // 2: Data part
                controller.enqueue(encoder.encode(`2:${JSON.stringify([data])}\n`));
            };

            try {
                // =====================
                // PHASE 1: Quick Acknowledgment
                // =====================
                const ackMessage = getAcknowledgmentMessage(text, locale);
                enqueueData({ phase: 1, content: ackMessage });
                enqueueText(ackMessage);

                // Simple Template Match
                const templateMatch = templateEngine.match(text, locale);
                if (templateMatch) {
                    enqueueText('\n\n' + templateMatch.content);
                    controller.close();
                    return;
                }

                // Intent classification
                const decision = await preDecisionEngine.classifyIntent(text);

                // =====================
                // PHASE 2: L2 Status
                // =====================
                if (nodeId) {
                    try {
                        const l2Status = await getL2StatusCached(nodeId);
                        if (l2Status && hasL2Issues(l2Status)) {
                            const statusMessage = formatL2StatusMessage(l2Status, locale);
                            enqueueData({ phase: 2, content: statusMessage, data: l2Status });
                            enqueueText('\n\n' + statusMessage);
                        }
                    } catch (e) {
                        console.error('[PhasedAPI] L2 fetch error:', e);
                    }
                }

                if (decision.level === DecisionLevel.LEVEL_1_SIMPLE && templateMatch) {
                    controller.close();
                    return;
                }

                // =====================
                // PHASE 3: L4 LLM Brain (Streaming)
                // =====================
                const thinkingMessage = getThinkingMessage(locale);
                enqueueText(`\n\n[THINKING]${thinkingMessage}[/THINKING]\n`);

                let strategyContext = null;
                if (nodeId) {
                    try {
                        strategyContext = await StrategyEngine.getSynthesisForNodeId(nodeId, locale);
                    } catch (e) {
                        console.error('[PhasedAPI] Strategy context error:', e);
                    }
                }

                const systemPrompt = buildSystemPrompt(locale);
                const userPrompt = buildUserPrompt(text, nodeId, strategyContext);

                try {
                    // Upgrade to Gemini 3 Flash Preview (Gemini 2.0) via Zeabur
                    // matching the system's "High Logic" capability
                    const result = streamText({
                        model: zeabur('gemini-3-flash-preview'),
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: userPrompt }
                        ],
                        temperature: 0.7,
                    });

                    // Pipe the LLM text stream
                    for await (const delta of result.textStream) {
                        enqueueText(delta);
                    }
                } catch (llmError) {
                    console.error('[PhasedAPI] LLM Streaming error:', llmError);
                    enqueueText('\n\n' + getFallbackMessage(locale));
                }

            } catch (error) {
                console.error('[PhasedAPI] Stream error:', error);
                enqueueText('\n\n' + getFallbackMessage(locale));
            } finally {
                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'X-Vercel-AI-Data-Stream': 'v1',
            'Cache-Control': 'no-cache, no-transform',
            'X-Accel-Buffering': 'no',
            'Transfer-Encoding': 'chunked'
        }
    });
}

// Same helper functions...
function getAcknowledgmentMessage(text: string, locale: SupportedLocale): string {
    const messages: Record<SupportedLocale, string> = {
        'zh-TW': '正在查詢中...',
        'zh': '正在查询中...',
        'en': 'Searching...',
        'ja': '検索中...'
    };
    return messages[locale] || messages['zh-TW'];
}

function getThinkingMessage(locale: SupportedLocale): string {
    const messages: Record<SupportedLocale, string> = {
        'zh-TW': '正在分析您的問題...',
        'zh': '正在分析您的问题...',
        'en': 'Analyzing your question...',
        'ja': 'ご質問を分析中...'
    };
    return messages[locale] || messages['zh-TW'];
}

function getFallbackMessage(locale: SupportedLocale): string {
    const messages: Record<SupportedLocale, string> = {
        'zh-TW': '抱歉，目前系統繁忙，請稍後再試。',
        'zh': '抱歉，目前系统繁忙，请稍后再试。',
        'en': 'Sorry, the system is busy. Please try again later.',
        'ja': '申し訳ありません。システムが混み合っています。'
    };
    return messages[locale] || messages['zh-TW'];
}

function hasL2Issues(l2Status: any): boolean {
    if (!l2Status) return false;
    if (l2Status.has_issues) return true;
    if (l2Status.delay > 0 || l2Status.delay_minutes > 0) return true;
    if (l2Status.status_code && l2Status.status_code !== 'NORMAL') return true;
    return false;
}

function formatL2StatusMessage(l2Status: any, locale: SupportedLocale): string {
    const delay = l2Status.delay || l2Status.delay_minutes || 0;
    const cause = l2Status.cause || l2Status.reason_zh || l2Status.reason || '';

    if (locale === 'ja') {
        return delay > 0
            ? `⚠️ 現在約${delay}分の遅延が発生しています${cause ? `（${cause}）` : ''}。`
            : `⚠️ 運行に乱れが発生しています${cause ? `（${cause}）` : ''}。`;
    }
    if (locale === 'en') {
        return delay > 0
            ? `⚠️ Currently experiencing ~${delay} min delay${cause ? ` (${cause})` : ''}.`
            : `⚠️ Service disruption detected${cause ? ` (${cause})` : ''}.`;
    }
    // zh-TW / zh
    return delay > 0
        ? `⚠️ 目前延誤約 ${delay} 分鐘${cause ? `（${cause}）` : ''}。`
        : `⚠️ 目前有運行異常${cause ? `（${cause}）` : ''}。`;
}

function buildSystemPrompt(locale: SupportedLocale): string {
    const prompts: Record<SupportedLocale, string> = {
        'zh-TW': `你是 LUTAGU，一位住在東京的在地好友。用溫暖、口語的方式提供交通建議。回覆不超過3句話。`,
        'zh': `你是 LUTAGU，一位住在东京的在地好友。用温暖、口语的方式提供交通建议。回复不超过3句话。`,
        'en': `You are LUTAGU, a local friend in Tokyo. Provide transit advice in a warm, conversational tone. Max 3 sentences.`,
        'ja': `あなたは LUTAGU、東京在住の地元の友達です。温かく親しみやすい口調で交通アドバイスを提供してください。3文以内で回答。`
    };
    return prompts[locale] || prompts['zh-TW'];
}

function buildUserPrompt(query: string, nodeId?: string | null, strategyContext?: any): string {
    let prompt = `User Query: ${query}\n`;
    if (nodeId) prompt += `Current Station ID: ${nodeId}\n`;
    if (strategyContext?.nodeName) prompt += `Station Name: ${strategyContext.nodeName}\n`;
    if (strategyContext?.l2Status) {
        const l2 = strategyContext.l2Status;
        if (l2.delay > 0) prompt += `Live Delay: ${l2.delay} minutes\n`;
    }
    if (strategyContext?.wisdomSummary) {
        prompt += `Local Knowledge: ${strategyContext.wisdomSummary}\n`;
    }
    return prompt;
}
