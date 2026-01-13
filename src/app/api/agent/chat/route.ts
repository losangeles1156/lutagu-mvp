
import { NextRequest } from 'next/server';
import { createUIMessageStream, createUIMessageStreamResponse } from 'ai';
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

        const stream = createUIMessageStream({
            execute: async ({ writer }) => {
                const textId = 'text-1';

                const sendUpdate = (delta: string) => {
                    writer.write({ type: 'text-delta', id: textId, delta });
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
                        }
                    });

                    if (result) {
                        if (result.reasoning) {
                            sendUpdate(`[THINKING]${result.reasoning}[/THINKING]\n`);
                        }

                        sendUpdate(result.content);
                    } else {
                        sendUpdate(locale === 'en' ? "I'm not sure, could you clarify?" : '抱歉，我不太理解您的意思。');
                    }
                } catch (error: any) {
                    console.error('[Chat API] Processing Error:', error);
                    const isTimeout = error.name === 'AbortError' || error.message?.includes('aborted');
                    const errorMsg = isTimeout
                        ? (locale === 'en' ? 'Request timed out, please try again.' : '請求逾時，請稍後再試。')
                        : `\n[ERROR] ${error.message}`;

                    sendUpdate(errorMsg);
                } finally {
                    writer.write({ type: 'text-end', id: textId });
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
