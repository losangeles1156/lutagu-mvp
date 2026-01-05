import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { STATION_LINES } from '@/lib/constants/stationLines';

/**
 * Admin API to sync transit_lines from STATION_LINES constant to nodes table
 * POST /api/admin/nodes/sync-transit-lines
 */
export async function POST(request: Request) {
    try {
        const updates: { id: string; transit_lines: string[] }[] = [];

        // Build update list from STATION_LINES constant
        for (const [stationId, lineDefs] of Object.entries(STATION_LINES)) {
            const transit_lines = lineDefs.map(line => line.name.en);
            updates.push({ id: stationId, transit_lines });
        }

        let successCount = 0;
        let errorCount = 0;
        const errors: string[] = [];

        // Batch update nodes
        for (const update of updates) {
            const { error } = await supabaseAdmin
                .from('nodes')
                .update({ transit_lines: update.transit_lines })
                .eq('id', update.id);

            if (error) {
                errorCount++;
                errors.push(`${update.id}: ${error.message}`);
            } else {
                successCount++;
            }
        }

        return NextResponse.json({
            success: true,
            message: `Synced transit_lines for ${successCount} stations`,
            total_stations_in_constant: updates.length,
            success_count: successCount,
            error_count: errorCount,
            errors: errors.slice(0, 10) // Limit error output
        });

    } catch (e) {
        console.error('Sync transit_lines error:', e);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
