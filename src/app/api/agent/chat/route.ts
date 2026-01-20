
import { NextRequest } from 'next/server';

export const runtime = 'edge'; // Use Edge Runtime for low latency proxy

export async function POST(req: NextRequest) {
    try {
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
        if (!chatApiUrl) {
            console.error('[Chat Proxy] Missing CHAT_API_URL');
            return new Response(fallbackMessage, {
                status: 200,
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'Cache-Control': 'no-cache, no-transform',
                    'X-Accel-Buffering': 'no'
                }
            });
        }

        // Forward to Cloud Run Streaming Endpoint
        const upstreamRes = await fetch(`${chatApiUrl}/agent/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body)
        });

        if (!upstreamRes.ok || !upstreamRes.body) {
            console.error(`[Chat Proxy] Upstream Error: ${upstreamRes.status}`);
            return new Response(fallbackMessage, {
                status: 200,
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'Cache-Control': 'no-cache, no-transform',
                    'X-Accel-Buffering': 'no'
                }
            });
        }

        // Return the stream directly
        return new Response(upstreamRes.body, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-cache, no-transform',
                'X-Accel-Buffering': 'no'
            }
        });

    } catch (error) {
        console.error('[Chat Proxy] Exception:', error);
        return new Response('抱歉，目前無法連接 AI 服務，請稍後再試。', {
            status: 200,
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-cache, no-transform',
                'X-Accel-Buffering': 'no'
            }
        });
    }
}
