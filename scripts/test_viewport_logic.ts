
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testViewportApi() {
    console.log('--- Testing Viewport Logic ---');
    
    // Shinjuku area
    const center = { lat: 35.690921, lon: 139.700258 };
    const radius = 2000;

    console.log(`Calling nearby_nodes_v2 at ${center.lat}, ${center.lon} with radius ${radius}m...`);
    
    const { data, error } = await supabase.rpc('nearby_nodes_v2', {
        center_lat: center.lat,
        center_lon: center.lon,
        radius_meters: radius,
        max_results: 100
    });

    if (error) {
        console.error('RPC Error:', error);
        return;
    }

    console.log(`RPC returned ${data?.length || 0} nodes.`);
    
    if (data && data.length > 0) {
        console.log('First 3 nodes from RPC:');
        console.log(JSON.stringify(data.slice(0, 3), null, 2));
        
        const shinjukuNodes = data.filter((n: any) => 
            JSON.stringify(n.name).includes('Shinjuku') || JSON.stringify(n.name).includes('新宿')
        );
        console.log(`Found ${shinjukuNodes.length} Shinjuku related nodes in RPC results.`);
        shinjukuNodes.slice(0, 5).forEach((n: any) => {
            console.log(`- ${n.id}: ${JSON.stringify(n.name)} (Active: ${n.is_active}, Type: ${n.type})`);
        });
    }

    // Now let's check the filtering logic in viewport/route.ts
    // const excludedTypes = ['bus_stop', 'poi', 'place', 'facility', 'entrance', 'exit', 'shopping', 'restaurant'];
    console.log('\n--- Checking Filter Logic ---');
    const nodes = data || [];
    const excludedTypes = ['bus_stop', 'poi', 'place', 'facility', 'entrance', 'exit', 'shopping', 'restaurant'];
    
    const filtered = nodes.filter((n: any) => {
        const type = String(n.type || n.node_type || '').toLowerCase();
        return !excludedTypes.includes(type);
    });
    
    console.log(`After type filtering: ${filtered.length} nodes remaining.`);
    
    const hubs = filtered.filter((n: any) => n.is_hub);
    console.log(`Hub nodes: ${hubs.length}`);
}

testViewportApi();
