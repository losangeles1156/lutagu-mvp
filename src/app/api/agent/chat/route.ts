
import { NextRequest } from 'next/server';

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
        return new Response(JSON.stringify({ error: 'DIFY_API_KEY not configured' }), { status: 500 });
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
            locale: rawLocale,
            user_profile: body.user_profile || 'general',
            response_language: getResponseLanguage(rawLocale), // 明確語言指示
            language_instruction: rawLocale === 'zh' || rawLocale === 'zh-TW'
                ? '請務必使用繁體中文（台灣用語）回答，不要使用简体中文。'
                : ''
        };

        const conversationId = body.conversationId || undefined;
        const userId = body.userId || 'anonymous';

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

        if (!difyResponse.ok) {
            const errorText = await difyResponse.text();
            console.error('[Chat API] Dify Error:', errorText);
            return new Response(errorText, { status: difyResponse.status });
        }

        if (!difyResponse.body) {
            return new Response('No response body from Dify', { status: 500 });
        }

        // Transform Stream
        const reader = difyResponse.body.getReader();
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        const stream = new ReadableStream({
            async start(controller) {
                let buffer = '';

                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

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

                                // Handle Thinking Events - 讓用戶知道 AI 正在思考
                                if (event === 'agent_thought') {
                                    const thought = data.thought || '';
                                    if (thought) {
                                        // 發送思考狀態標記，前端可解析顯示
                                        controller.enqueue(encoder.encode(`\n[THINKING]${thought}[/THINKING]\n`));
                                    }
                                }

                                // Handle Answer Events
                                if (event === 'message' || event === 'agent_message') {
                                    const answer = data.answer;
                                    if (answer) {
                                        controller.enqueue(encoder.encode(answer));
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
