
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugLinks() {
    console.log('Debugging Links Query...');

    // 1. Get some nodes first
    const { data: nodes } = await supabase.rpc('get_nearby_accessibility_graph', {
        query_lat: 35.714,
        query_lon: 139.777,
        radius_meters: 500
    });

    if (!nodes || nodes.length === 0) {
        console.log('No nodes found.');
        return;
    }

    const validNodes = nodes.filter((n: any) => n.type === 'node');
    const nodeIds = validNodes.map((n: any) => n.id);
    console.log(`Found ${nodeIds.length} nodes.`);
    console.log('Sample IDs:', nodeIds.slice(0, 3));

    // 2. Test RPC
    console.log('\n--- Testing RPC ---');
    const { data: rpcLinks, error: rpcError } = await supabase.rpc('get_pedestrian_links_geojson', {
        target_node_ids: nodeIds
    });
    if (rpcError) console.error('RPC Error:', rpcError);
    else console.log(`RPC returned ${rpcLinks?.length || 0} links.`);

    // 3. Test Fallback Query
    console.log('\n--- Testing Fallback Query ---');
    const idList = nodeIds.map((id: string) => `"${id}"`).join(',');

    const { data: fallbackLinks, error: fallbackError } = await supabase
        .from('pedestrian_links')
        .select('*')
        .or(`start_node_id.in.(${idList}),end_node_id.in.(${idList})`);

    if (fallbackError) {
        console.error('Fallback Error:', fallbackError);
    } else {
        console.log(`Fallback returned ${fallbackLinks?.length || 0} links.`);
        if (fallbackLinks && fallbackLinks.length > 0) {
            console.log('Sample Link:', fallbackLinks[0]);
        }
    }
}

debugLinks();
