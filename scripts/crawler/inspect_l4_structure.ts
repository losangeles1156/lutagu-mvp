import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

async function inspectL4Structure() {
    console.log('--- Inspecting L4 Knowledge Structure ---');

    // 1. Check a few records from l4_knowledge_embeddings
    const { data: embeddings, error: embError } = await supabase
        .from('l4_knowledge_embeddings')
        .select('*')
        .limit(3);

    if (embError) {
        console.error('Error fetching embeddings:', embError);
    } else {
        console.log('\n--- l4_knowledge_embeddings Sample ---');
        console.log(JSON.stringify(embeddings, null, 2));
    }

    // 2. Check the count and language distribution if possible
    // We'll guess language from content or look for a locale/language column
    const { data: columns, error: colError } = await supabase
        .rpc('get_table_columns', { table_name: 'l4_knowledge_embeddings' });

    if (colError) {
        // Fallback: just try to select some common column names
        const { data: langData, error: langError } = await supabase
            .from('l4_knowledge_embeddings')
            .select('id')
            .limit(1);

        if (langError) {
            console.error('Error checking columns:', langError);
        } else {
            console.log('\nTable exists and is accessible.');
        }
    } else {
        console.log('\nColumns in l4_knowledge_embeddings:', columns);
    }

    // 3. Check for any other L4 related tables
    const { data: tables, error: tablesError } = await supabase
        .from('pg_catalog.pg_tables')
        .select('tablename')
        .filter('schemaname', 'eq', 'public')
        .filter('tablename', 'like', 'l4_%');

    if (!tablesError) {
        console.log('\nL4 Related Tables:', tables.map(t => t.tablename));
    }
}

inspectL4Structure().catch(console.error);
