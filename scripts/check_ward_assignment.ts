import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkWardAssignment() {
  console.log('=== Ward Assignment Check ===\n');

  // Check total nodes
  const { count: totalNodes, error: totalError } = await supabase
    .from('nodes')
    .select('*', { count: 'exact', head: true });

  if (totalError) {
    console.error('Error counting nodes:', totalError);
    return;
  }
  console.log(`Total nodes in DB: ${totalNodes}`);

  // Check nodes with ward_id
  const { count: nodesWithWard, error: wardError } = await supabase
    .from('nodes')
    .select('*', { count: 'exact', head: true })
    .not('ward_id', 'is', null);

  if (wardError) {
    console.error('Error counting nodes with ward_id:', wardError);
    return;
  }
  console.log(`Nodes with ward_id: ${nodesWithWard}`);
  console.log(`Coverage: ${((nodesWithWard || 0) / (totalNodes || 1) * 100).toFixed(1)}%\n`);

  // Check wards table
  const { data: wards, error: wardsError } = await supabase
    .from('wards')
    .select('*')
    .order('id');

  if (wardsError) {
    console.error('Error fetching wards:', wardsError);
    return;
  }
  console.log(`Wards in DB: ${wards?.length || 0}`);

  if (wards && wards.length > 0) {
    console.log('\nWard Statistics:');
    // Show first ward structure
    console.log('Sample ward structure:', JSON.stringify(wards[0], null, 2));
    for (const ward of wards) {
      const nodeCount = ward.node_count || ward.nodeCount || 0;
      console.log(`  - ${ward.id}: ${nodeCount} nodes`);
    }
  }

  // Sample nodes with ward_id
  console.log('\n=== Sample Nodes with ward_id ===');
  const { data: sampleNodes } = await supabase
    .from('nodes')
    .select('id, name, ward_id, is_hub')
    .not('ward_id', 'is', null)
    .limit(5);

  if (sampleNodes) {
    sampleNodes.forEach((node: any) => {
      console.log(`  - ${node.name?.ja || node.id}: ward=${node.ward_id}, is_hub=${node.is_hub}`);
    });
  }

  // Check if there's a function to assign wards
  console.log('\n=== Checking for find_ward_by_point function ===');
  try {
    const { data: funcExists } = await supabase.rpc('find_ward_by_point', {
      lat: 35.6895,
      lng: 139.6917
    });
    console.log('find_ward_by_point function result:', funcExists);
  } catch {
    console.log('find_ward_by_point function does not exist');
  }
}

checkWardAssignment().catch(console.error);
