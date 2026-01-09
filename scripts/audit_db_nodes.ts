
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkNodes() {
    console.log('--- Database Node Audit ---');
    
    const { count: totalNodes, error: countError } = await supabase
        .from('nodes')
        .select('*', { count: 'exact', head: true });
        
    if (countError) {
        console.error('Error counting nodes:', countError);
        return;
    }
    console.log('Total nodes in table:', totalNodes);

    const { count: activeNodes, error: activeError } = await supabase
        .from('nodes')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
        
    console.log('Active nodes:', activeNodes);

    const { count: stations, error: stationError } = await supabase
        .from('nodes')
        .select('*', { count: 'exact', head: true })
        .eq('node_type', 'station');
        
    console.log('Station nodes:', stations);

    const { count: activeStations, error: activeStationError } = await supabase
        .from('nodes')
        .select('*', { count: 'exact', head: true })
        .eq('node_type', 'station')
        .eq('is_active', true);
        
    console.log('Active station nodes:', activeStations);

    const { data: sampleNodes, error: sampleError } = await supabase
        .from('nodes')
        .select('id, name, node_type, is_active, parent_hub_id')
        .limit(5);
        
    console.log('Sample nodes:', JSON.stringify(sampleNodes, null, 2));
}

checkNodes();
