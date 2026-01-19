
import { NextRequest } from 'next/server';

export const runtime = 'edge'; // Use Edge Runtime for low latency proxy

export async function POST(req: NextRequest) {
    try {
        const chatApiUrl = process.env.CHAT_API_URL;
        if (!chatApiUrl) {
            console.error('[Chat Proxy] Missing CHAT_API_URL');
            return new Response(JSON.stringify({ error: 'Configuration Error' }), { status: 500 });
        }

        // Clone request body to forward
        const body = await req.json();

        // Forward to Cloud Run Streaming Endpoint
        const upstreamRes = await fetch(`${chatApiUrl}/agent/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body)
        });

        if (!upstreamRes.ok) {
            console.error(`[Chat Proxy] Upstream Error: ${upstreamRes.status}`);
            return new Response(upstreamRes.body, { status: upstreamRes.status });
        }

        // Return the stream directly
        return new Response(upstreamRes.body, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Transfer-Encoding': 'chunked'
            }
        });

    } catch (error) {
        console.error('[Chat Proxy] Exception:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
}
