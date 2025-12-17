// scripts/debug_cities.ts
require('dotenv').config({ path: '.env.local' });

async function main() {
    const { supabaseAdmin } = await import('../src/lib/supabase');

    const city = {
        id: 'tokyo_core_debug',
        name: { "en": "Debug Tokyo" },
        zone_type: 'core',
        config: { debug: true }
    };

    console.log('Attempting to insert debug city...');
    const { data, error } = await supabaseAdmin
        .from('cities')
        .upsert(city)
        .select();

    if (error) {
        console.error('INSERT FAILED!');
        console.error('Code:', error.code);
        console.error('Message:', error.message);
        console.error('Hint:', error.hint);
        console.error('Details:', error.details);
    } else {
        console.log('INSERT SUCCESS!');
        console.log(data);

        // Cleanup
        await supabaseAdmin.from('cities').delete().eq('id', 'tokyo_core_debug');
    }
}

main();

export { };
