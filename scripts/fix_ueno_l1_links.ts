
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

async function fixUenoData() {
    console.log('--- Fixing Ueno Data (Consolidation & Categories) ---');
    const hubId = 'Hub:Ueno';

    // 1. Consolidate Ueno Station Places to Hub:Ueno
    // Target stations that should be merged into the Hub
    const targetStations = [
        'odpt:Station:JR-East.Ueno',
        'odpt.Station:JR-East.Ueno',
        'odpt.Station:TokyoMetro.Ginza.Ueno',
        'odpt.Station:TokyoMetro.Hibiya.Ueno',
        'odpt.Station:Keisei.KeiseiUeno'
    ];

    console.log(`Consolidating places from [${targetStations.join(', ')}] to ${hubId}...`);

    const { data: placesToMove, error: moveError } = await supabase
        .from('l1_places')
        .select('id, name, station_id')
        .in('station_id', targetStations);

    if (moveError) {
        console.error('Move Search Error:', moveError);
    } else if (placesToMove && placesToMove.length > 0) {
        console.log(`Found ${placesToMove.length} places to move.`);
        const ids = placesToMove.map(p => p.id);

        const { error: updateError } = await supabase
            .from('l1_places')
            .update({ station_id: hubId })
            .in('id', ids);

        if (updateError) console.error('Update Error:', updateError);
        else console.log(`✅ Moved ${ids.length} places to ${hubId}`);
    } else {
        console.log('No places found to move.');
    }

    // 2. Fix Ueno Zoo Category
    console.log('\n--- Fixing Ueno Zoo Category ---');
    // Find Ueno Zoo variants
    // Use a raw filter string for complex OR logic across columns if needed,
    // or just fetch all zoos and filter in memory to be safe.
    const { data: zoos, error: zooError } = await supabase
        .from('l1_places')
        .select('*')
        .or('name.ilike.%Zoo%,name.ilike.%動物園%');

    if (zooError) {
         console.error('Zoo Search Error:', zooError);
    } else if (zoos && zoos.length > 0) {
        // Filter in memory for Ueno/上野
        const uenoZoos = zoos.filter(z =>
            (z.name && (z.name.toLowerCase().includes('ueno') || z.name.includes('上野'))) ||
            (z.name_i18n && JSON.stringify(z.name_i18n).toLowerCase().includes('ueno'))
        );

        console.log(`Found ${uenoZoos.length} Ueno Zoo entries.`);

        if (uenoZoos.length > 0) {
            // 1. Update Category for ALL
            const zooIds = uenoZoos.map(z => z.id);
            const { error: catError } = await supabase
                .from('l1_places')
                .update({ category: 'nature' })
                .in('id', zooIds);

            if (catError) console.error('Category Update Error:', catError);
            else console.log('✅ Updated categories to nature');

            // 2. Try to move to Hub:Ueno one by one to handle duplicates
            for (const zoo of uenoZoos) {
                if (zoo.station_id === hubId) continue; // Already there

                const { error: moveError } = await supabase
                    .from('l1_places')
                    .update({ station_id: hubId })
                    .eq('id', zoo.id);

                if (moveError) {
                    if (moveError.code === '23505') {
                        console.log(`Duplicate skipped: ${zoo.name} (${zoo.id}) already exists on Hub.`);
                        // Optional: Delete this duplicate if we want to clean up?
                        // await supabase.from('l1_places').delete().eq('id', zoo.id);
                    } else {
                        console.error(`Move Error for ${zoo.name}:`, moveError);
                    }
                } else {
                    console.log(`Moved ${zoo.name} to Hub:Ueno`);
                }
            }
        }
    } else {
        console.log('No Ueno Zoo found (check name variations).');
    }
}

fixUenoData();
