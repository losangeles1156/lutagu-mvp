import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'edge';

// GET: Retrieve all feedback for admin dashboard
export async function GET(req: NextRequest) {
    try {
        // TODO: Add proper admin authentication check here
        // For MVP, we allow access but should add auth in production

        const { data, error } = await supabaseAdmin
            .from('user_feedback')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) {
            console.error('[Admin Feedback API] Error:', error);
            return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 });
        }

        return NextResponse.json({ feedback: data || [] });

    } catch (error: any) {
        console.error('[Admin Feedback API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT: Update feedback status
export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, status } = body;

        if (!id || !status) {
            return NextResponse.json({ error: 'Missing id or status' }, { status: 400 });
        }

        const validStatuses = ['pending', 'reviewed', 'resolved', 'published'];
        if (!validStatuses.includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('user_feedback')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) {
            return NextResponse.json({ error: 'Failed to update feedback' }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
