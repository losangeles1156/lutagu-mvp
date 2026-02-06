import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const ADK_SERVICE_URL = process.env.ADK_SERVICE_URL;

type IncomingPayload = {
    trace_id?: string;
    traceId?: string;
    user_id?: string;
    userId?: string;
    session_id?: string;
    sessionId?: string;
    locale?: string;
    query?: string;
    requestText?: string;
    response?: string;
    helpful?: boolean;
    score?: number;
    intent_tags?: string[];
    intentTags?: string[];
    node_id?: string;
    nodeId?: string;
    details?: {
        query?: string;
        content?: string;
        response?: string;
        nodeId?: string;
        contextNodeId?: string;
    };
};

function normalizeFeedbackEndpoint(raw: string | undefined): string | null {
    const value = typeof raw === 'string' ? raw.trim() : '';
    if (!value) return null;

    let parsed: URL;
    try {
        parsed = new URL(value);
    } catch {
        return null;
    }

    if (!parsed.pathname || parsed.pathname === '/' || parsed.pathname === '/api/chat') {
        parsed.pathname = '/agent/feedback';
    } else if (parsed.pathname.endsWith('/api/chat')) {
        parsed.pathname = parsed.pathname.replace(/\/api\/chat$/, '/agent/feedback');
    } else if (!parsed.pathname.endsWith('/agent/feedback')) {
        parsed.pathname = '/agent/feedback';
    }
    return parsed.toString();
}

function toBooleanHelpful(body: IncomingPayload): boolean {
    if (typeof body.helpful === 'boolean') return body.helpful;
    if (typeof body.score === 'number') return body.score > 0;
    return false;
}

function toStringArray(input: unknown): string[] {
    if (!Array.isArray(input)) return [];
    return input.map((item) => String(item || '').trim()).filter(Boolean);
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as IncomingPayload;
        const endpoint = normalizeFeedbackEndpoint(ADK_SERVICE_URL);

        if (!endpoint) {
            return NextResponse.json(
                { error: 'ADK_SERVICE_URL not configured for feedback endpoint' },
                { status: 503 }
            );
        }

        const payload = {
            trace_id: body.trace_id || body.traceId || '',
            user_id: body.user_id || body.userId || '',
            session_id: body.session_id || body.sessionId || '',
            locale: body.locale || 'zh-TW',
            query: body.query || body.requestText || body.details?.query || '',
            response: body.response || body.details?.response || body.details?.content || '',
            helpful: toBooleanHelpful(body),
            intent_tags: toStringArray(body.intent_tags || body.intentTags),
            node_id: body.node_id || body.nodeId || body.details?.nodeId || body.details?.contextNodeId || '',
        };

        const upstreamRes = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
            cache: 'no-store',
        });

        const text = await upstreamRes.text();
        if (!upstreamRes.ok) {
            return NextResponse.json(
                {
                    error: 'Failed to submit feedback to ADK service',
                    upstreamStatus: upstreamRes.status,
                    upstreamBody: text,
                },
                { status: 502 }
            );
        }

        let data: unknown = {};
        try {
            data = text ? JSON.parse(text) : {};
        } catch {
            data = { raw: text };
        }
        return NextResponse.json(data, { status: 200 });
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}

