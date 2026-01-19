
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugLinks() {
  console.log('Testing Link Fetching Logic...');

  // 1. Get some nodes first (simulating the API)
  // Using Ueno Park coordinates
  const lat = 35.714;
  const lon = 139.777;
  const radius = 500;

  console.log(`Fetching nodes near ${lat}, ${lon} radius ${radius}m...`);
  const { data: nodes, error: nodeError } = await supabase.rpc('get_pedestrian_nodes', {
    lat,
    lon,
    radius_meters: radius
  });

  if (nodeError) {
    console.error('Error fetching nodes:', nodeError);
    return;
  }

  if (!nodes || nodes.length === 0) {
    console.log('No nodes found.');
    return;
  }

  console.log(`Found ${nodes.length} nodes.`);
  const nodeIds = nodes.map((n: any) => n.id);
  const sampleIds = nodeIds.slice(0, 10); // Log first 10 for brevity
  console.log('Sample Node IDs:', sampleIds);

  // 2. Test RPC call (get_pedestrian_links_geojson)
  console.log('\n--- Testing RPC: get_pedestrian_links_geojson ---');
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_pedestrian_links_geojson', {
    target_node_ids: nodeIds
  });

  if (rpcError) {
    console.error('RPC Error:', rpcError.message);
  } else {
    console.log(`RPC Success! Found ${rpcData?.length} links.`);
  }

  // 3. Test Fallback Logic (Raw Query)
  console.log('\n--- Testing Fallback Logic (Raw Query) ---');
  // Construct the filter string
  // Note: PostgREST limit for URL length can be an issue with many IDs.
  // We need to check if we are hitting that.

  const idList = nodeIds.map((id: string) => `"${id}"`).join(',');
  // console.log('Filter string length:', idList.length);

  // Try a smaller batch first to verify syntax
  const smallBatchIds = nodeIds.slice(0, 5);
  const smallIdList = smallBatchIds.map((id: string) => `"${id}"`).join(',');

  console.log('Querying with small batch of IDs...');
  const { data: fallbackDataSmall, error: fallbackErrorSmall } = await supabase
    .from('pedestrian_links')
    .select('id, start_node_id, end_node_id')
    .or(`start_node_id.in.(${smallIdList}),end_node_id.in.(${smallIdList})`);

  if (fallbackErrorSmall) {
    console.error('Fallback Small Batch Error:', fallbackErrorSmall.message);
    console.error('Hint:', fallbackErrorSmall.hint);
    console.error('Details:', fallbackErrorSmall.details);
  } else {
    console.log(`Fallback Small Batch Success! Found ${fallbackDataSmall?.length} links.`);
  }

  // If small batch works, try full batch (might fail if too long)
  if (!fallbackErrorSmall) {
      console.log('Querying with ALL IDs...');
      // Note: If idList is huge, this might fail.
      if (idList.length > 2000) {
          console.warn(`Warning: Filter string is very long (${idList.length} chars). This might cause 414 URI Too Long.`);
      }

      const { data: fallbackData, error: fallbackError } = await supabase
        .from('pedestrian_links')
        .select('id')
        .or(`start_node_id.in.(${idList}),end_node_id.in.(${idList})`);

      if (fallbackError) {
        console.error('Fallback Full Batch Error:', fallbackError.message);
      } else {
        console.log(`Fallback Full Batch Success! Found ${fallbackData?.length} links.`);
      }
  }
}

debugLinks();
