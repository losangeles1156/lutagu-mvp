import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        console.log('[API] Fetching pending stations for L1 Ingestion...');

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseKey);



        // 1. Get All Target Stations
        // Note: For 125 items, fetching all IDs is cheap.
        const { data: allNodes, error: nodesError } = await supabase
            .from('nodes')
            .select('id, name, coordinates')
            .eq('is_active', true);

        if (nodesError) throw nodesError;

        const targetOperators = ['TokyoMetro', 'Toei', 'JR-East', 'Keisei', 'TsukubaExpress'];
        // Filter by target operators
        const targetNodes = allNodes.filter((n: any) =>
            targetOperators.some(op => n.id.includes(op))
        );

        // 2. Get Completed Stations
        // We select distinct station_ids from l1_places
        // Using a hack: fetching all stations from l1_places might be heavy if millions of rows.
        // Better: use rpc or a separate 'job_status' table.
        // MVP: Fetch unique station_ids.
        // Since we can't do .distinct() easily, let's try a different approach.
        // For performance, we should probably have a 'last_l1_update' column on nodes, but we don't.
        // Alternative: checking each node strictly is N+1 queries.
        // Let's rely on a known list of completed IDs if we can, or just fetch all station_ids.
        // Actually, fetching just the column `station_id` for 125 stations x 500 places = 60k rows is manageable but not ideal.

        // Optimized: Let's fetch all unique station_ids using a Postgres function if available.
        // If not, we download the `station_id` column. 1MB of data approx. OK for MVP serverless function.

        const { data: completedData, error: completedError } = await supabase
            .from('l1_places')
            .select('station_id'); // Warning: this returns ALL rows.

        // Optimizing: If we have many rows, this will be slow.
        // Let's assume for MVP < 100k rows is OK.
        // If user deleted rows, we re-ingest.

        const completedSet = new Set((completedData || []).map((p: any) => p.station_id));

        // 3. Find Missing
        const pending = targetNodes.filter((n: any) => !completedSet.has(n.id));

        // 4. Prioritize Ueno if in pending
        const ueno = pending.find((n: any) => n.id.includes('Ueno') && (n.id.includes('Metro') || n.id.includes('JR')));
        if (ueno) {
            // Move Ueno to front
            const idx = pending.indexOf(ueno);
            pending.splice(idx, 1);
            pending.unshift(ueno);
        }

        // 5. Return Batch of 2 (Stable for Overpass)
        const batch = pending.slice(0, 2).map((n: any) => {
            let lat = 35.6812;
            let lng = 139.7671;

            if (n.coordinates && Array.isArray(n.coordinates.coordinates)) {
                lng = n.coordinates.coordinates[0];
                lat = n.coordinates.coordinates[1];
            } else if (typeof n.coordinates === 'string' && n.coordinates.startsWith('POINT')) {
                const match = n.coordinates.match(/POINT\(([-0-9\.]+) ([-0-9\.]+)\)/);
                if (match) {
                    lng = parseFloat(match[1]);
                    lat = parseFloat(match[2]);
                }
            }

            return {
                id: n.id,
                name: n.name.en ? n.name : { ja: n.name },
                location: { lat, lng }
            };
        });

        console.log(`[API] Found ${pending.length} pending stations. Returning ${batch.length} items to n8n.`);

        return NextResponse.json({
            pendingCount: pending.length,
            nodes: batch
        });

    } catch (error: any) {
        console.error('[API] Error in todo list:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
