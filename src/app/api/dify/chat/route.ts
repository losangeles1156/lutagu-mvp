import { NextRequest, NextResponse } from 'next/server';

const DIFY_API_BASE = process.env.DIFY_API_BASE || process.env.DIFY_API_URL || 'https://api.dify.ai/v1';
const DIFY_API_KEY = process.env.DIFY_API_KEY || '';

interface DifyMessage {
    role: 'user' | 'assistant';
    content: string;
}

/**
 * Dify Agent Chat API
 * 
 * This route proxies chat requests to Dify Agent API.
 * Supports both streaming and blocking modes.
 */
export async function POST(req: NextRequest) {
    try {
        if (!DIFY_API_KEY) {
            return NextResponse.json(
                { error: 'DIFY_API_KEY not configured' },
                { status: 500 }
            );
        }

        const body = await req.json();
        const {
            query,           // User's message
            conversation_id, // Optional: for continuing conversation
            inputs = {},     // Context variables (user_profile, current_station, locale)
            response_mode = 'streaming' // 'streaming' or 'blocking'
        } = body;

        if (!query) {
            return NextResponse.json(
                { error: 'query is required' },
                { status: 400 }
            );
        }

        // Prepare Dify request
        const difyPayload = {
            inputs: {
                user_profile: inputs.user_profile || 'general',
                current_station: inputs.current_station || '',
                locale: inputs.locale || 'zh-TW',
                ...inputs
            },
            query,
            response_mode,
            conversation_id: conversation_id || undefined,
            user: inputs.user_id || 'anonymous'
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

        let difyResponse: Response;
        try {
            difyResponse = await fetch(`${DIFY_API_BASE}/chat-messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${DIFY_API_KEY}`,
                    'Content-Type': 'application/json',
                    'Accept': response_mode === 'streaming' ? 'text/event-stream' : 'application/json'
                },
                body: JSON.stringify({
                    ...difyPayload,
                    files: body.files || []
                }),
                signal: controller.signal
            });
        } finally {
            clearTimeout(timeoutId);
        }

        if (!difyResponse.ok) {
            const errorText = await difyResponse.text();
            console.error('[Dify] API Error:', difyResponse.status, errorText);
            return NextResponse.json(
                { error: `Dify API Error: ${difyResponse.status}`, details: errorText },
                { status: difyResponse.status }
            );
        }

        // For streaming mode, pipe the response directly
        if (response_mode === 'streaming') {
            return new NextResponse(difyResponse.body, {
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache, no-transform',
                    'Connection': 'keep-alive',
                    'X-Accel-Buffering': 'no'
                }
            });
        }

        // For blocking mode, return JSON
        const result = await difyResponse.json();
        return NextResponse.json({
            answer: result.answer,
            conversation_id: result.conversation_id,
            message_id: result.message_id,
            metadata: result.metadata
        });

    } catch (error: any) {
        console.error('[Dify] Fatal Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}

/**
 * GET: Retrieve conversation history from Dify
 */
export async function GET(req: NextRequest) {
    try {
        if (!DIFY_API_KEY) {
            return NextResponse.json(
                { error: 'DIFY_API_KEY not configured' },
                { status: 500 }
            );
        }

        const { searchParams } = new URL(req.url);
        const conversation_id = searchParams.get('conversation_id');
        const user = searchParams.get('user') || 'anonymous';

        if (!conversation_id) {
            return NextResponse.json(
                { error: 'conversation_id is required' },
                { status: 400 }
            );
        }

        const difyResponse = await fetch(
            `${DIFY_API_BASE}/messages?conversation_id=${conversation_id}&user=${user}&limit=20`,
            {
                headers: {
                    'Authorization': `Bearer ${DIFY_API_KEY}`
                }
            }
        );

        if (!difyResponse.ok) {
            return NextResponse.json(
                { error: 'Failed to fetch conversation' },
                { status: difyResponse.status }
            );
        }

        const result = await difyResponse.json();
        return NextResponse.json(result);

    } catch (error: any) {
        console.error('[Dify] GET Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
