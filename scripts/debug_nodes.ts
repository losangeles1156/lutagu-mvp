// scripts/debug_nodes.ts
require('dotenv').config({ path: '.env.local' });

async function main() {
    const { supabaseAdmin } = await import('../src/lib/supabase');

    const node = {
        id: 'odpt:Station:TokyoMetro.Ueno',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '上野', 'ja': '上野', 'en': 'Ueno' },
        type: 'station',
        location: 'POINT(139.7774 35.7141)', // Lon Lat
        geohash: 'xn77k',
        is_hub: true,
        zone: 'core',
        source_dataset: 'debug_seed',
        vibe: 'busy'
    };

    console.log('Attempting to insert node:', node.id);
    const { data, error } = await supabaseAdmin
        .from('nodes')
        .upsert(node)
        .select();

    if (error) {
        console.error('INSERT FAILED!');
        console.error('Code:', error.code);
        console.error('Message:', error.message);
    } else {
        console.log('INSERT SUCCESS!');
        console.log(data);
    }
}

main();

export { };
