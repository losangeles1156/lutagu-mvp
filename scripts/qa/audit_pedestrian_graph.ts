
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

async function auditPedestrianGraph() {
  console.log('🔍 Starting Pedestrian Graph Audit...');
  
  // 1. Fetch Stats
  const { count: nodeCount, error: nodeErr } = await supabase.from('pedestrian_nodes').select('*', { count: 'exact', head: true });
  const { count: linkCount, error: linkErr } = await supabase.from('pedestrian_links').select('*', { count: 'exact', head: true });

  if (nodeErr || linkErr) {
    console.error('❌ Failed to fetch counts:', nodeErr || linkErr);
    return;
  }

  console.log(`📊 Total Nodes: ${nodeCount}`);
  console.log(`📊 Total Links: ${linkCount}`);

  // 2. Check for Broken Links (Sample check)
  // Fetch a batch of links and verify their start/end nodes exist
  const { data: links, error: fetchLinkErr } = await supabase
    .from('pedestrian_links')
    .select('link_id, start_node_id, end_node_id')
    .limit(1000);

  if (fetchLinkErr) {
    console.error('❌ Failed to fetch links for validation:', fetchLinkErr);
    return;
  }

  if (links && links.length > 0) {
    const nodeIds = new Set<string>();
    links.forEach(l => {
      nodeIds.add(l.start_node_id);
      nodeIds.add(l.end_node_id);
    });

    // Check existence of these nodes in batches
    const uniqueNodeIds = Array.from(nodeIds);
    console.log(`Checking ${uniqueNodeIds.length} unique referenced nodes...`);
    
    // Supabase 'in' filter has a limit, so we might need to batch if array is huge.
    // For 1000 links, unique nodes might be ~500-1000. 'in' should handle it or we split.
    // Let's take first 100 to be safe for this script demo.
    const sampleNodeIds = uniqueNodeIds.slice(0, 100);
    
    const { data: existingNodes, error: nodeCheckErr } = await supabase
      .from('pedestrian_nodes')
      .select('node_id')
      .in('node_id', sampleNodeIds);

    if (nodeCheckErr) {
      console.error('❌ Failed to verify nodes:', nodeCheckErr);
    } else {
      const foundNodeIds = new Set(existingNodes?.map(n => n.node_id));
      const missingNodes = sampleNodeIds.filter(id => !foundNodeIds.has(id));

      if (missingNodes.length > 0) {
        console.warn(`⚠️ Found ${missingNodes.length} missing nodes referenced by links (Broken Links)!`);
        console.warn('Sample Missing IDs:', missingNodes.slice(0, 5));
      } else {
        console.log('✅ Connectivity Check (Sample): All referenced nodes exist.');
      }
    }
  }

  // 3. Check for Missing Accessibility Attributes
  const { count: missingElevator, error: attrErr } = await supabase
    .from('pedestrian_links')
    .select('*', { count: 'exact', head: true })
    .is('has_elevator_access', null);

  if (!attrErr) {
    if (missingElevator && missingElevator > 0) {
       console.warn(`⚠️ Found ${missingElevator} links with NULL 'has_elevator_access'.`);
    } else {
       console.log('✅ Attribute Check: No NULL elevator access flags.');
    }
  }

  console.log('🏁 Audit Complete.');
}

auditPedestrianGraph();
