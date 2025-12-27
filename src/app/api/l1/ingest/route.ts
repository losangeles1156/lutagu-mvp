import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { stationId, category, count, items } = body;

        console.log(`[Ingest] Received ${count} items for ${stationId} (${category})`);

        if (!items || items.length === 0) {
            return NextResponse.json({ message: 'No items to ingest' }, { status: 200 });
        }

        // Initialize Supabase (Use Service Key for Write Access)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

        // Check if key is service key (usually starts with eyJ and is long, or checking role later)
        // For MVP, valid key is enough.

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Transform items to DB schema
        const rows = items.map((item: any) => ({
            station_id: stationId,
            osm_id: item.osm_id,
            name: item.name,
            category: category,
            // Create PostGIS point: SRID 4326 is standard GPS
            location: `POINT(${item.location.lon} ${item.location.lat})`,
            tags: item.tags
        }));

        // Upsert to l1_places
        const { error } = await supabase
            .from('l1_places')
            .upsert(rows, { onConflict: 'station_id,osm_id' });

        if (error) {
            console.error('[Ingest] Supabase Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: `Ingested ${rows.length} items into l1_places`,
        });

    } catch (error) {
        console.error('[Ingest] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
