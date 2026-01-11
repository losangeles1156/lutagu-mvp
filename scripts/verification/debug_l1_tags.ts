
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

async function check() {
    console.log('Checking L1 Places...');

    // 1. Get Ueno Node ID
    const { data: nodes } = await supabase
        .from('nodes')
        .select('id, name')
        .eq('name->>en', 'Ueno');

    console.log('Ueno Nodes:', nodes);

    if (nodes && nodes.length > 0) {
        const nodeId = nodes[0].id; // Likely 'odpt:Station:TokyoMetro.Ueno' or similar
        // 2. Check places linked to this node
        const { data: places, error } = await supabase
            .from('l1_places')
            .select('id, name, category, tags_core, station_id')
            .eq('station_id', nodeId)
            .limit(5);

        if (error) console.error('Error fetching places:', error);
        console.log(`L1 Places for Ueno (${nodeId}):`, places);
    }

    // 3. Check if ANY tags exist in table
    const { count } = await supabase
        .from('l1_places')
        .select('*', { count: 'exact', head: true })
        .not('tags_core', 'is', null);

    console.log('Total places with tags_core not null:', count);

    // 4. Check if Array is empty
    const { data: taggedPlaces } = await supabase
        .from('l1_places')
        .select('name, category, tags_core')
        .not('tags_core', 'is', null)
        .limit(5);

    console.log('Sample Tagged Places:', taggedPlaces);
}

check().catch(console.error);
