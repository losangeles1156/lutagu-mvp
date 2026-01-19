
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

async function inspectUenoData() {
    console.log('--- Inspecting Ueno Station Data ---');

    // 1. Search for Ueno in stations/places
    // Trying common ID patterns for Ueno
    const stationIds = ['odpt.Station:TokyoMetro.Ginza.Ueno', 'odpt.Station:JR-East.Yamanote.Ueno', 'Ueno'];

    // Check odpt_stations (if exists) or places table
    console.log('Checking "odpt_stations"...');
    const { data: stations, error: stError } = await supabase
        .from('odpt_stations')
        .select('id, title, station_code, location')
        .ilike('title->>ja', '%上野%')
        .limit(5);

    if (stError) console.log('Error fetching stations:', stError.message);
    else {
        console.log(`Found ${stations?.length} stations matching "上野":`);
        stations?.forEach(s => console.log(`- ${s.id} (${JSON.stringify(s.title)})`));
    }

    // Pick one ID for deep dive (likely the Tokyo Metro or JR one)
    const targetId = stations?.[0]?.id || 'odpt.Station:TokyoMetro.Ginza.Ueno';
    console.log(`\nDeep dive for: ${targetId}`);

    // 2. Check L3 Facilities linked to this station
    console.log('\nChecking "facilities" (L3)...');
    // Assuming facilities table has a 'station_id' or similar column
    const { data: facilities, error: facError } = await supabase
        .from('facilities') // Check table name validity
        .select('*')
        .eq('station_id', targetId); // Try matching column name

    if (facError) {
         // Fallback: maybe table is named differently or column is different
         console.log('Error fetching facilities (first attempt):', facError.message);
    } else {
        console.log(`Found ${facilities?.length} facilities.`);
        if (facilities?.length === 0) console.log('⚠️ No facilities found for this station ID.');
        else console.log('Sample facility:', facilities?.[0]);
    }

    // 3. Check Timetables
    console.log('\nChecking "timetables"...');
    const { count: timeCount, error: timeError } = await supabase
        .from('timetables')
        .select('*', { count: 'exact', head: true })
        .eq('station_id', targetId);

    if (timeError) console.log('Error fetching timetables:', timeError.message);
    else console.log(`Timetables count: ${timeCount}`);

    // 4. Check Fares
    console.log('\nChecking "fares"...');
    const { count: fareCount, error: fareError } = await supabase
        .from('fares')
        .select('*', { count: 'exact', head: true })
        .or(`origin_station_id.eq.${targetId},destination_station_id.eq.${targetId}`);

    if (fareError) console.log('Error fetching fares:', fareError.message);
    else console.log(`Fares count (origin or dest): ${fareCount}`);
}

inspectUenoData();
