import { NextRequest, NextResponse } from 'next/server';

// Support both ADK_SERVICE_URL and CHAT_API_URL for backward compatibility
const ADK_SERVICE_URL = process.env.ADK_SERVICE_URL || process.env.CHAT_API_URL;

// Node.js runtime for better logging in dev
export const runtime = 'nodejs';

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
async function* transformAdkStream(reader: ReadableStreamDefaultReader<Uint8Array>): AsyncGenerator<string> {
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

            const chunk = parseSseEvent(trimmedEvent);
            if (chunk) {
                console.log(`[ADK Proxy] Processed event -> yielding ${chunk.length} chars`);
                yield chunk;
            }
        }
    }

    // Process any remaining buffer content
    if (buffer.trim()) {
        const chunk = parseSseEvent(buffer);
        if (chunk) yield chunk;
    }
}

// Fallback when ADK is not configured
function buildFallbackAnswer(input: { text: string; locale?: string }): string {
    const locale = typeof input.locale === 'string' ? input.locale : 'en';
    const errorMessages: Record<string, string> = {
        'en': "⚠️ **System Notice**: The AI Service is currently not configured (ADK_SERVICE_URL missing). Please contact the administrator.",
        'ja': "⚠️ **システム通知**: AIサービスが未設定です (ADK_SERVICE_URL missing)。管理者にご連絡ください。",
        'zh-TW': "⚠️ **系統通知**: AI 服務尚未設定 (ADK_SERVICE_URL missing)。請聯繫管理員。",
        'zh': "⚠️ **系统通知**: AI 服务尚未配置 (ADK_SERVICE_URL missing)。请联系管理员。",
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
function parseSseEvent(event: string): string | null {
    let eventType = '';
    let eventData = '';

    for (const line of event.split('\n')) {
        if (line.startsWith('event:')) {
            eventType = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
            eventData = line.slice(5).trim();
        }
    }

    if (eventType === 'telem' && eventData) {
        try {
            const parsed = JSON.parse(eventData);
            return parsed.content || null;
        } catch {
            return null;
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

    return null;
}

export async function POST(req: NextRequest) {
    let rawBody = '';
    try {
        rawBody = await req.text();
        console.log('[ADK Proxy] Raw request body:', rawBody);

        if (!rawBody) {
            console.log('[ADK Proxy] Empty request body (Ping)');
            return NextResponse.json({ status: 'ok' }, { status: 200 });
        }

        const body = JSON.parse(rawBody);
        console.log('[ADK Proxy] Parsed request body (summary):', JSON.stringify({ ...body, messages: body.messages?.length }));

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
                    'X-Agent-Backend': 'adk'
                }
            });
        }

        if (!ADK_SERVICE_URL) {
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
                    'X-Agent-Backend': 'adk'
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
            upstreamRes = await fetch(ADK_SERVICE_URL, {
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
                    'X-Agent-Backend': 'adk'
                }
            });
        }
        if (timeoutId) clearTimeout(timeoutId);

        if (!upstreamRes.ok) {
            const errorText = await upstreamRes.text();
            console.error('[ADK Proxy] Upstream Error Status:', upstreamRes.status);
            console.error('[ADK Proxy] Upstream Error Body:', errorText);

            const fallbackMessage = buildFallbackAnswer({ text: '', locale: body?.locale });
            const errorStream = createPlainTextStream([
                { text: `[THINKING]Upstream service error (${upstreamRes.status})[/THINKING]\n`, delayMs: 50 },
                { text: `⚠️ **Error**: ${errorText.slice(0, 100)}...\n\n`, delayMs: 50 },
                { text: fallbackMessage, delayMs: 100 }
            ]);

            return new Response(errorStream, {
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'X-Agent-Backend': 'adk'
                }
            });
        }

        if (!upstreamRes.body) {
            console.error('[ADK Proxy] No response body from upstream');
            return NextResponse.json({ error: 'No response body' }, { status: 500 });
        }

        const upstreamContentType = upstreamRes.headers.get('Content-Type') || '';
        if (!upstreamContentType.includes('text/event-stream')) {
            if (upstreamContentType.includes('application/json')) {
                const jsonText = await upstreamRes.text();
                return new Response(jsonText, {
                    headers: {
                        'Content-Type': 'text/plain; charset=utf-8',
                        'Cache-Control': 'no-cache',
                        'Connection': 'keep-alive',
                        'X-Agent-Backend': 'adk'
                    },
                });
            }

            return new Response(upstreamRes.body, {
                headers: {
                    'Content-Type': upstreamContentType || 'text/plain; charset=utf-8',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                    'X-Agent-Backend': 'adk'
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
                    for await (const chunk of transformAdkStream(reader)) {
                        // console.log(`[ADK Proxy] Yielding chunk (${chunk.length} chars)`); // Reduced log
                        if (!controllerClosed) {
                            controller.enqueue(encoder.encode(chunk));
                        }
                    }
                } catch (error: any) {
                    if (error.name === 'TypeError' && error.message.includes('Controller is already closed')) {
                        // Ignore
                    } else {
                        console.error('[ADK Proxy] Stream Error during transformation:', error);
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
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Agent-Backend': 'adk'
            },
        });

    } catch (error) {
        console.error('[ADK Proxy] Fatal Error:', error);

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
                'X-Agent-Backend': 'adk'
            }
        });
    }
}
