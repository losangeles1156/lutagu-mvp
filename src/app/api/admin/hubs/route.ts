/**
 * GET /api/admin/hubs - List all hubs with statistics
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        // Get hubs with member counts
        const { data: hubs, error } = await supabase
            .from('hub_metadata')
            .select(`
                hub_id,
                transfer_type,
                walking_distance_meters,
                indoor_connection_notes,
                transfer_complexity,
                display_order,
                is_active,
                created_at,
                updated_at
            `)
            .order('display_order');

        if (error) {
            console.error('[api/admin/hubs] Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Get member count for each hub
        const { data: memberCounts, error: countError } = await supabase
            .from('hub_members')
            .select('hub_id')
            .eq('is_active', true);

        if (countError) {
            console.error('[api/admin/hubs] Count error:', countError);
        }

        // Build hub list with member counts
        const hubList = (hubs || []).map(hub => {
            const count = memberCounts?.filter(m => m.hub_id === hub.hub_id).length || 0;
            return {
                id: hub.hub_id,
                hub_id: hub.hub_id,
                name: hub.hub_id.split(':').pop()?.replace(/\./g, ' ') || hub.hub_id,
                transfer_type: hub.transfer_type,
                walking_distance_meters: hub.walking_distance_meters,
                indoor_connection_notes: hub.indoor_connection_notes,
                transfer_complexity: hub.transfer_complexity,
                child_count: count,
                is_active: hub.is_active
            };
        });

        // Get total counts
        const { count: totalHubs } = await supabase.from('hub_metadata').select('*', { count: 'exact', head: true });
        const { count: activeHubs } = await supabase.from('hub_metadata').select('*', { count: 'exact', head: true }).eq('is_active', true);
        const { count: totalMembers } = await supabase.from('hub_members').select('*', { count: 'exact', head: true });

        return NextResponse.json({
            hubs: hubList,
            stats: {
                totalHubs,
                activeHubs,
                totalMembers
            }
        });
    } catch (err: any) {
        console.error('[api/admin/hubs] Unexpected error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
