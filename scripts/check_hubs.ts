
require('dotenv').config({ path: '.env.local' });

async function main() {
    const { supabaseAdmin } = await import('../src/lib/supabase');

    // Check for Hub nodes
    const { data: hubs, error } = await supabaseAdmin
        .from('nodes')
        .select('id, name, node_type, parent_hub_id')
        .eq('node_type', 'hub') // Assuming 'hub' is the type, or maybe is_hub boolean?
        .limit(5);

    if (error) {
        console.log('Error checking hubs (maybe node_type != hub):', error.message);
        // Try searching by name containing "Station" but having no operator prefix if possible?
        // Or check distinct node_types
        const { data: types } = await supabaseAdmin.from('nodes').select('node_type').limit(20);
        console.log('Sample node types:', types?.map(t => t.node_type));
    } else {
        console.log('Hub Nodes found:', hubs);
    }

    // Check for Child nodes
    const { data: children } = await supabaseAdmin
        .from('nodes')
        .select('id, name, parent_hub_id')
        .not('parent_hub_id', 'is', null)
        .limit(5);

    console.log('Child Nodes found:', children);
}

main();
