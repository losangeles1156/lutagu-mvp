
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    // Get all station IDs from stations_static
    const { data: stations, error: sError } = await supabase
        .from('stations_static')
        .select('id');

    if (sError) {
        console.error('Error fetching stations:', sError);
        return;
    }

    const stationIds = stations.map(s => s.id);
    console.log(`Total stations in stations_static: ${stationIds.length}`);

    // Check how many of these exist in nodes
    const { data: nodes, error: nError } = await supabase
        .from('nodes')
        .select('id')
        .in('id', stationIds.slice(0, 100)); // Reduced to 100

    if (nError) {
        console.error('Error fetching nodes:', nError);
        return;
    }

    const nodeIds = new Set(nodes.map(n => n.id));
    const missing = stationIds.slice(0, 100).filter(id => !nodeIds.has(id));

    console.log(`Matched: ${nodeIds.size} / ${Math.min(100, stationIds.length)}`);
    if (missing.length > 0) {
        console.log('Sample missing IDs in nodes:', missing.slice(0, 10));
    } else {
        console.log('All sample IDs found in nodes.');
    }
}

check();
