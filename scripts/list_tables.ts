
require('dotenv').config({ path: '.env.local' });

async function main() {
    const { supabaseAdmin } = await import('../src/lib/supabase');

    const { data, error } = await supabaseAdmin
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');

    if (error) {
        // information_schema might be restricted. Try listing known tables.
        console.log('Error listing tables via information_schema:', error.message);
        console.log('Trying to select from potential tables...');
        const tables = ['nodes', 'l1_categories', 'l3_facilities', 'l3_links', 'l4_actions', 'user_tracking'];
        for (const t of tables) {
            const { error: e } = await supabaseAdmin.from(t).select('count', { count: 'exact', head: true });
            console.log(`Table '${t}': ${e ? 'NOT ACCESSIBLE/MISSING' : 'EXISTS'}`);
        }
    } else {
        console.log('Tables in public schema:');
        data.forEach(row => console.log(`- ${row.table_name}`));
    }
}

main();
