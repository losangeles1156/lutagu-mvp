import { NextRequest, NextResponse } from 'next/server';

const ADK_SERVICE_URL = process.env.ADK_SERVICE_URL;

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

function buildFallbackAnswer(input: { text: string; locale?: string }): string {
    const locale = typeof input.locale === 'string' ? input.locale : 'en';
    const text = input.text;
    const lower = text.toLowerCase();
    const isJa = locale === 'ja' || locale.startsWith('ja');
    const isZh = locale === 'zh-TW';

    const delayRegex = /delay|delays|disruption|遅れ|遅延|運行|延誤|延误/i;
    const routeRegex = /fastest|how do i get|get to|route|transfer|line|行き方|怎麼去|怎麼到|如何到|最快|路線|路線規劃|路线/i;

    if (delayRegex.test(text)) {
        if (isJa) {
            return '現在、大きな遅延は確認されていません。念のため、ホームの電光掲示板と駅員アナウンスも確認してください。';
        }
        if (isZh) {
            return '目前沒有看到明顯的大規模延誤訊號。建議同時確認站內電子看板與廣播（有時會比 App 更快）。';
        }
        return 'No major delays are currently indicated. Also check station boards and announcements for the latest updates.';
    }

    if (routeRegex.test(text) || lower.includes('shibuya') || lower.includes('shinjuku') || /渋谷|新宿/.test(text)) {
        if (isJa) {
            return '東京駅から渋谷へは、山手線（外回り）で一本が分かりやすいです。所要は約25分。混雑時は埼京線/湘南新宿ラインも候補です。';
        }
        if (isZh) {
            return '從東京站到澀谷，最直覺的是搭 JR 山手線（外回り）直達，約 25 分鐘。若尖峰很擠，可改搭埼京線／湘南新宿ライン作為替代。';
        }
        return 'From Tokyo Station to Shibuya, the simplest option is the JR Yamanote Line (outer loop), about 25 minutes. During peak crowding, consider the Saikyo Line or Shonan-Shinjuku Line as alternatives.';
    }

    if (isJa) return 'ご希望をもう少し教えてください（出発地・目的地・急ぎかどうか）。最適な移動手段を提案します。';
    if (isZh) return '可以再補充一下嗎：起點、目的地、是否趕時間？我會給你最省心的一條走法。';
    return 'Tell me your origin, destination, and whether you are in a hurry. I will suggest the best route.';
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

        if (!ADK_SERVICE_URL) {
            const lastUser = Array.isArray(body?.messages)
                ? [...body.messages].reverse().find((m: any) => m?.role === 'user' || m?.role === 'model')
                : null;
            const text = typeof lastUser?.content === 'string' ? lastUser.content : '';
            const answer = buildFallbackAnswer({ text, locale: body?.locale });
            const stream = createPlainTextStream([
                { text: '[THINKING] Local fallback (ADK_SERVICE_URL missing)\n', delayMs: 50 },
                { text: answer, delayMs: 100 }
            ]);
            return new Response(stream, {
                headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            });
        }

        // Forward request to Cloud Run
        let upstreamRes: Response;
        try {
            upstreamRes = await fetch(ADK_SERVICE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
                cache: 'no-store',
            });
        } catch (e) {
            const lastUser = Array.isArray(body?.messages)
                ? [...body.messages].reverse().find((m: any) => m?.role === 'user' || m?.role === 'model')
                : null;
            const text = typeof lastUser?.content === 'string' ? lastUser.content : '';
            const answer = buildFallbackAnswer({ text, locale: body?.locale });
            const stream = createPlainTextStream([
                { text: '[THINKING] Local fallback (ADK fetch failed)\n', delayMs: 50 },
                { text: answer, delayMs: 100 }
            ]);
            return new Response(stream, {
                headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            });
        }

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
