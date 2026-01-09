import { NextRequest } from 'next/server';

const DIFY_API_BASE = process.env.DIFY_API_BASE || process.env.DIFY_API_URL || 'https://api.dify.ai/v1';
const DIFY_API_KEY = process.env.DIFY_API_KEY || '';

export const maxDuration = 60;

// Timeout for Dify API calls
const DIFY_TIMEOUT_MS = 30000; // 30 seconds

/**
 * Chat API - Dify Agent (Level 3 Complex Queries)
 *
 * This route proxies complex queries to Dify Agent.
 * Simple queries should be handled by /api/agent/hybrid first.
 *
 * Performance optimizations:
 * - Timeout protection (30s)
 * - Optimized SSE stream processing
 * - Minimal input payload
 */
export async function POST(req: NextRequest) {
    const startTime = Date.now();

    if (!DIFY_API_KEY) {
        return new Response(JSON.stringify({ error: 'DIFY_API_KEY not configured' }), { status: 500 });
    }

    try {
        const body = await req.json();

        const messages = body.messages || [];
        const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
        const query = lastMessage ? lastMessage.content : '';

        if (!query) {
            return new Response('No query provided', { status: 400 });
        }

        // Minimal inputs for Dify (reduced from 5 to 3 variables for faster processing)
        const inputs = {
            current_station: body.nodeId || '',
            locale: body.locale || 'zh-TW',
            user_profile: body.user_profile || 'general'
        };

        const conversationId = body.conversationId || undefined;
        const userId = body.userId || 'anonymous';

        console.log(`[Dify] Query: "${query.slice(0, 50)}..." | Station: ${inputs.current_station}`);

        // Fetch to Dify with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), DIFY_TIMEOUT_MS);

        let difyResponse: Response;
        try {
            difyResponse = await fetch(`${DIFY_API_BASE}/chat-messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${DIFY_API_KEY}`,
                    'Content-Type': 'application/json',
                    'Accept': 'text/event-stream'
                },
                body: JSON.stringify({
                    inputs,
                    query,
                    response_mode: 'streaming',
                    conversation_id: conversationId,
                    user: userId,
                    auto_generate_name: false
                }),
                signal: controller.signal
            });
        } finally {
            clearTimeout(timeoutId);
        }

        if (!difyResponse.ok) {
            const errorText = await difyResponse.text();
            console.error(`[Dify] Error ${difyResponse.status}:`, errorText);
            return new Response(errorText, { status: difyResponse.status });
        }

        if (!difyResponse.body) {
            return new Response('No response body from Dify', { status: 500 });
        }

        // Optimized Stream Transform
        const reader = difyResponse.body.getReader();
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        const stream = new ReadableStream({
            async start(controller) {
                let buffer = '';
                let totalChunks = 0;

                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split('\n');
                        buffer = lines.pop() || '';

                        // Batch process multiple lines
                        let batchContent = '';
                        for (const line of lines) {
                            const trimmed = line.trim();
                            if (!trimmed.startsWith('data:')) continue;

                            const jsonStr = trimmed.slice(5).trim();
                            if (jsonStr === '[DONE]') continue;

                            try {
                                const data = JSON.parse(jsonStr);
                                // Handle both message and agent_message events
                                if (data.event === 'message' || data.event === 'agent_message') {
                                    if (data.answer) {
                                        batchContent += data.answer;
                                    }
                                }
                            } catch {
                                // Ignore parse errors for partial JSON
                            }
                        }

                        // Send batched content
                        if (batchContent) {
                            controller.enqueue(encoder.encode(batchContent));
                            totalChunks++;
                        }
                    }

                    const latency = Date.now() - startTime;
                    console.log(`[Dify] Stream complete: ${totalChunks} chunks, ${latency}ms`);

                } catch (e: any) {
                    if (e.name === 'AbortError') {
                        console.error('[Dify] Request timeout');
                        controller.enqueue(encoder.encode('\n\n[回應逾時，請稍後再試]'));
                    } else {
                        console.error('[Dify] Stream error:', e);
                    }
                } finally {
                    controller.close();
                }
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-cache, no-transform',
                'X-Accel-Buffering': 'no'
            }
        });

    } catch (error: any) {
        const latency = Date.now() - startTime;
        console.error(`[Dify] Fatal Error (${latency}ms):`, error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
