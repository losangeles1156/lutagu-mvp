// scripts/check_db.ts
require('dotenv').config({ path: '.env.local' });

async function verify() {
    console.log('Loading environment...');
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        console.error('Missing NEXT_PUBLIC_SUPABASE_URL');
        process.exit(1);
    }

    const { supabaseAdmin } = await import('../src/lib/supabase');

    // List Cities
    console.log('\n--- Cities ---');
    const { data: cities, error: cErr } = await supabaseAdmin.from('cities').select('id, name');
    if (cErr) console.error(cErr);
    else console.table(cities);

    // List Sample Nodes
    console.log('\n--- Nodes Sample (Top 5) ---');
    const { data: nodes, error: nErr } = await supabaseAdmin.from('nodes').select('id, name').limit(5);
    if (nErr) console.error(nErr);
    else console.table(nodes);

    // Check specific Node again
    const nodeId = 'odpt:Station:TokyoMetro.Ueno';
    const { data: specificNode } = await supabaseAdmin.from('nodes').select('id, city_id').eq('id', nodeId).single();
    console.log(`\nSpecific Node '${nodeId}':`, specificNode || 'MISSING');

    if (!specificNode) {
        // Check if it exists with different casing?
        const { data: search } = await supabaseAdmin.from('nodes').select('id').ilike('id', '%Ueno%').limit(5);
        console.log('Search for %Ueno%:', search);
    }
}

verify();
