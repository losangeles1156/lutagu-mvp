import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'edge';

interface FeedbackPayload {
    feedbackType: 'general' | 'bug' | 'spot' | 'tip';
    category?: string;
    title?: string;
    content: string;
    rating?: number;
    nodeId?: string;
    mediaUrls?: string[];
}

export async function POST(req: NextRequest) {
    try {
        const body: FeedbackPayload = await req.json();

        // Validate required fields
        if (!body.feedbackType || !body.content) {
            return NextResponse.json(
                { error: 'feedbackType and content are required' },
                { status: 400 }
            );
        }

        // Validate feedbackType
        const validTypes = ['general', 'bug', 'spot', 'tip'];
        if (!validTypes.includes(body.feedbackType)) {
            return NextResponse.json(
                { error: `Invalid feedbackType. Must be one of: ${validTypes.join(', ')}` },
                { status: 400 }
            );
        }

        // Validate rating if provided
        if (body.rating !== undefined && (body.rating < 1 || body.rating > 5)) {
            return NextResponse.json(
                { error: 'Rating must be between 1 and 5' },
                { status: 400 }
            );
        }

        // Collect device metadata
        const userAgent = req.headers.get('user-agent') || 'unknown';
        const metadata = {
            userAgent,
            timestamp: new Date().toISOString(),
            locale: req.headers.get('accept-language')?.split(',')[0] || 'unknown'
        };

        // Insert feedback
        const { data, error } = await supabaseAdmin
            .from('user_feedback')
            .insert({
                feedback_type: body.feedbackType,
                category: body.category || null,
                title: body.title || null,
                content: body.content,
                rating: body.rating || null,
                node_id: body.nodeId || null,
                media_urls: body.mediaUrls || [],
                metadata
            })
            .select('id')
            .single();

        if (error) {
            console.error('[Feedback API] Insert error:', error);
            return NextResponse.json(
                { error: 'Failed to submit feedback' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            feedbackId: data?.id
        });

    } catch (error: any) {
        console.error('[Feedback API] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

// GET: Retrieve user's own feedback (if authenticated)
export async function GET(req: NextRequest) {
    try {
        // For now, just return recent anonymous feedback count for stats
        const { data, error } = await supabaseAdmin
            .from('user_feedback')
            .select('id, feedback_type, status, created_at')
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) {
            return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 });
        }

        return NextResponse.json({ feedback: data || [] });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
