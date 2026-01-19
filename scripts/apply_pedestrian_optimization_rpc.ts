
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

async function runMigration() {
    console.log('=== Applying Migration via RPC ===\n');

    const migrationFile = 'supabase/migrations/20260102_fix_pedestrian_rpc.sql';
    const sqlPath = path.resolve(process.cwd(), migrationFile);

    if (!fs.existsSync(sqlPath)) {
        console.error(`❌ File not found: ${migrationFile}`);
        return;
    }

    console.log(`Processing: ${migrationFile}`);
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    // Try to call exec_sql
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
        console.error(`❌ Failed to apply ${migrationFile}:`, error.message);
        console.log('Note: This method requires a "exec_sql" RPC function to be installed in the database.');
    } else {
        console.log(`✅ Applied ${migrationFile}`);
    }
}

runMigration();
