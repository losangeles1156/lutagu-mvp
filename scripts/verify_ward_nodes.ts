
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables specially for scripts
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyWardNodes() {
    console.log('🔍 Verifying Ward Node fetching...');

    // 1. Check Ward Stats
    const { data: wards, error: wardsError } = await supabase
        .from('wards')
        .select('id, name_i18n, node_count, hub_count')
        .in('id', ['ward:taito', 'ward:chiyoda', 'ward:chuo', 'ward:shinjuku', 'ward:shibuya', 'ward:minato']);

    if (wardsError) {
        console.error('❌ Error fetching wards:', wardsError);
        return;
    }

    console.log('\n📊 Ward Statistics:');
    console.table(wards);

    // 2. Simulate API fetching for Taito
    console.log('\n🧪 Testing Node Fetch for Taito (ward:taito)...');

    // Simulate what fetchNodesByWard does/api/wards/[wardId]?include_nodes=1&include_hubs=1&limit=200
    // But here we query directly via Supabase to verify DB state first

    const { data: nodes, error: nodesError } = await supabase
        .from('nodes')
        .select('id, name, is_hub, parent_hub_id')
        .eq('ward_id', 'ward:taito')
        .is('parent_hub_id', null); // Only Hubs

    if (nodesError) {
        console.error('❌ Error fetching Taito nodes:', nodesError);
    } else {
        console.log(`✅ Found ${nodes.length} Hub nodes in Taito in DB.`);
        if (nodes.length > 0) {
            console.log('Sample nodes:', nodes.slice(0, 3).map(n => n.name));
        } else {
            console.warn('⚠️ No Hub nodes found for Taito! Check ward assignment script.');
        }
    }

    // 3. Verify Other Wards
    for (const ward of wards) {
        if (ward.id === 'ward:taito') continue;

        const { count, error } = await supabase
            .from('nodes')
            .select('id', { count: 'exact', head: true })
            .eq('ward_id', ward.id)
            .is('parent_hub_id', null);

        if (error) console.error(`❌ Error checking ${ward.id}:`, error);
        else console.log(`ℹ️  ${ward.id}: ${count} Hub nodes found in DB.`);
    }
}

verifyWardNodes().catch(console.error);
