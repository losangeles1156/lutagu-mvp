
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

const TARGET_ID = 'odpt:Station:JR-East.Ueno';

const SOURCE_IDS = [
    'odpt.Station:JR-East.Yamanote.Ueno',
    'odpt:Station:JR-East.Yamanote.Ueno', // Handle potential colon differences
    'odpt.Station:JR-East.KeihinTohoku.Ueno',
    'odpt:Station:JR-East.KeihinTohoku.Ueno',
    'odpt.Station:JR-East.Joban.Ueno',
    'odpt:Station:JR-East.Joban.Ueno',
    'odpt.Station:TokyoMetro.Ginza.Ueno',
    'odpt.Station:TokyoMetro.Hibiya.Ueno',
    'odpt.Station:Keisei.Main.KeiseiUeno',
    'Hub:Ueno'
];

async function consolidateUeno() {
    console.log(`Consolidating Ueno data to ${TARGET_ID}...`);

    for (const sourceId of SOURCE_IDS) {
        if (sourceId === TARGET_ID) continue;

        console.log(`\nProcessing source: ${sourceId}`);

        // Fetch all places from source
        const { data: places, error } = await supabase
            .from('l1_places')
            .select('id, name, osm_id, category')
            .eq('station_id', sourceId);

        if (error) {
            console.error(`Error fetching from ${sourceId}:`, error);
            continue;
        }

        if (!places || places.length === 0) {
            console.log(`No places in ${sourceId}.`);
            continue;
        }

        console.log(`Found ${places.length} places in ${sourceId}.`);

        let moved = 0;
        let deleted = 0;

        for (const place of places) {
            // Check if this OSM ID already exists in TARGET
            // (Assuming osm_id is reliable. If null, we might rely on name, but let's stick to osm_id first)

            let exists = false;
            if (place.osm_id) {
                const { data: existing } = await supabase
                    .from('l1_places')
                    .select('id')
                    .eq('station_id', TARGET_ID)
                    .eq('osm_id', place.osm_id)
                    .single();
                exists = !!existing;
            } else {
                // If no osm_id, check by name (risky but needed for non-osm data)
                 const { data: existing } = await supabase
                    .from('l1_places')
                    .select('id')
                    .eq('station_id', TARGET_ID)
                    .eq('name', place.name)
                    .single();
                exists = !!existing;
            }

            if (exists) {
                // Duplicate -> Delete source
                // console.log(`Duplicate: ${place.name} (${place.id}) -> Deleting...`);
                const { error: delError } = await supabase
                    .from('l1_places')
                    .delete()
                    .eq('id', place.id);

                if (delError) console.error(`Failed to delete ${place.id}:`, delError);
                else deleted++;
            } else {
                // Unique -> Move to Target
                // console.log(`Moving: ${place.name} (${place.id})...`);
                const { error: moveError } = await supabase
                    .from('l1_places')
                    .update({ station_id: TARGET_ID })
                    .eq('id', place.id);

                if (moveError) {
                    // Check if it failed due to unique constraint (race condition or check miss)
                    if (moveError.code === '23505') {
                        // It exists! Delete it.
                         await supabase.from('l1_places').delete().eq('id', place.id);
                         deleted++;
                    } else {
                        console.error(`Failed to move ${place.id}:`, moveError);
                    }
                } else {
                    moved++;
                }
            }
        }
        console.log(`Result for ${sourceId}: Moved ${moved}, Deleted ${deleted} duplicates.`);
    }

    // Also fix Zoo Category
    console.log('\nFixing Zoo Categories...');
    const { error: zooError } = await supabase
        .from('l1_places')
        .update({ category: 'tourism' })
        .eq('station_id', TARGET_ID)
        .or('name.ilike.%Zoo%,name.ilike.%動物園%')
        .neq('category', 'tourism');

    if (zooError) console.error('Error updating zoo category:', zooError);
    else console.log('Zoo categories updated to tourism.');
}

consolidateUeno();
