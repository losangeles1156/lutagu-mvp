import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { TrackFunnelPayload } from '@/lib/types/analytics';

export async function POST(req: NextRequest) {
    try {
        const payload: TrackFunnelPayload = await req.json();
        const { funnel_name, step_number, step_name, session_id, visitor_id, metadata } = payload;

        if (!funnel_name || !step_number || !session_id || !visitor_id) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Get Funnel ID
        const { data: funnel } = await supabaseAdmin
            .from('funnels')
            .select('id')
            .eq('name', funnel_name)
            .single();

        if (!funnel) {
            return NextResponse.json({ error: `Funnel '${funnel_name}' not found` }, { status: 404 });
        }

        // 2. Insert Event
        const { error } = await supabaseAdmin
            .from('funnel_events')
            .insert({
                funnel_id: funnel.id,
                session_id,
                visitor_id,
                step_number,
                step_name,
                metadata,
                created_at: new Date().toISOString()
            });

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Funnel Tracking Error]', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
