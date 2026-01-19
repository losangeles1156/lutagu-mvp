
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

const TARGET_UENO_ID = 'odpt:Station:JR-East.Ueno';

const VALID_UENO_IDS = [
    'odpt:Station:JR-East.Ueno',
    'odpt:Station:JR-East.Yamanote.Ueno',
    'odpt:Station:JR-East.KeihinTohoku.Ueno',
    'odpt:Station:JR-East.Joban.Ueno',
    'odpt:Station:JR-East.Utsunomiya.Ueno',
    'odpt:Station:JR-East.Takasaki.Ueno',
    'odpt.Station:TokyoMetro.Ginza.Ueno',
    'odpt.Station:TokyoMetro.Hibiya.Ueno',
    'odpt.Station:Keisei.KeiseiMain.KeiseiUeno',
    'Hub:Ueno'
];

// Stations that are "Ueno-adjacent" but DISTINCT - we should NOT move these if the name clearly matches
const DISTINCT_UENO_AREA_IDS = [
    'odpt.Station:TokyoMetro.Ginza.UenoHirokoji',
    'odpt.Station:Toei.Oedo.UenoOkachimachi',
    'odpt:Station:JR-East.Okachimachi'
];

async function fixUenoData() {
    console.log('--- Fixing Ueno Data ---');

    // 1. Find and Fix Ueno Zoo
    console.log('\n1. Fixing Ueno Zoo...');
    const { data: zooData, error: zooError } = await supabase
        .from('l1_places')
        .select('id, name, category, station_id')
        .or('name.ilike.%Ueno Zoo%,name.ilike.%上野動物園%');

    if (zooError) console.error('Error finding zoo:', zooError);
    else if (zooData && zooData.length > 0) {
        console.log(`Found ${zooData.length} zoo entries.`);
        for (const zoo of zooData) {
            console.log(`Updating Zoo: ${zoo.name} (${zoo.id}) - Current Cat: ${zoo.category}`);
            const { error: updateError } = await supabase
                .from('l1_places')
                .update({
                    category: 'tourism', // or 'attraction' if supported, 'tourism' is safe
                    station_id: TARGET_UENO_ID
                })
                .eq('id', zoo.id);

            if (updateError) console.error(`Failed to update ${zoo.name}:`, updateError);
            else console.log(`Updated ${zoo.name} successfully.`);
        }
    } else {
        console.log('No Ueno Zoo entries found.');
    }

    // 2. Fix misplaced Ueno places
    console.log('\n2. Fixing misplaced Ueno places...');

    // Fetch all places with "Ueno" in name
    // We have to do client-side filtering because "NOT IN" with array is hard in simple query builder with other conditions
    const { data: uenoPlaces, error: uenoError } = await supabase
        .from('l1_places')
        .select('id, name, station_id, category')
        .ilike('name', '%Ueno%');

    if (uenoError) {
        console.error('Error fetching Ueno places:', uenoError);
        return;
    }

    console.log(`Found ${uenoPlaces.length} places with "Ueno" in name.`);

    let movedCount = 0;
    for (const place of uenoPlaces) {
        // Skip if already in valid Ueno IDs
        if (VALID_UENO_IDS.includes(place.station_id)) continue;

        // Skip if in distinct adjacent areas AND name suggests it belongs there
        // e.g. "Ueno Hirokoji" in name and station is UenoHirokoji -> Keep it
        if (DISTINCT_UENO_AREA_IDS.includes(place.station_id)) {
            // If the name explicitly says "Ueno Hirokoji" or "Ueno-hirokoji", keep it
            if (place.name.toLowerCase().includes('hirokoji') || place.name.toLowerCase().includes('okachimachi')) {
                continue;
            }
        }

        // If it's linked to Inaricho, Akihabara, Iriya, etc., and has Ueno in name, move it.
        // But be careful: "Ueno" might be part of "Uenohara" (different place) - unlikely in this context but possible.
        // Let's print what we are moving.

        console.log(`Moving "${place.name}" from ${place.station_id} to ${TARGET_UENO_ID}`);

        const { error: moveError } = await supabase
            .from('l1_places')
            .update({ station_id: TARGET_UENO_ID })
            .eq('id', place.id);

        if (moveError) console.error(`Failed to move ${place.name}:`, moveError);
        else movedCount++;
    }

    console.log(`Moved ${movedCount} places to Ueno.`);
}

fixUenoData();
