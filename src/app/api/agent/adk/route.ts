import { NextRequest, NextResponse } from 'next/server';

// Cloud Run Service URL
const ADK_SERVICE_URL = 'https://adk-agent-147810667713.asia-northeast1.run.app/api/chat';

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
        // Use a more robust split that handles \n\n, \r\n\r\n, etc.
        const events = buffer.split(/\n\n+/);
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
                return `[THINKING] ${message}\n`;
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

    return null;
}

export async function POST(req: NextRequest) {
    try {
        const rawBody = await req.text();
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
                }

                return {
                    role: m.role === 'assistant' ? 'model' : m.role,
                    content: (typeof content === 'string' && content.length > 0) ? content : '(thinking process verified)',
                };
            }).filter((m: any) => m.content.length > 0); // Filter out empty messages

            // DIAGNOSTIC: Truncate to last message to test if history is causing 400
            if (body.messages.length > 0) {
                body.messages = body.messages.slice(-1);
            }
        }

        if (body.messages?.[0]?.content?.includes('MOCK')) {
            const encoder = new TextEncoder();
            const mockStream = new ReadableStream({
                async start(controller) {
                    controller.enqueue(encoder.encode('[THINKING] Mock analysis...\n'));
                    await new Promise(r => setTimeout(r, 1000));
                    controller.enqueue(encoder.encode('This is a mock response in Japanese: 渋谷への行き方は簡単です。'));
                    controller.close();
                }
            });
            return new Response(mockStream, {
                headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            });
        }

        // Forward request to Cloud Run
        const upstreamRes = await fetch(ADK_SERVICE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            cache: 'no-store',
        });

        if (!upstreamRes.ok) {
            const errorText = await upstreamRes.text();
            console.error('[ADK Proxy] Upstream Error Status:', upstreamRes.status);
            console.error('[ADK Proxy] Upstream Error Body:', errorText);
            return NextResponse.json({
                error: `Upstream error: ${upstreamRes.status}`,
                details: errorText,
                debug_body: JSON.stringify(body).slice(0, 1000) // Echo partial body for debug
            }, { status: upstreamRes.status });
        }

        if (!upstreamRes.body) {
            console.error('[ADK Proxy] No response body from upstream');
            return NextResponse.json({ error: 'No response body' }, { status: 500 });
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
            },
        });

    } catch (error) {
        console.error('[ADK Proxy] Error:', error);
        return NextResponse.json({ error: 'Internal Proxy Error' }, { status: 500 });
    }
}
