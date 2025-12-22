
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const stationId = searchParams.get('station_id');

    if (!stationId) {
        return NextResponse.json({ error: 'Missing station_id' }, { status: 400 });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('transit_dynamic_snapshot')
            .select(`
                *,
                stations_static (
                    l1_ai_personality_summary
                )
            `)
            .eq('station_id', stationId)
            .gt('updated_at', new Date(Date.now() - 15 * 60 * 1000).toISOString()) // 15 mins expiry
            .order('updated_at', { ascending: false })
            .limit(1)
            .single();

        if (error) {
            console.error('Error fetching L2 status:', error);
            return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 });
        }

        if (!data) return NextResponse.json(null);

        // Transform Flat DB columns (from n8n) to Frontend Interface
        const l2Status = {
            congestion: data.status_code === 'DELAY' ? 4 : (data.status_code === 'SUSPENDED' ? 5 : 2),
            line_status: [{
                line: 'Sourced via n8n',
                status: data.status_code?.toLowerCase() || 'normal',
                message: data.reason_ja || 'Operating normally'
            }],
            weather: {
                temp: data.weather_info?.temp || 0,
                condition: data.weather_info?.condition || 'Unknown'
            },
            updated_at: data.updated_at
        };

        return NextResponse.json(l2Status);
    } catch (e) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
