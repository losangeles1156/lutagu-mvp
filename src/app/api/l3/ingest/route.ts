
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Helper to sanitize text
const sanitize = (text: string) => text?.replace(/\s+/g, ' ').trim() || '';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { stationId, facilities } = body;

        if (!stationId || !Array.isArray(facilities)) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        console.log(`[L3 Ingest] Processing ${facilities.length} items for ${stationId}`);

        const upsertData = facilities.map((item: any) => {
            // Determine type
            let type = 'unknown';
            const tags = item.tags || {};

            if (tags.amenity === 'toilets') type = 'toilet';
            else if (tags.highway === 'elevator' || tags.railway === 'subway_entrance') type = 'elevator';
            else if (tags.amenity === 'locker') type = 'locker';
            else if (tags.amenity === 'atm') type = 'atm';
            else if (tags.amenity === 'vending_machine') type = 'vending';
            else if (tags.smoking === 'yes' || tags.amenity === 'smoking_area') type = 'smoking';
            else type = item.category || 'other';

            return {
                station_id: stationId,
                type: type,
                // L3 ID strategy: unique per station + osm_id
                // Use a synthetic ID or rely on osm_id unique constraint?
                // Let's rely on standard ID but store OSM info in attributes if needed.
                // Actually, for upsert we need a unique constraint.
                // We'll use osm_id if available, but l3_facilities PK is UUID.
                // So we should query first or use a unique composite key?
                // Simpler: Just delete old ones? No, expensive.
                // Better: Add `osm_id` column to l3_facilities if strict upsert needed.
                // CURRENT SCHEMA: `id` (uuid), `station_id`, `type`, `name_i18n`, `attributes`...
                // Lacking `osm_id`. I should assume `attributes` stores osm_id for check,
                // OR just append.
                // WAIT. Schema `003` I created DOES NOT have `osm_id` column explicitly.
                // I should add it or use `attributes->>'osm_id'`.

                // DECISION: For now, I will blindly insert? No, duplicates.
                // I will add `osm_id` to attributes and try to Deduplicate in SQL?
                // Or better: Modify Schema to include `osm_id` unique constraint.
                // BUT user might have deployed schema already.
                // Let's use `attributes` for now and maybe delete-insert?
                // Delete-insert by Type for Station is safer to keep it clean.
                // "Delete all toilets for Ueno, Insert new toilets".

                name_i18n: {
                    en: sanitize(tags.name || tags.description || type),
                    ja: sanitize(tags['name:ja'] || tags.name || type)
                },
                location_coords: item.location ? `POINT(${item.location.lon} ${item.location.lat})` : null,
                attributes: {
                    osm_id: item.osm_id,
                    ...tags
                }
            };
        });

        // Current Strategy: Delete existing of same type for this station, then Insert.
        // This ensures fresh sync and handles removals.
        const types = [...new Set(upsertData.map((d: any) => d.type))];

        // 1. Delete old
        await supabase.from('l3_facilities')
            .delete()
            .eq('station_id', stationId)
            .in('type', types);

        // 2. Insert new
        const { error } = await supabase.from('l3_facilities').insert(upsertData);

        if (error) {
            console.error('[L3 Ingest] Insert Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, count: upsertData.length });

    } catch (error) {
        console.error('[L3 Ingest] Invalid Request:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
