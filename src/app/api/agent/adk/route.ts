import { NextRequest, NextResponse } from 'next/server';
import { recordAdkObservation } from '@/lib/agent/healthState';

const ADK_SERVICE_URL = process.env.ADK_SERVICE_URL;

// Node.js runtime for better logging in dev
export const runtime = 'nodejs';

type AdkLayer = 'proxy' | 'upstream-network' | 'upstream-http' | 'upstream-stream' | 'upstream-model' | 'upstream-tool' | 'unknown';

type StreamMetrics = {
    toolTraceCount: number;
    decisionTraceCount: number;
    errorEventCount: number;
    busyDetected: boolean;
    busyReason: string;
};

type AdkObservation = {
    status: 'ok' | 'degraded' | 'failed';
    layer: AdkLayer;
    reason: string;
    httpStatus?: number;
    latencyMs?: number;
};

function newRequestId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `adk-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createStreamMetrics(): StreamMetrics {
    return {
        toolTraceCount: 0,
        decisionTraceCount: 0,
        errorEventCount: 0,
        busyDetected: false,
        busyReason: ''
    };
}

function normalizeAdkEndpoint(raw: string | undefined): string | null {
    const value = typeof raw === 'string' ? raw.trim() : '';
    if (!value) return null;

    let parsed: URL;
    try {
        parsed = new URL(value);
    } catch {
        return null;
    }

    if (!parsed.pathname || parsed.pathname === '/') {
        parsed.pathname = '/api/chat';
    }
    return parsed.toString();
}

function detectBusy(content: string): { isBusy: boolean; reason: string } {
    const normalized = content.toLowerCase();
    const patterns: Array<{ rx: RegExp; reason: string }> = [
        { rx: /混み合|\\bbusy\\b|later|稍後再|請稍後|拥挤|繁忙/, reason: 'busy_message' },
        { rx: /timeout|timed out|超時|逾時/, reason: 'timeout_message' },
        { rx: /model unavailable|provider unavailable|model.*failed/, reason: 'model_unavailable' },
        { rx: /工具.*失敗|tool_error/, reason: 'tool_failure_message' }
    ];
    for (const p of patterns) {
        if (p.rx.test(normalized)) return { isBusy: true, reason: p.reason };
    }
    return { isBusy: false, reason: '' };
}

/**
 * Transforms ADK Agent SSE format to Vercel AI SDK text stream format.
 * 
 * ADK Format:
 *   event: meta\ndata: {"status":"thinking"}\n\n
 *   event: telem\ndata: {"content":"Hello"}\n\n
 *   event: done\ndata: {}\n\n
 * 
 * AI SDK Format:
 *   Just plain text chunks, no SSE wrappers
 */
async function* transformAdkStream(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    metrics: StreamMetrics
): AsyncGenerator<string> {
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) {
            console.log('[ADK Proxy] Upstream stream done');
            break;
        }

        const decoded = decoder.decode(value, { stream: true });
        buffer += decoded;

        // Log raw chunks for debugging (truncated for brevity)
        // Log raw chunks for debugging (truncated for brevity)
        // console.log(`[ADK Proxy] Received raw chunk: ${decoded.slice(0, 50)}${decoded.length > 50 ? '...' : ''}`);

        // Process complete SSE events
        // Handle various line ending formats: \n\n, \r\n\r\n, \r\r, mixed
        const events = buffer.split(/(?:\r?\n){2,}|(?:\r){2,}/);
        buffer = events.pop() || '';

        for (const event of events) {
            const trimmedEvent = event.trim();
            if (!trimmedEvent) continue;

            const parsedEvent = extractSseEvent(trimmedEvent);
            if (parsedEvent.eventType === 'tool_trace' && parsedEvent.eventData) {
                metrics.toolTraceCount += 1;
            }
            if (parsedEvent.eventType === 'decision_trace' && parsedEvent.eventData) {
                metrics.decisionTraceCount += 1;
            }
            if (parsedEvent.eventType === 'error' && parsedEvent.eventData) {
                metrics.errorEventCount += 1;
            }
            // Busy detection should only evaluate user-visible content/error events,
            // not internal traces that may include words like "failed".
            if (parsedEvent.eventData && (parsedEvent.eventType === 'telem' || parsedEvent.eventType === 'error' || parsedEvent.eventType === 'meta')) {
                let busyTarget = parsedEvent.eventData;
                if (parsedEvent.eventType === 'telem') {
                    try {
                        const parsed = JSON.parse(parsedEvent.eventData);
                        if (typeof parsed?.content === 'string') {
                            busyTarget = parsed.content;
                        }
                    } catch {
                        // Keep raw eventData when JSON parsing fails.
                    }
                }
                const busy = detectBusy(busyTarget);
                if (busy.isBusy) {
                    metrics.busyDetected = true;
                    metrics.busyReason = busy.reason;
                }
            }

            const chunk = parseSseEvent(parsedEvent.eventType, parsedEvent.eventData);
            if (chunk) {
                console.log(`[ADK Proxy] Processed event -> yielding ${chunk.length} chars`);
                yield chunk;
            }
        }
    }

    // Process any remaining buffer content
    if (buffer.trim()) {
        const parsedEvent = extractSseEvent(buffer);
        const chunk = parseSseEvent(parsedEvent.eventType, parsedEvent.eventData);
        if (chunk) yield chunk;
    }
}

// Fallback when ADK is not configured
function buildFallbackAnswer(input: { text: string; locale?: string }): string {
    const locale = typeof input.locale === 'string' ? input.locale : 'en';
    const errorMessages: Record<string, string> = {
        'en': '⚠️ **System Notice**: The AI service is temporarily unavailable. Please try again shortly.',
        'ja': '⚠️ **システム通知**: AIサービスに一時的に接続できません。しばらくしてから再試行してください。',
        'zh-TW': '⚠️ **系統通知**: AI 服務暫時無法連線，請稍後再試。',
        'zh': '⚠️ **系统通知**: AI 服务暂时无法连接，请稍后再试。',
    };
    return errorMessages[locale] || errorMessages['en'];
}



function createPlainTextStream(chunks: Array<{ text: string; delayMs?: number }>) {
    const encoder = new TextEncoder();
    return new ReadableStream({
        async start(controller) {
            for (const chunk of chunks) {
                if (chunk.delayMs) await new Promise(r => setTimeout(r, chunk.delayMs));
                controller.enqueue(encoder.encode(chunk.text));
            }
            controller.close();
        }
    });
}

/**
 * Helper to parse a single SSE event string.
 */
function extractSseEvent(event: string): { eventType: string; eventData: string } {
    let eventType = '';
    const dataLines: string[] = [];
    const normalized = event.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    for (const line of normalized.split('\n')) {
        if (line.startsWith('event:')) {
            eventType = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
            dataLines.push(line.slice(5).trimStart());
        }
    }

    const eventData = dataLines.join('\n').trim();
    return { eventType, eventData };
}

function parseSseEvent(eventType: string, eventData: string): string | null {

    if (eventType === 'telem' && eventData) {
        try {
            const parsed = JSON.parse(eventData);
            return parsed.content || null;
        } catch {
            return eventData;
        }
    }

    if (eventType === 'meta' && eventData) {
        try {
            const parsed = JSON.parse(eventData);
            if (parsed.status === 'thinking') {
                const message = parsed.message || 'Processing...';
                return `[THINKING]${message}[/THINKING]\n`;
            } else if (parsed.status === 'routing') {
                return null; // Skip routing events for now
            }
        } catch {
            return null;
        }
    }

    if (eventType === 'error' && eventData) {
        return `[ERROR] ${eventData}\n`;
    }

    if (eventType === 'tool_trace' && eventData) {
        return `[TOOL_TRACE]${eventData}[/TOOL_TRACE]\n`;
    }

    if (eventType === 'decision_trace' && eventData) {
        return `[DECISION_TRACE]${eventData}[/DECISION_TRACE]\n`;
    }

    if (eventType === 'structured_data' && eventData) {
        return `[ADK_JSON]${eventData}[/ADK_JSON]\n`;
    }

    return null;
}

export async function POST(req: NextRequest) {
    let rawBody = '';
    const requestStart = Date.now();
    const requestId = req.headers.get('X-Agent-Request-Id') || req.headers.get('x-request-id') || newRequestId();
    let recorded = false;
    const streamMetrics = createStreamMetrics();

    const finalizeObservation = (input: AdkObservation) => {
        if (recorded) return;
        recorded = true;
        const latencyMs = input.latencyMs ?? Date.now() - requestStart;
        recordAdkObservation({
            requestId,
            status: input.status,
            layer: input.layer,
            reason: input.reason,
            httpStatus: input.httpStatus,
            latencyMs,
            busyDetected: streamMetrics.busyDetected,
            toolTraceCount: streamMetrics.toolTraceCount,
            decisionTraceCount: streamMetrics.decisionTraceCount,
            errorEventCount: streamMetrics.errorEventCount
        });
    };

    try {
        rawBody = await req.text();
        console.log('[ADK Proxy] Raw request body:', rawBody);

        if (!rawBody) {
            console.log('[ADK Proxy] Empty request body (Ping)');
            return NextResponse.json({ status: 'ok' }, { status: 200 });
        }

        const body = JSON.parse(rawBody);
        console.log('[ADK Proxy] Parsed request body (summary):', JSON.stringify({ ...body, messages: body.messages?.length }));

        // Backward compatibility: allow { text, locale } request body
        if ((!body.messages || !Array.isArray(body.messages)) && typeof body.text === 'string' && body.text.trim().length > 0) {
            body.messages = [{ role: 'user', content: body.text.trim() }];
        }

        // Sanitize messages for Go backend
        // AI SDK might send 'parts' or other complex structures that Go's string Content can't handle
        if (body.messages && Array.isArray(body.messages)) {
            body.messages = body.messages.map((m: any) => {
                let content = m.content;
                if (Array.isArray(m.parts)) {
                    content = m.parts.map((p: any) => p.text || '').join('');
                }

                // Sanitize content if it's a string
                if (typeof content === 'string') {
                    // Remove [THINKING]...[/THINKING] blocks
                    content = content.replace(/\[THINKING\][\s\S]*?(\[\/THINKING\]|$)/gi, '').trim();
                    content = content.replace(/\[TOOL_TRACE\][\s\S]*?\[\/TOOL_TRACE\]/gi, '').trim();
                    content = content.replace(/\[DECISION_TRACE\][\s\S]*?\[\/DECISION_TRACE\]/gi, '').trim();
                    content = content.replace(/\[ADK_JSON\][\s\S]*?\[\/ADK_JSON\]/gi, '').trim();
                }

                return {
                    role: m.role === 'assistant' ? 'model' : m.role,
                    content: (typeof content === 'string' && content.length > 0) ? content : '(thinking process verified)',
                };
            }).filter((m: any) => m.content.length > 0); // Filter out empty messages

        }

        if (body.messages?.[0]?.content?.includes('MOCK')) {
            const encoder = new TextEncoder();
            const mockStream = new ReadableStream({
                async start(controller) {
                    controller.enqueue(encoder.encode('[THINKING]Mock analysis...[/THINKING]\n'));
                    await new Promise(r => setTimeout(r, 1000));
                    controller.enqueue(encoder.encode('This is a mock response in Japanese: 渋谷への行き方は簡単です。'));
                    controller.close();
                }
            });
            return new Response(mockStream, {
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'X-Agent-Backend': 'adk',
                    'X-Agent-Request-Id': requestId
                }
            });
        }

        const adkEndpoint = normalizeAdkEndpoint(ADK_SERVICE_URL);
        if (!adkEndpoint) {
            const lastUser = Array.isArray(body?.messages)
                ? [...body.messages].reverse().find((m: any) => m?.role === 'user' || m?.role === 'model')
                : null;
            const text = typeof lastUser?.content === 'string' ? lastUser.content : '';
            const answer = buildFallbackAnswer({ text, locale: body?.locale });
            const stream = createPlainTextStream([
                { text: '[THINKING]Local fallback (ADK_SERVICE_URL missing)[/THINKING]\n', delayMs: 50 },
                { text: answer, delayMs: 100 }
            ]);
            return new Response(stream, {
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'X-Agent-Backend': 'adk',
                    'X-Agent-Request-Id': requestId
                }
            });
        }

        // Forward request to Cloud Run
        let upstreamRes: Response;
        let timeoutId: ReturnType<typeof setTimeout> | null = null;
        try {
            const controller = new AbortController();
            // Proxy timeout should be slightly longer than backend (30s > 25s)
            // to allow receiving proper error messages from upstream
            timeoutId = setTimeout(() => controller.abort(), 30000);
            upstreamRes = await fetch(adkEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
                cache: 'no-store',
                signal: controller.signal
            });
        } catch (e) {
            if (timeoutId) clearTimeout(timeoutId);
            const err = e as Error;
            const isTimeout = err?.name === 'AbortError';
            finalizeObservation({
                status: 'failed',
                layer: 'upstream-network',
                reason: isTimeout ? 'upstream_timeout' : 'upstream_fetch_error'
            });
            const lastUser = Array.isArray(body?.messages)
                ? [...body.messages].reverse().find((m: any) => m?.role === 'user' || m?.role === 'model')
                : null;
            const text = typeof lastUser?.content === 'string' ? lastUser.content : '';
            const answer = buildFallbackAnswer({ text, locale: body?.locale });
            const stream = createPlainTextStream([
                { text: '[THINKING]Local fallback (ADK fetch failed)[/THINKING]\n', delayMs: 50 },
                { text: answer, delayMs: 100 }
            ]);
            return new Response(stream, {
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'X-Agent-Backend': 'adk',
                    'X-Agent-Request-Id': requestId
                }
            });
        }
        if (timeoutId) clearTimeout(timeoutId);

        if (!upstreamRes.ok) {
            const errorText = await upstreamRes.text();
            console.error('[ADK Proxy] Upstream Error Status:', upstreamRes.status);
            console.error('[ADK Proxy] Upstream Error Body:', errorText);
            const layer: AdkLayer = upstreamRes.status >= 500 ? 'upstream-model' : 'upstream-http';
            finalizeObservation({
                status: 'failed',
                layer,
                reason: `upstream_http_${upstreamRes.status}`,
                httpStatus: upstreamRes.status
            });

            const fallbackMessage = buildFallbackAnswer({ text: '', locale: body?.locale });
            const errorStream = createPlainTextStream([
                { text: `[THINKING]Upstream service error (${upstreamRes.status})[/THINKING]\n`, delayMs: 50 },
                { text: `⚠️ **Error**: ${errorText.slice(0, 100)}...\n\n`, delayMs: 50 },
                { text: fallbackMessage, delayMs: 100 }
            ]);

            return new Response(errorStream, {
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'X-Agent-Backend': 'adk',
                    'X-Agent-Request-Id': requestId
                }
            });
        }

        if (!upstreamRes.body) {
            console.error('[ADK Proxy] No response body from upstream');
            finalizeObservation({
                status: 'failed',
                layer: 'upstream-stream',
                reason: 'empty_upstream_body'
            });
            return NextResponse.json({ error: 'No response body' }, { status: 500 });
        }

        const upstreamContentType = upstreamRes.headers.get('Content-Type') || '';
        if (!upstreamContentType.includes('text/event-stream')) {
            if (upstreamContentType.includes('application/json')) {
                const jsonText = await upstreamRes.text();
                const busy = detectBusy(jsonText);
                if (busy.isBusy) {
                    streamMetrics.busyDetected = true;
                    streamMetrics.busyReason = busy.reason;
                }
                finalizeObservation({
                    status: busy.isBusy ? 'degraded' : 'ok',
                    layer: busy.reason === 'tool_failure_message' ? 'upstream-tool' : (busy.reason === 'model_unavailable' ? 'upstream-model' : 'upstream-http'),
                    reason: busy.isBusy ? busy.reason : 'upstream_json_response',
                    httpStatus: upstreamRes.status
                });
                return new Response(jsonText, {
                    headers: {
                        'Content-Type': 'text/plain; charset=utf-8',
                        'Cache-Control': 'no-cache',
                        'Connection': 'keep-alive',
                        'X-Agent-Backend': 'adk',
                        'X-Agent-Request-Id': requestId
                    },
                });
            }

            finalizeObservation({
                status: 'ok',
                layer: 'upstream-http',
                reason: 'upstream_non_sse_stream',
                httpStatus: upstreamRes.status
            });
            return new Response(upstreamRes.body, {
                headers: {
                    'Content-Type': upstreamContentType || 'text/plain; charset=utf-8',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                    'X-Agent-Backend': 'adk',
                    'X-Agent-Request-Id': requestId
                },
            });
        }

        // Transform ADK SSE to plain text stream for AI SDK
        const reader = upstreamRes.body.getReader();
        let controllerClosed = false;

        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                console.log('[ADK Proxy] Stream started');
                try {
                    for await (const chunk of transformAdkStream(reader, streamMetrics)) {
                        // console.log(`[ADK Proxy] Yielding chunk (${chunk.length} chars)`); // Reduced log
                        if (!controllerClosed) {
                            controller.enqueue(encoder.encode(chunk));
                        }
                    }
                    if (streamMetrics.errorEventCount > 0) {
                        finalizeObservation({
                            status: 'degraded',
                            layer: 'upstream-stream',
                            reason: 'stream_error_event'
                        });
                    } else if (streamMetrics.busyDetected) {
                        const layer: AdkLayer =
                            streamMetrics.busyReason === 'tool_failure_message'
                                ? 'upstream-tool'
                                : streamMetrics.busyReason === 'model_unavailable'
                                    ? 'upstream-model'
                                    : 'unknown';
                        finalizeObservation({
                            status: 'degraded',
                            layer,
                            reason: streamMetrics.busyReason || 'busy_message'
                        });
                    } else {
                        finalizeObservation({
                            status: 'ok',
                            layer: 'proxy',
                            reason: 'stream_ok'
                        });
                    }
                } catch (error: any) {
                    if (error.name === 'TypeError' && error.message.includes('Controller is already closed')) {
                        // Ignore
                    } else {
                        console.error('[ADK Proxy] Stream Error during transformation:', error);
                        finalizeObservation({
                            status: 'failed',
                            layer: 'upstream-stream',
                            reason: error?.name === 'AbortError' ? 'stream_timeout_abort' : 'stream_transform_error'
                        });
                    }
                } finally {
                    console.log('[ADK Proxy] Stream closing');
                    if (!controllerClosed) {
                        try {
                            controller.close();
                        } catch (e) {
                            // Already closed
                        }
                        controllerClosed = true;
                    }
                }
            },
            cancel() {
                console.log('[ADK Proxy] Stream canceled by client');
                controllerClosed = true;
                reader.cancel();
                finalizeObservation({
                    status: 'degraded',
                    layer: 'proxy',
                    reason: 'client_canceled'
                });
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Agent-Backend': 'adk',
                'X-Agent-Request-Id': requestId
            },
        });

    } catch (error) {
        console.error('[ADK Proxy] Fatal Error:', error);
        finalizeObservation({
            status: 'failed',
            layer: 'proxy',
            reason: 'proxy_fatal_error'
        });

        // Attempt to extract locale from rawBody if available, for localized error messages
        let locale = 'en';
        try {
            if (rawBody) {
                const parsedBody = JSON.parse(rawBody);
                locale = parsedBody.locale || 'en';
            }
        } catch (e) {
            // Ignore parse error, fallback to 'en'
        }

        const fallbackMessage = buildFallbackAnswer({ text: '', locale });
        const errorStream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                const thinkingMsg = locale === 'zh-TW' || locale === 'zh' ? '系統錯誤' :
                    locale === 'ja' ? 'システムエラー' : 'System Error';
                controller.enqueue(encoder.encode(`[THINKING]${thinkingMsg}[/THINKING]\n`));
                controller.enqueue(encoder.encode(fallbackMessage));
                controller.close();
            }
        });

        return new Response(errorStream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'X-Agent-Backend': 'adk',
                'X-Agent-Request-Id': requestId
            }
        });
    }
}

export const __private__ = {
    normalizeAdkEndpoint,
    extractSseEvent,
    parseSseEvent
};
