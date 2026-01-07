
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkAirports() {
    console.log('Checking for Airport Nodes...');

    const keywords = ['Haneda', 'Narita', 'Airport'];

    for (const keyword of keywords) {
        const { data, error } = await supabase
            .from('nodes')
            .select('id, name, node_type, parent_station_id')
            .ilike('id', `%${keyword}%`)
            .limit(20);

        if (error) {
            console.error(`Error searching for ${keyword}:`, error);
            continue;
        }

        console.log(`\nResults for "${keyword}":`);
        if (data.length === 0) {
            console.log("  No nodes found.");
        } else {
            data.forEach(node => {
                console.log(`  - ${node.id} (${node.name?.ja || node.name?.en}) [${node.node_type}]`);
            });
        }
    }
}

checkAirports();
