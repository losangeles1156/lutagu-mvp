
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

async function checkUenoData() {
    console.log('--- Checking Ueno Data ---');

    // Ueno IDs
    const uenoIds = [
        'odpt:Station:TokyoMetro.Ginza.Ueno',
        'odpt:Station:TokyoMetro.Hibiya.Ueno',
        'odpt:Station:JR-East.Yamanote.Ueno',
        'odpt:Station:JR-East.KeihinTohoku.Ueno',
        'Hub:Ueno' // If aggregated
    ];

    // 1. Check L1 Places
    console.log('\n--- L1 Places (l1_places) ---');

    // Check what IDs the "Ueno" places actually have
    const { data: nameMatches } = await supabase
        .from('l1_places')
        .select('id, name, station_id, category')
        .ilike('name', '%Ueno%')
        .limit(10);

    console.log('Sample L1 Places with "Ueno" in name:');
    if (nameMatches) {
        nameMatches.forEach(p => console.log(`- [${p.name}] StationID: ${p.station_id || 'NULL'} Category: ${p.category}`));
    }

    // Check specifically for Zoo
    const { data: zooMatches } = await supabase
        .from('l1_places')
        .select('id, name, station_id, category, name_i18n')
        .or('name_i18n->>en.ilike.%Zoo%,name_i18n->>ja.ilike.%動物園%')
        .limit(5);

    console.log('\nSample "Zoo" places:');
    if (zooMatches) {
        zooMatches.forEach(p => console.log(`- [${p.name}] StationID: ${p.station_id || 'NULL'} Category: ${p.category}`));
    }

    // 2. Check L3 Facilities
    console.log('\n--- L3 Facilities (l3_facilities) ---');
    const { count: l3Count, data: l3Data, error: l3Error } = await supabase
        .from('l3_facilities')
        .select('id, type, station_id, attributes', { count: 'exact' }) // Removed location
        .in('station_id', uenoIds)
        .limit(10);

    if (l3Error) {
        console.error('L3 Facilities Error:', l3Error.message);
    } else {
        console.log(`Total L3 Facilities for Ueno: ${l3Count}`);
        console.table(l3Data);
    }
}

checkUenoData();
