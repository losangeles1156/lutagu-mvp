
import { NextRequest } from 'next/server';
import { createUIMessageStream, createUIMessageStreamResponse } from 'ai';
import { hybridEngine, RequestContext } from '@/lib/l4/HybridEngine';
import { generateRequestId, getElapsedMs, logAIChatMetric, logPerformanceMetric } from '@/lib/monitoring/performanceLogger';
import { StrategyEngine } from '@/lib/ai/strategyEngine';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * Chat API - Agentic Streaming Endpoint
 *
 * Calls HybridEngine (AgentRouter > Regex) and streams the response
 * in a format compatible with the Frontend (useAgentChat).
 */
export async function POST(req: NextRequest) {
    try {
        const requestId = generateRequestId();
        const startedAt = Date.now();
        // Environment check (for debugging Vercel deployment issues)
        const hasApiKey = !!(
            process.env.ZEABUR_API_KEY ||
            process.env.GEMINI_API_KEY ||
            process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
            process.env.MINIMAX_API_KEY ||
            process.env.DEEPSEEK_API_KEY
        );

        if (!hasApiKey) {
            console.error('[Chat API] Missing API keys - check Vercel environment variables');
            return new Response(JSON.stringify({
                error: 'Service temporarily unavailable - missing configuration',
                code: 'MISSING_API_KEY'
            }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const body = await req.json();

        const extractText = (value: any): string => {
            if (!value) return '';
            if (typeof value === 'string') return value;
            if (Array.isArray(value)) {
                return value
                    .map((part) => {
                        if (!part) return '';
                        if (typeof part === 'string') return part;
                        if (typeof part?.text === 'string') return part.text;
                        if (typeof part?.content === 'string') return part.content;
                        if (Array.isArray(part?.content)) return extractText(part.content);
                        return '';
                    })
                    .join('')
                    .trim();
            }
            if (typeof value?.text === 'string') return value.text;
            if (typeof value?.content === 'string') return value.content;
            if (Array.isArray(value?.content)) return extractText(value.content);
            return '';
        };

        const extractQuery = (payload: any): string => {
            const directText = extractText(payload?.text) || extractText(payload?.input) || extractText(payload?.query) || extractText(payload?.prompt);
            if (directText) return directText;

            const messages = Array.isArray(payload?.messages) ? payload.messages : [];
            const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
            const lastContent = extractText(lastMessage?.content) || extractText(lastMessage?.parts);
            if (lastContent) return lastContent;

            const nestedMessage = payload?.message;
            return extractText(nestedMessage?.content) || extractText(nestedMessage?.parts);
        };

        // 1. Parse Request
        const query = extractQuery(body);
        const locale = body.locale || 'zh-TW';

        if (!query) {
            return new Response('No query provided', { status: 400 });
        }

        const nodeId = body.nodeId || body.current_station || body.currentStation || body.stationId;

        // 2. Build Context
        const context: RequestContext = {
            userId: body.userId || 'anon',
            currentStation: nodeId,
            userLocation: body.userLocation,
            preferences: {
                categories: []
            },
            strategyContext: null
        };

        if (!context.strategyContext) {
            try {
                if (typeof nodeId === 'string' && nodeId.trim()) {
                    context.strategyContext = await StrategyEngine.getSynthesisForNodeId(nodeId.trim(), locale);
                } else if (context.userLocation) {
                    context.strategyContext = await StrategyEngine.getSynthesis(context.userLocation.lat, context.userLocation.lng, locale);
                }
            } catch (_e) {
                context.strategyContext = null;
            }
        }

        const stream = createUIMessageStream({
            execute: async ({ writer }) => {
                const textId = 'text-1';
                let outputLen = 0;
                let streamedAny = false;
                let hadError = false;
                let errorMessage: string | undefined;

                const sendUpdate = (delta: string) => {
                    writer.write({ type: 'text-delta', id: textId, delta });
                    outputLen += delta.length;
                };

                const sendThinking = (step: string) => {
                    sendUpdate(`[THINKING]${step}[/THINKING]\n`);
                };

                writer.write({ type: 'text-start', id: textId });

                try {
                    sendThinking(locale === 'en' ? 'Thinking...' : '思考中...');

                    const result = await hybridEngine.processRequest({
                        text: query,
                        locale,
                        context,
                        onProgress: (step) => {
                            sendThinking(step);
                        },
                        onToken: (delta) => {
                            streamedAny = true;
                            sendUpdate(delta);
                        }
                    });

                    if (result) {
                        if (result.reasoning) {
                            sendUpdate(`[THINKING]${result.reasoning}[/THINKING]\n`);
                        }

                        if (!streamedAny) {
                            sendUpdate(result.content);
                        }
                    } else {
                        sendUpdate(locale === 'en' ? "I'm not sure, could you clarify?" : '抱歉，我不太理解您的意思。');
                    }
                } catch (error: any) {
                    console.error('[Chat API] Processing Error:', error);
                    hadError = true;
                    errorMessage = typeof error?.message === 'string' ? error.message : String(error);
                    const isTimeout = error.name === 'AbortError' || error.message?.includes('aborted') || error.message?.includes('timeout');
                    const isRateLimit = error.status === 429 || error.message?.includes('429') || error.message?.includes('rate limit');
                    const isNetworkError = error.message?.includes('fetch failed') || error.message?.includes('ECONNREFUSED') || error.message?.includes('network');

                    let errorMsg = '';
                    if (isTimeout) {
                        errorMsg = locale === 'en'
                            ? 'Request timed out. Please try a simpler question or try again later.'
                            : '請求逾時。請嘗試更簡單的問題或稍後再試。';
                    } else if (isRateLimit) {
                        errorMsg = locale === 'en'
                            ? 'Too many requests. Please wait a moment and try again.'
                            : '請求過於頻繁。請稍候片刻後再試。';
                    } else if (isNetworkError) {
                        errorMsg = locale === 'en'
                            ? 'Network connection error. Please check your internet connection.'
                            : '網路連線錯誤。請檢查您的網路連線。';
                    } else {
                        errorMsg = locale === 'en'
                            ? `Service temporarily unavailable. Please try again later.`
                            : `服務暫時無法使用。請稍後再試。`;
                    }

                    sendUpdate(errorMsg);
                } finally {
                    writer.write({ type: 'text-end', id: textId });

                    const elapsed = getElapsedMs(startedAt);
                    logAIChatMetric({
                        requestId,
                        sessionId: body.userId || body.sessionId,
                        nodeId: body.nodeId || body.current_station,
                        locale,
                        responseTimeMs: elapsed,
                        toolsCalled: [],
                        inputLength: query.length,
                        outputLength: outputLen,
                        hadError,
                        errorMessage,
                        metadata: { streamed: true }
                    });
                    logPerformanceMetric({
                        requestId,
                        endpoint: '/api/agent/chat',
                        method: 'POST',
                        responseTimeMs: elapsed,
                        statusCode: hadError ? 500 : 200,
                        userAgent: req.headers.get('user-agent') || undefined,
                        locale,
                        metadata: { streamed: true }
                    });
                }
            }
        });

        return createUIMessageStreamResponse({
            stream,
        });

    } catch (error: any) {
        console.error('[Chat API] Fatal Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
