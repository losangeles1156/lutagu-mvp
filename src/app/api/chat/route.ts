import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge'; // Use Edge Runtime for lighter proxy

function buildFallbackAnswer(input: { text: string; locale?: string }): string {
    const locale = typeof input.locale === 'string' ? input.locale : 'en';
    const text = input.text || '';
    const lower = text.toLowerCase();
    const isJa = locale === 'ja' || locale.startsWith('ja');
    const isZh = locale === 'zh-TW' || locale.startsWith('zh');

    const delayRegex = /delay|delays|disruption|遅れ|遅延|運行|延誤|延误/i;
    const routeRegex = /fastest|how do i get|get to|route|transfer|line|行き方|怎麼去|怎麼到|如何到|最快|路線|路線規劃|路线/i;

    if (delayRegex.test(text)) {
        if (isJa) return '現在、大きな遅延は確認されていません。念のため、ホームの電光掲示板と駅員アナウンスも確認してください。';
        if (isZh) return '目前沒有看到明顯的大規模延誤訊號。建議同時確認站內電子看板與廣播（有時會比 App 更快）。';
        return 'No major delays are currently indicated. Also check station boards and announcements for the latest updates.';
    }

    if (routeRegex.test(text) || lower.includes('shibuya') || lower.includes('shinjuku') || /渋谷|新宿/.test(text)) {
        if (isJa) return '東京駅から渋谷へは、山手線（外回り）で一本が分かりやすいです。所要は約25分。混雑時は埼京線/湘南新宿ラインも候補です。';
        if (isZh) return '從東京站到澀谷，最直覺的是搭 JR 山手線（外回り）直達，約 25 分鐘。若尖峰很擠，可改搭埼京線／湘南新宿ライン作為替代。';
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

function getFallbackResponse(body: any, reason: string): Response {
    const lastUser = Array.isArray(body?.messages)
        ? [...body.messages].reverse().find((m: any) => m?.role === 'user' || m?.role === 'model')
        : null;
    const text = typeof lastUser?.content === 'string' ? lastUser.content : '';
    const answer = buildFallbackAnswer({ text, locale: body?.locale });

    // In Chat API, we stream plain text or SSE. Go agent usually sends simple text or JSON lines.
    // The frontend expects a stream.
    const stream = createPlainTextStream([
        { text: `[THINKING] ${reason} - Using Offline Knowledge\n`, delayMs: 50 },
        { text: answer, delayMs: 100 }
    ]);

    return new Response(stream, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
}

export async function POST(req: NextRequest) {
    let body: any = {};
    try {
        body = await req.json();
        const chatApiUrl = process.env.CHAT_API_URL;

        if (!chatApiUrl) {
            console.warn('Missing CHAT_API_URL, using fallback');
            return getFallbackResponse(body, 'Service Config Missing');
        }

        // Forward request to Cloud Run Microservice
        let response: Response;
        try {
            response = await fetch(`${chatApiUrl}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body)
            });
        } catch (fetchError) {
            console.error('Chat API connection failed:', fetchError);
            return getFallbackResponse(body, 'Connection Failed');
        }

        if (!response.ok) {
            console.error(`Chat API Proxy Error: ${response.status} ${response.statusText}`);
            // If 404 or 5xx, try fallback
            if (response.status >= 500 || response.status === 404) {
                return getFallbackResponse(body, 'Upstream Error');
            }
            return NextResponse.json(
                { error: 'Upstream Service Error', details: await response.text() },
                { status: response.status }
            );
        }

        // Forward the response stream directly (Supporting SSE)
        return new NextResponse(response.body, {
            status: response.status,
            headers: {
                'Content-Type': response.headers.get('Content-Type') || 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error) {
        console.error('Chat API Proxy Exception:', error);
        // Last ditch fallback
        return getFallbackResponse(body, 'Internal Proxy Error');
    }
}
