
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

async function inspectUenoNode() {
    console.log('--- Inspecting Ueno Node ---');

    // Search for Ueno in 'nodes'
    const { data: nodes, error } = await supabase
        .from('nodes')
        .select('*')
        .ilike('name->>ja', '%上野%') // Assuming name is JSONB or just text. If text, just 'name'
        .limit(5);

    if (error) {
        // Retry with plain text search if JSONB access fails (or vice versa)
        console.log('JSON search failed, trying plain text...');
        const { data: nodes2, error: error2 } = await supabase
            .from('nodes')
            .select('*')
            .ilike('name', '%上野%')
            .limit(5);

        if (error2) console.log('Error fetching nodes:', error2.message);
        else printNodes(nodes2);
    } else {
        printNodes(nodes);
    }
}

function printNodes(nodes: any[]) {
    if (!nodes || nodes.length === 0) {
        console.log('No Ueno node found.');
        return;
    }

    console.log(`Found ${nodes.length} nodes:`);
    nodes.forEach(n => {
        console.log(`\nID: ${n.id}`);
        console.log(`Name: ${JSON.stringify(n.name)}`);
        console.log(`Type: ${n.node_type}`);
        console.log(`Facility Profile: ${JSON.stringify(n.facility_profile)}`);
        console.log(`Transit Lines: ${JSON.stringify(n.transit_lines)}`);
    });

    const uenoId = nodes[0].id;
    checkFares(uenoId);
}

async function checkFares(stationId: string) {
    console.log(`\n--- Checking Fares for ID: ${stationId} ---`);
    const { count, error } = await supabase
        .from('fares')
        .select('*', { count: 'exact', head: true })
        .or(`from_station_id.eq.${stationId},to_station_id.eq.${stationId}`);

    if (error) console.log('Fares error:', error.message);
    else console.log(`Fares count: ${count}`);
}

inspectUenoNode();
