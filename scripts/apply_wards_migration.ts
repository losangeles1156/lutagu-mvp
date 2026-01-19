/**
 * Execute wards migration SQL directly
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

async function main() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Missing Supabase environment variables');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Read migration file
    const migrationPath = path.join(process.cwd(), 'supabase/migrations/20260104_create_wards_table.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📄 Reading migration from:', migrationPath);
    console.log('📊 SQL length:', sql.length, 'characters');

    // Check if wards table already exists
    const { data: existing } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'wards')
        .single();

    if (existing) {
        console.log('✅ wards table already exists');
    } else {
        console.log('📦 Creating wards table...');

        // Execute SQL (needs service role for schema changes)
        const { data, error } = await supabase.rpc('exec_sql', { sql });

        if (error) {
            console.error('❌ Error executing migration:', error);
            process.exit(1);
        }

        console.log('✅ Migration executed successfully');
    }

    // Verify table exists
    const { data: tables } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'wards');

    if (tables && tables.length > 0) {
        console.log('✅ wards table confirmed in database');
    } else {
        console.log('⚠️  Warning: wards table not found after migration');
    }
}

main().catch(console.error);
