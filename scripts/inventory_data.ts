
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!
);

async function main() {
    console.log('=== Data Inventory ===');

    // 1. Stations Count
    const { count: totalStations, error: stationError } = await supabase
        .from('stations_static')
        .select('*', { count: 'exact', head: true });

    if (stationError) {
        console.error('Error fetching stations:', stationError.message);
    } else {
        console.log(`Total Stations in DB: ${totalStations}`);
    }

    // 2. Breakdown by Operator (approximate via ID)
    const { data: stations } = await supabase.from('stations_static').select('id, city_id');
    const operatorCounts: Record<string, number> = {};
    const cityCounts: Record<string, number> = {};

    stations?.forEach(s => {
        let op = 'Other';
        if (s.id.includes('TokyoMetro')) op = 'Tokyo Metro';
        else if (s.id.includes('Toei')) op = 'Toei Subway';
        else if (s.id.includes('JR-East')) op = 'JR East';
        else if (s.id.includes('Tsukuba')) op = 'Tsukuba Express';
        else if (s.id.includes('Monorail')) op = 'Tokyo Monorail';

        operatorCounts[op] = (operatorCounts[op] || 0) + 1;
        cityCounts[s.city_id] = (cityCounts[s.city_id] || 0) + 1;
    });

    console.log('\n--- By Operator ---');
    console.log(JSON.stringify(operatorCounts, null, 2));

    console.log('\n--- By City/Zone ---');
    console.log(JSON.stringify(cityCounts, null, 2));

    // List all IDs to see what we actually have
    console.log('\n--- All Station IDs ---');
    console.log(stations?.map(s => s.id).join('\n'));

    // 3. L1 Places Count
    const { count: l1Count } = await supabase
        .from('l1_places')
        .select('*', { count: 'exact', head: true });
    console.log(`\nTotal L1 Places (Facilities): ${l1Count}`);

    // 4. L3 Facilities Check (stations_static.l3_facilities column or similar?)
    // Checking schema via select first row
    const { data: sample } = await supabase.from('stations_static').select('l3_facilities, facility_tags').limit(1);
    // console.log('Sample L3 structure:', sample?.[0]);

    // 5. Specific Stations Check
    const targets = [
        'odpt.Station:JR-East.Yamanote.Tokyo',
        'odpt.Station:JR-East.Yamanote.Shinjuku',
        'odpt.Station:JR-East.Yamanote.Shibuya',
        'odpt.Station:JR-East.Yamanote.Ikebukuro',
        'odpt.Station:TokyoMetro.Ginza.Asakusa',
        'odpt.Station:TokyoMonorail.Haneda.HanedaAirportTerminal1',
        'odpt.Station:Keisei.KeiseiSkyliner.NaritaAirportTerminal1'
    ];

    console.log('\n--- Target Stations Check ---');
    for (const t of targets) {
        // Try exact match or match containing ID part
        const search = t.split('.').pop(); // e.g. Tokyo
        const { data: hits } = await supabase
            .from('stations_static')
            .select('id, name')
            .ilike('id', `%${search}%`)
            .limit(1);

        if (hits && hits.length > 0) {
            console.log(`✅ Found similar to ${search}: ${hits[0].id}`);
        } else {
            console.log(`❌ Missing similar to ${search}`);
        }
    }
}

main();
