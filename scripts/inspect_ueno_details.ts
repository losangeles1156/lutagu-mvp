
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

async function inspectUenoDetails() {
    const stationId = 'odpt.Station:TokyoMetro.Ginza.Ueno';
    console.log(`--- Inspecting Details for ${stationId} ---`);

    // 1. Check Fares
    const { count: fareCount, error: fareError } = await supabase
        .from('fares')
        .select('*', { count: 'exact', head: true })
        .or(`from_station_id.eq.${stationId},to_station_id.eq.${stationId}`);

    if (fareError) console.log('Fares error:', fareError.message);
    else console.log(`Fares found: ${fareCount}`);

    // 2. Check POIs (using lat/lon if possible, or just list some POIs to see structure)
    // Ueno coords: 35.7088, 139.7741 (Approx)
    // Assuming POIs have lat/lon.
    console.log('\n--- Checking POIs ---');
    const { data: pois, error: poiError } = await supabase
        .from('pois') // Assuming table name
        .select('*')
        .limit(5);

    if (poiError) {
         // Maybe 'places' table with type='poi'?
         console.log('POIs table check failed, trying places/nodes...');
         const { count: nodePoiCount } = await supabase
            .from('nodes')
            .select('*', { count: 'exact', head: true })
            .eq('node_type', 'poi'); // Guessing type
         console.log(`Nodes with type 'poi': ${nodePoiCount}`);
    } else {
        console.log(`Found ${pois?.length} POIs in 'pois' table.`);
        if (pois && pois.length > 0) console.log('Sample POI:', pois[0]);
    }
}

inspectUenoDetails();
