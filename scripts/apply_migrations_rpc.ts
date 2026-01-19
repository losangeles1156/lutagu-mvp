
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
    console.log('=== Applying Pending Migrations (via RPC) ===\n');

    const migrations = [
        'supabase/migrations/20260101_fix_ambiguous_columns.sql',
        'supabase/migrations/20260101_create_ai_feedback.sql'
    ];

    let totalSuccess = true;

    for (const migrationFile of migrations) {
        const sqlPath = path.resolve(process.cwd(), migrationFile);
        if (!fs.existsSync(sqlPath)) {
            console.error(`❌ File not found: ${migrationFile}`);
            continue;
        }

        console.log(`Processing: ${migrationFile}`);
        const sql = fs.readFileSync(sqlPath, 'utf-8');

        // Clean SQL: remove comments and split
        // Note: Simple splitting by ';' can be dangerous if ; is in string literals.
        // But for these specific migrations, it should be fine if we are careful.
        // Actually, create_ai_feedback.sql has complex PL/pgSQL? No, mostly CREATE TABLE.
        // fix_ambiguous_columns.sql has PL/pgSQL which contains semicolons inside $$...$$ block.
        // Splitting by ; will BREAK the function definition.

        // We really need to execute the whole block if possible.
        // If exec_sql takes a single string, we can pass the whole content.

        const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

        if (error) {
            console.error(`❌ Failed to apply ${migrationFile}:`, error.message);
            if (error.code === 'PGRST202' || error.message.includes('Could not find')) {
                console.warn('⚠️  RPC "exec_sql" not found. Cannot apply migration via HTTP.');
                totalSuccess = false;
                break;
            }
            totalSuccess = false;
        } else {
            console.log(`✅ Applied ${migrationFile}`);
        }
    }

    if (!totalSuccess) {
        console.log('\n❌ Some migrations failed. Trying fallback to direct DB connection...');
        process.exit(1);
    } else {
        console.log('\n✅ All migrations applied successfully!');
    }
}

runMigration();
