import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge'; // Use Edge Runtime for lighter proxy

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const chatApiUrl = process.env.CHAT_API_URL;

        if (!chatApiUrl) {
            console.error('Missing CHAT_API_URL environment variable');
            return NextResponse.json({ error: 'Service Configuration Error' }, { status: 500 });
        }

        // Forward request to Cloud Run Microservice
        const response = await fetch(`${chatApiUrl}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Forward auth or other headers if needed
                // 'Authorization': req.headers.get('Authorization') || '' 
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            console.error(`Chat API Proxy Error: ${response.status} ${response.statusText}`);
            return NextResponse.json(
                { error: 'Upstream Service Error', details: await response.text() },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error('Chat API Proxy Exception:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
