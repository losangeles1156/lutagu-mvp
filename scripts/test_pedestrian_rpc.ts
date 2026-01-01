
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPedestrianRpc() {
  console.log('📡 Testing get_nearby_accessibility_graph RPC...');
  
  // Test coordinates (Ueno Station area)
  const query_lat = 35.7138;
  const query_lon = 139.7772;
  const radius_meters = 100;

  console.log(`📍 Querying at ${query_lat}, ${query_lon} (radius: ${radius_meters}m)`);

  const { data, error } = await supabase.rpc('get_nearby_accessibility_graph', {
    query_lat,
    query_lon,
    radius_meters
  });

  if (error) {
    console.error('❌ RPC Failed:', error);
    console.log('\n💡 Tip: Did you apply the "20260101_fix_ambiguous_columns.sql" migration in Supabase?');
    return;
  }

  if (!data || data.length === 0) {
    console.warn('⚠️ RPC returned no data. (This might be normal if no pedestrian data exists in this area yet)');
  } else {
    console.log(`✅ RPC Success! Received ${data.length} items.`);
    console.log('🔍 Sample Item:', JSON.stringify(data[0], null, 2));
  }
}

testPedestrianRpc();
