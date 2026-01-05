/**
 * GET /api/admin/hubs/[hubId] - Get hub details with members
 * POST /api/admin/hubs/[hubId] - Toggle hub status
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ hubId: string }> }
) {
    const { hubId } = await params;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        // Get hub metadata
        const { data: hub, error } = await supabase
            .from('hub_metadata')
            .select('*')
            .eq('hub_id', hubId)
            .single();

        if (error || !hub) {
            return NextResponse.json({ error: 'Hub not found' }, { status: 404 });
        }

        // Get hub members
        const { data: members, error: membersError } = await supabase
            .from('hub_members')
            .select('*')
            .eq('hub_id', hubId)
            .eq('is_active', true)
            .order('sort_order');

        if (membersError) {
            console.error('[api/admin/hubs/[hubId]] Error fetching members:', membersError);
            return NextResponse.json({ error: membersError.message }, { status: 500 });
        }

        return NextResponse.json({
            hub: {
                id: hub.hub_id,
                hub_id: hub.hub_id,
                transfer_type: hub.transfer_type,
                walking_distance_meters: hub.walking_distance_meters,
                indoor_connection_notes: hub.indoor_connection_notes,
                transfer_complexity: hub.transfer_complexity,
                is_active: hub.is_active
            },
            members: members || []
        });
    } catch (err: any) {
        console.error('[api/admin/hubs/[hubId]] Unexpected error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ hubId: string }> }
) {
    const { hubId } = await params;
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'activate';

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        const body = await req.json();

        if (action === 'activate' || action === 'deactivate') {
            const isActive = action === 'activate';
            const { error } = await supabase
                .from('hub_metadata')
                .update({ is_active: isActive, updated_at: new Date().toISOString() })
                .eq('hub_id', hubId);

            if (error) {
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            return NextResponse.json({ success: true, is_active: isActive });
        }

        if (action === 'unmerge') {
            const { memberIds } = body;
            if (!memberIds || !Array.isArray(memberIds)) {
                return NextResponse.json({ error: 'memberIds array required' }, { status: 400 });
            }

            const { error } = await supabase
                .from('hub_members')
                .update({ is_active: false, updated_at: new Date().toISOString() })
                .eq('hub_id', hubId)
                .in('member_id', memberIds);

            if (error) {
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            return NextResponse.json({ success: true, unmergedCount: memberIds.length });
        }

        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    } catch (err: any) {
        console.error('[api/admin/hubs/[hubId]] POST error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
