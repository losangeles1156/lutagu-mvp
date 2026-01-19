
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test Cases: Key Stations where we expect data
const TEST_CASES = [
  { name: 'Ueno Station', lat: 35.7138, lon: 139.7772 },
  { name: 'Okachimachi Station', lat: 35.7075, lon: 139.7747 },
  { name: 'Roppongi Station', lat: 35.6640, lon: 139.7315 }, // Check coverage
  { name: 'Shinjuku Station', lat: 35.6892, lon: 139.7005 }, // Might be missing data
  { name: 'Tokyo Station', lat: 35.6812, lon: 139.7671 }
];

async function evaluateEfficacy() {
  console.log('📊 Starting Tool Efficacy Evaluation...');
  console.log('----------------------------------------');

  let successCount = 0;
  let totalCount = TEST_CASES.length;
  const results = [];

  for (const test of TEST_CASES) {
    const start = Date.now();
    const { data, error } = await supabase.rpc('get_nearby_accessibility_graph', {
      query_lat: test.lat,
      query_lon: test.lon,
      radius_meters: 100
    });
    const duration = Date.now() - start;

    if (error) {
      console.log(`❌ [${test.name}] Error: ${error.message}`);
      results.push({ name: test.name, status: 'ERROR', items: 0, latency: duration });
    } else if (!data || data.length === 0) {
      console.log(`⚠️ [${test.name}] No Data Found (Empty Response)`);
      results.push({ name: test.name, status: 'EMPTY', items: 0, latency: duration });
    } else {
      console.log(`✅ [${test.name}] Success: ${data.length} items found (${duration}ms)`);
      successCount++;
      results.push({ name: test.name, status: 'SUCCESS', items: data.length, latency: duration });
    }
  }

  console.log('----------------------------------------');
  const successRate = ((successCount / totalCount) * 100).toFixed(1);
  console.log(`📈 Efficacy Score: ${successRate}% Success Rate`);

  // KPI Output
  console.log('\n--- KPI Report ---');
  console.log(`1. Tool Success Rate: ${successRate}%`);
  const avgLatency = results.reduce((acc, r) => acc + r.latency, 0) / totalCount;
  console.log(`2. Avg Latency: ${avgLatency.toFixed(0)}ms`);

  const coverageGaps = results.filter(r => r.status === 'EMPTY').map(r => r.name);
  if (coverageGaps.length > 0) {
    console.log(`3. Coverage Gaps Identified: ${coverageGaps.join(', ')}`);
  } else {
    console.log('3. Coverage: Good (All test cases returned data)');
  }
}

evaluateEfficacy();
