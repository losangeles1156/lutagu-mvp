
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkHierarchy() {
    console.log('--- Hierarchy Audit ---');
    
    // Total nodes in nodes table
    const { count: totalNodes } = await supabase.from('nodes').select('*', { count: 'exact', head: true });
    console.log('Total nodes:', totalNodes);

    // Nodes in node_hierarchy
    const { data: hierarchyNodes } = await supabase.from('node_hierarchy').select('node_id');
    const uniqueHierarchyNodes = new Set(hierarchyNodes?.map(h => h.node_id));
    console.log('Unique nodes in hierarchy:', uniqueHierarchyNodes.size);

    // Active nodes in nodes table
    const { count: activeNodes } = await supabase.from('nodes').select('*', { count: 'exact', head: true }).eq('is_active', true);
    console.log('Active nodes in nodes table:', activeNodes);

    // Check if Shinjuku is in hierarchy
    const shinjukuId = 'odpt.Station:JR-East.Shinjuku';
    const { data: shinjukuH } = await supabase.from('node_hierarchy').select('*').eq('node_id', shinjukuId);
    console.log(`Shinjuku (${shinjukuId}) hierarchy entries:`, shinjukuH?.length);
    if (shinjukuH && shinjukuH.length > 0) {
        console.log('Shinjuku hierarchy sample:', shinjukuH[0]);
    }
}

checkHierarchy();
