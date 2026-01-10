
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Get SQL file from command line argument
const sqlFile = process.argv[2];

if (!sqlFile) {
    console.error('Usage: npx tsx scripts/run_sql.ts <sql-file>');
    console.error('Example: npx tsx scripts/run_sql.ts supabase/migrations/20260110_add_location_tags_column.sql');
    process.exit(1);
}

async function executeSqlFromFile() {
    const sqlPath = join(process.cwd(), sqlFile);
    console.log(`Executing SQL from: ${sqlPath}`);
    
    const sql = readFileSync(sqlPath, 'utf-8');
    
    // Split by semicolons and execute each statement
    const statements = sql.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
        if (statement.trim().length === 0) continue;
        
        console.log(`Executing statement...`);
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
            console.error('Error executing statement:', error.message);
        } else {
            console.log('Statement executed successfully');
        }
    }
}

executeSqlFromFile().catch(console.error);
