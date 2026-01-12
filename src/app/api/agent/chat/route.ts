
import { NextRequest, NextResponse } from 'next/server';
import { hybridEngine, RequestContext } from '@/lib/l4/HybridEngine';

export const maxDuration = 60;

/**
 * Chat API - Agentic Streaming Endpoint
 * 
 * Calls HybridEngine (AgentRouter > Regex) and streams the response
 * in a format compatible with the Frontend (useAgentChat).
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // 1. Parse Request
        const messages = body.messages || [];
        const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
        const query = lastMessage ? lastMessage.content : '';
        const locale = body.locale || 'zh-TW';

        if (!query) {
            return new Response('No query provided', { status: 400 });
        }

        // 2. Build Context
        const context: RequestContext = {
            userId: body.userId || 'anon',
            currentStation: body.nodeId || body.current_station,
            userLocation: body.userLocation,
            preferences: {
                categories: []
            },
            strategyContext: null
        };

        // 3. Create Stream
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                const sendUpdate = (text: string) => {
                    controller.enqueue(encoder.encode(text));
                };

                const sendThinking = (step: string) => {
                    sendUpdate(`[THINKING]${step}[/THINKING]\n`);
                };

                try {
                    // Initial step
                    sendThinking(locale === 'en' ? 'Thinking...' : '思考中...');

                    // 4. Call Hybrid Engine with onProgress hook
                    const result = await hybridEngine.processRequest({
                        text: query,
                        locale,
                        context,
                        onProgress: (step) => {
                            sendThinking(step);
                        }
                    });

                    // 5. Finalize Thinking and send Content
                    if (result) {
                        // Close thinking if any reasoning is provided
                        if (result.reasoning) {
                            sendUpdate(`[THINKING]${result.reasoning}[/THINKING]\n`);
                        }

                        // Send main content
                        sendUpdate(result.content);
                    } else {
                        sendUpdate(locale === 'en' ? "I'm not sure, could you clarify?" : "抱歉，我不太理解您的意思。");
                    }

                } catch (error: any) {
                    console.error('[Chat API] Processing Error:', error);
                    // If it's an Abort error (Timeout from llmClient)
                    const isTimeout = error.name === 'AbortError' || error.message?.includes('aborted');
                    const errorMsg = isTimeout
                        ? (locale === 'en' ? "Request timed out, please try again." : "請求逾時，請稍後再試。")
                        : `\n[ERROR] ${error.message}`;

                    sendUpdate(errorMsg);
                } finally {
                    controller.close();
                }
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            }
        });

    } catch (error: any) {
        console.error('[Chat API] Fatal Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
