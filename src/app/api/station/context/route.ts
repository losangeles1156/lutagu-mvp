import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/station/context?station_id=odpt.Station:...
 * 
 * Returns:
 * - busy_level: Tier based on historical passenger journeys
 * - annual_journeys: Number from latest survey year
 * - active_alerts: Array of real-time alerts affecting this station's railway
 */

type BusyLevel = 'Quiet' | 'Moderate' | 'Busy' | 'Very Busy' | 'Unknown';

function calculateBusyLevel(journeys: number | null): BusyLevel {
    if (!journeys) return 'Unknown';
    if (journeys < 50000) return 'Quiet';
    if (journeys < 200000) return 'Moderate';
    if (journeys < 500000) return 'Busy';
    return 'Very Busy';
}

export async function GET(req: NextRequest) {
    const stationId = req.nextUrl.searchParams.get('station_id');

    if (!stationId) {
        return NextResponse.json({ error: 'station_id is required' }, { status: 400 });
    }

    try {
        // 1. Fetch station stats (latest year)
        const { data: statsData, error: statsError } = await supabaseAdmin
            .from('station_stats')
            .select('station_id, survey_year, passenger_journeys')
            .eq('station_id', stationId)
            .order('survey_year', { ascending: false })
            .limit(1)
            .maybeSingle();

        // 2. Extract railway ID from station ID (e.g., odpt.Station:TokyoMetro.Ginza.Shibuya -> TokyoMetro.Ginza)
        const railwayMatch = stationId.match(/odpt\.Station:([^.]+\.[^.]+)/);
        const railwayId = railwayMatch ? `odpt.Railway:${railwayMatch[1]}` : null;

        // 3. Fetch active alerts for this railway
        let activeAlerts: { status: string; text: string }[] = [];
        if (railwayId) {
            const { data: alertsData } = await supabaseAdmin
                .from('transit_alerts')
                .select('status, text_ja')
                .eq('railway', railwayId);

            if (alertsData) {
                activeAlerts = alertsData.map(a => ({
                    status: a.status || 'Unknown',
                    text: a.text_ja || ''
                }));
            }
        }

        const annualJourneys = statsData?.passenger_journeys || null;
        const busyLevel = calculateBusyLevel(annualJourneys);

        return NextResponse.json({
            station_id: stationId,
            busy_level: busyLevel,
            active_alerts: activeAlerts
        });

    } catch (error: any) {
        console.error('[Station Context API] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
