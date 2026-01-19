
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!
);

async function checkRLS() {
    const { data, error } = await supabase.rpc('get_rls_status');

    if (error) {
        // If RPC doesn't exist, use raw query
        const { data: tables, error: queryError } = await supabase
            .from('pg_tables')
            .select('tablename, rowsecurity')
            .eq('schemaname', 'public');

        if (queryError) {
            // Last resort: query via SQL
            const { data: sqlData, error: sqlError } = await supabase.from('_rpc_helper').select('*').limit(1); // dummy
            console.error('SQL query failed. Please check RLS status manually in Supabase dashboard.');
            return;
        }
        console.table(tables);
    } else {
        console.table(data);
    }
}

// Since we can't easily run arbitrary SQL via the client without a function,
// let's just list tables we know about from the migrations and scripts.
const KNOWN_TABLES = [
    'cities', 'nodes', 'stations_static', 'l1_places', 'l2_status',
    'l3_details', 'fares', 'member_profiles', 'audit_logs', 'security_events',
    'node_intelligence', 'node_facility_profiles'
];

async function listTables() {
    console.log('--- Checking RLS status for known tables ---');
    for (const table of KNOWN_TABLES) {
        const { data, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (error) {
            console.log(`❌ ${table}: ${error.message}`);
        } else {
            console.log(`✅ ${table}: Exists`);
        }
    }
}

listTables();
