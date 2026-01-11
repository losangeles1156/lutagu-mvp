
import { NextRequest, NextResponse } from 'next/server';

const DIFY_API_BASE = process.env.DIFY_API_BASE || process.env.DIFY_BASE_URL || process.env.DIFY_API_URL || 'https://api.dify.ai/v1';
const DIFY_API_KEY = process.env.DIFY_API_KEY || '';

export const maxDuration = 60;

/**
 * Chat API - Switch to Dify Agent (User Request)
 * 
 * This route now strictly proxies requests to the Dify Agent.
 * It transforms Dify's SSE format into a plain text stream compatible with AI SDK v6 useChat.
 */
export async function POST(req: NextRequest) {
    if (!DIFY_API_KEY) {
        console.error('[Chat API] Error: DIFY_API_KEY not configured');
        return NextResponse.json({ error: 'System Error: DIFY_API_KEY not configured in environment variables.' }, { status: 500 });
    }

    try {
        const body = await req.json();
        /* 
           Body structure from useChat:
           {
             messages: [...],
             nodeId: "...",
             locale: "...",
             user_profile: "...",
             // Plus extra body params I added in ChatPanel
           }
        */

        const messages = body.messages || [];
        const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
        const query = lastMessage ? lastMessage.content : '';

        if (!query) {
            return new Response('No query provided', { status: 400 });
        }

        // Inputs for Dify
        const rawLocale = body.locale || 'en';

        // 將 locale 轉換為明確的語言指示給 Dify
        const getResponseLanguage = (locale: string): string => {
            if (locale === 'zh' || locale === 'zh-TW') return '繁體中文（台灣）';
            if (locale === 'ja') return '日本語';
            return 'English';
        };

        const inputs = {
            current_station: body.nodeId || body.current_station || '',
            station_name: body.stationName || '',
            locale: rawLocale,
            user_profile: body.user_profile || 'general',
            response_language: getResponseLanguage(rawLocale), // 明確語言指示
            user_context: body.user_context || body.context || 'general',
            user_location: body.userLocation ? `${body.userLocation.lat},${body.userLocation.lng}` : '', // Added user_location
            language_instruction: rawLocale === 'zh' || rawLocale === 'zh-TW'
                ? '請務必使用繁體中文（台灣用語）回答，不要使用简体中文。'
                : ''
        };

        console.log('[Chat API] Dify Inputs:', JSON.stringify(inputs, null, 2));

        const conversationId = body.conversationId || undefined;
        const userId = body.userId || 'anonymous';

        console.log(`[Chat API] Calling Dify: ${DIFY_API_BASE}/chat-messages`);
        const fetchStartTime = Date.now();
        // Fetch to Dify
        const difyResponse = await fetch(`${DIFY_API_BASE}/chat-messages`, {
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
            })
        });
        console.log(`[Chat API] Dify Response Received: ${Date.now() - fetchStartTime}ms`);

        if (!difyResponse.ok) {
            const errorText = await difyResponse.text();
            console.error('[Chat API] Dify Error:', difyResponse.status, errorText);
            // Return JSON error if possible
            try {
                const errorJson = JSON.parse(errorText);
                return NextResponse.json({
                    error: `Dify Error (${difyResponse.status}): ${errorJson.message || errorJson.code || 'Unknown error'}`,
                    details: errorJson
                }, { status: difyResponse.status });
            } catch (e) {
                return NextResponse.json({ error: `Dify Error (${difyResponse.status}): ${errorText}` }, { status: difyResponse.status });
            }
        }

        if (!difyResponse.body) {
            return NextResponse.json({ error: 'No response body from Dify' }, { status: 500 });
        }

        // Transform Stream
        const reader = difyResponse.body.getReader();
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        const stream = new ReadableStream({
            async start(controller) {
                // Immediately send a thinking start marker to trigger TTFB on client
                controller.enqueue(encoder.encode(`\n[THINKING]${body.locale === 'zh' || body.locale === 'zh-TW' ? '啟動認知引擎...' : 'Initializing cognitive engine...'}[/THINKING]\n`));

                let buffer = '';
                let outputBuffer = ''; // Buffer for smoother streaming
                const startTime = Date.now();
                let firstChunkTime: number | null = null;

                try {
                    while (true) {
                        const { done, value } = await reader.read();

                        if (done) {
                            // Flush any remaining output buffer
                            if (outputBuffer) {
                                controller.enqueue(encoder.encode(outputBuffer));
                            }
                            break;
                        }

                        if (firstChunkTime === null) {
                            firstChunkTime = Date.now();
                            console.log(`[Chat API] TTFB (Dify): ${firstChunkTime - startTime}ms`);
                        }

                        buffer += decoder.decode(value, { stream: true });

                        // Process lines
                        const lines = buffer.split('\n');
                        // Keep the last partial line in buffer
                        buffer = lines.pop() || '';

                        for (const line of lines) {
                            const trimmed = line.trim();
                            if (!trimmed.startsWith('data:')) continue;

                            const jsonStr = trimmed.slice(5).trim();
                            if (jsonStr === '[DONE]') continue;

                            try {
                                const data = JSON.parse(jsonStr);
                                const event = data.event;
                                // console.log(`[Chat API] Dify Event: ${event}`);

                                // Handle Thinking Events - 讓用戶知道 AI 正在思考
                                if (event === 'agent_thought') {
                                    let thought = data.thought || '';
                                    if (thought) {
                                        // Flush output buffer before thought if needed
                                        if (outputBuffer) {
                                            controller.enqueue(encoder.encode(outputBuffer));
                                            outputBuffer = '';
                                        }
                                        // Filter out ** symbols (Markdown bold) as per Dify prompt requirements
                                        thought = thought.replace(/\*\*/g, '');
                                        // 發送思考狀態標記，前端可解析顯示
                                        controller.enqueue(encoder.encode(`\n[THINKING]${thought}[/THINKING]\n`));
                                    }
                                }

                                // Handle Answer Events
                                if (event === 'message' || event === 'agent_message') {
                                    let answer = data.answer;
                                    if (answer) {
                                        // Filter out ** symbols (Markdown bold) as per Dify prompt requirements
                                        answer = answer.replace(/\*\*/g, '');

                                        outputBuffer += answer;

                                        // Send if buffer gets large or contains a newline for responsiveness
                                        if (outputBuffer.length > 20 || outputBuffer.includes('\n')) {
                                            controller.enqueue(encoder.encode(outputBuffer));
                                            outputBuffer = '';
                                        }
                                    }
                                }

                                // Handle Suggested Questions (message_end event)
                                if (event === 'message_end') {
                                    const metadata = data.metadata;
                                    if (metadata && metadata.suggested_questions && Array.isArray(metadata.suggested_questions)) {
                                        const questions = metadata.suggested_questions;
                                        if (questions.length > 0) {
                                            controller.enqueue(encoder.encode(`\n[SUGGESTED_QUESTIONS]${JSON.stringify(questions)}[/SUGGESTED_QUESTIONS]\n`));
                                        }
                                    }
                                }
                            } catch (e) {
                                // Ignore parse errors for partial json
                            }
                        }
                    }
                } catch (e) {
                    console.error('Stream processing error', e);
                    controller.error(e);
                } finally {
                    controller.close();
                }
            }
        });

        return new Response(stream, {
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });

    } catch (error: any) {
        console.error('[Chat API] Fatal Error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
