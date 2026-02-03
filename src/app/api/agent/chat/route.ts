
import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { HybridEngine, type RequestContext } from '@/lib/l4/HybridEngine';
import { StrategyEngine } from '@/lib/ai/strategyEngine';
import { extractOdptStationIds } from '@/lib/l4/assistantEngine';

export const runtime = 'nodejs';

const hybridEngine = new HybridEngine();

export async function POST(req: NextRequest) {
    const rawBody = await req.text();
    let body: any = {};
    try {
        body = rawBody ? JSON.parse(rawBody) : {};
    } catch {
        body = {};
    }

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

    if (!body?.text) {
        const lastMessage = Array.isArray(body?.messages)
            ? body.messages[body.messages.length - 1]
            : null;
        const inferredText = extractText(lastMessage?.content ?? lastMessage?.parts ?? lastMessage?.text ?? lastMessage);
        if (inferredText) body.text = inferredText;
    }

    const locale = typeof body?.locale === 'string' ? body.locale : 'zh-TW';
    const fallbackMessage = locale.startsWith('ja')
        ? 'すみません、現在AIサービスに接続できません。少し後で再試行してください。'
        : locale.startsWith('en')
            ? 'Sorry, the AI service is temporarily unavailable. Please try again shortly.'
            : '抱歉，目前無法連接 AI 服務，請稍後再試。';

    const chatApiUrl = process.env.CHAT_API_URL;
    if (chatApiUrl) {
        console.log(`[Chat Proxy] Routing to upstream: ${chatApiUrl}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout for AI response
        try {
            const upstreamRes = await fetch(`${chatApiUrl}/agent/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
                signal: controller.signal
            });

            if (upstreamRes.ok && upstreamRes.body) {
                return new Response(upstreamRes.body, {
                    headers: {
                        'Content-Type': 'text/plain; charset=utf-8',
                        'Cache-Control': 'no-cache, no-transform',
                        'X-Accel-Buffering': 'no',
                        'X-Agent-Backend': 'v1'
                    }
                });
            }
        } catch (error) {
            console.error('[Chat Proxy] Upstream Exception:', error);
        } finally {
            clearTimeout(timeoutId);
        }
    } else {
        console.error('[Chat Proxy] Missing CHAT_API_URL');
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            const sendUpdate = (delta: string) => {
                if (!delta) return;
                controller.enqueue(encoder.encode(delta));
            };
            const sendThinking = (step: string) => {
                sendUpdate(`[THINKING]${step}[/THINKING]\n`);
            };

            try {
                const lastMessage = Array.isArray(body.messages)
                    ? body.messages[body.messages.length - 1]
                    : null;
                const query =
                    extractText(body.text) ||
                    extractText(body.input) ||
                    extractText(body.prompt) ||
                    extractText(body.message) ||
                    extractText(lastMessage?.content ?? lastMessage?.parts ?? lastMessage?.text ?? lastMessage) ||
                    'Hello';

                const rawNodeId = body.nodeId || body.current_station || body.currentStation || body.stationId;
                const userId = body.userId || `anon-${randomUUID()}`;

                console.log(`[Chat API] Query: "${query}", Node: ${rawNodeId}, Locale: ${locale}`);

                const recentMessages = Array.isArray(body.messages)
                    ? body.messages
                        .map((m: any) => {
                            const role = m?.role === 'assistant' ? 'assistant' : 'user';
                            const content = extractText(m?.content ?? m?.parts ?? m?.text ?? m);
                            return content ? { role, content } : null;
                        })
                        .filter(Boolean)
                        .slice(-8)
                    : [];

                const recentText = recentMessages.map((m: any) => m?.content || '').join(' ');
                const inferredStations = extractOdptStationIds(`${query} ${recentText}`);
                const inferredStationId = inferredStations.length > 0 ? inferredStations[inferredStations.length - 1] : undefined;
                const nodeId = rawNodeId || inferredStationId;

                const context: RequestContext = {
                    userId,
                    currentStation: nodeId,
                    userLocation: body.userLocation,
                    preferences: { categories: [] },
                    strategyContext: null
                };

                if (!context.strategyContext && context.userLocation) {
                    try {
                        context.strategyContext = await StrategyEngine.getSynthesis(
                            context.userLocation.lat,
                            context.userLocation.lng,
                            locale
                        );
                    } catch (error) {
                        console.error('[Chat Local] Strategy init failed:', error);
                    }
                }

                const trimmedQuery = String(query || '').trim();
                if (!trimmedQuery) {
                    const msg = locale === 'en' ? 'Please enter your question again.' : '請重新輸入問題。';
                    sendUpdate(msg);
                    controller.close();
                    return;
                }

                sendThinking(locale === 'en' ? 'Thinking...' : '思考中...');

                let streamedAnyToken = false;
                const result = await hybridEngine.processRequest({
                    text: trimmedQuery,
                    locale,
                    context,
                    onProgress: (step) => sendThinking(step),
                    onToken: (delta) => {
                        streamedAnyToken = true;
                        sendUpdate(delta);
                    }
                });

                if (result) {
                    console.log(`[Chat API] Processing success: ${result.source}`);
                    if (!streamedAnyToken && result.content) {
                        sendUpdate(result.content);
                    }

                    // Phase 5: Agentic Data Tunneling
                    if (result.data || result.type !== 'text') {
                        const payload = {
                            type: result.type,
                            source: result.source,
                            data: result.data
                        };
                        sendUpdate(`\n[HYBRID_DATA]${JSON.stringify(payload)}[/HYBRID_DATA]`);
                    }
                } else {
                    console.warn(`[Chat API] Processing returned null for query: "${trimmedQuery}"`);
                    const msg = locale === 'en' ? "I'm not sure, could you clarify?" : '抱歉，我不太理解您的意思。';
                    sendUpdate(msg);
                }
            } catch (error) {
                console.error('[Chat API] Critical Exception:', error);
                // DEBUG: Send actual error to client for diagnosis
                const debugErrorMessage = `[CRITICAL ERROR] ${(error as any)?.message || String(error)}\n${(error as any)?.stack || ''}`;
                sendUpdate(debugErrorMessage + '\n\n' + fallbackMessage);
            } finally {
                console.log('[Chat API] Connection closing');
                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            'X-Accel-Buffering': 'no',
            'X-Agent-Backend': 'v1'
        }
    });
}
