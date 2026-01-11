import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

async function listTables() {
    const { data, error } = await supabase
        .from('pg_catalog.pg_tables')
        .select('tablename')
        .filter('schemaname', 'eq', 'public');

    if (error) {
        // Fallback: try to query something that likely exists to see what's available
        console.error('Error listing tables:', error);
    } else {
        console.log('Tables in public schema:');
        console.log(data.map(t => t.tablename).join(', '));
    }
}

listTables().catch(console.error);
