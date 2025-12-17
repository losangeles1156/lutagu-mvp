// scripts/check_schema.ts
require('dotenv').config({ path: '.env.local' });

async function main() {
    const { supabaseAdmin } = await import('../src/lib/supabase');

    console.log('Checking cities table structure...');
    const { data: cityData, error: cityError } = await supabaseAdmin.from('cities').select('*').limit(1);

    if (cityError) {
        console.error('Error selecting cities:', cityError);
    } else if (cityData && cityData.length > 0) {
        console.log('City columns found:', Object.keys(cityData[0]));
        const hasZoneType = 'zone_type' in cityData[0];
        console.log(`Column 'zone_type': ${hasZoneType ? 'EXISTS' : 'MISSING'}`);
    } else {
        console.log('No cities found to inspect columns.');
    }

    console.log('\nChecking nodes table structure...');
    const { data: nodeData, error: nodeError } = await supabaseAdmin.from('nodes').select('*').limit(1);

    if (nodeError) {
        console.error('Error selecting nodes:', nodeError);
    } else if (nodeData && nodeData.length > 0) {
        console.log('Node columns found:', Object.keys(nodeData[0]));
        const row = nodeData[0];
        const hasVibe = 'vibe' in row;
        const hasPersona = 'persona_prompt' in row;
        const hasParentHub = 'parent_hub_id' in row;

        console.log(`Column 'vibe': ${hasVibe ? 'EXISTS' : 'MISSING'}`);
        console.log(`Column 'persona_prompt': ${hasPersona ? 'EXISTS' : 'MISSING'}`);
        console.log(`Column 'parent_hub_id': ${hasParentHub ? 'EXISTS' : 'MISSING'}`);
    } else {
        console.log('No nodes found to inspect (DB might be empty or RLS restricted).');
        // If no nodes, we can't inspect columns easily via SELECT *
        // But user has nodes (1342 of them), so we should see data.
    }
}

main();

export { };
