
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const sqlPath = path.join(process.cwd(), 'supabase/migrations/20260108_update_l4_vector_dim.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    console.log('Applying migration to update vector dimensions...');
    
    // We can't run multiple statements easily with the JS client in some cases
    // but we can try using the 'rpc' to run a custom sql function if available, 
    // or just run it as a single string if the client supports it.
    // Actually, the best way is to use the SQL editor, but here we'll try to use 
    // a workaround or assume the user can run it.
    
    // Since I can't run arbitrary SQL through the client easily without a pre-defined RPC,
    // I'll assume I should have just updated the ingestion script to handle the error or use Mistral.
    
    // Actually, I'll just update the ingestion script to use Mistral AND the route.ts to use Mistral,
    // and if the dimension is wrong, it will fail, which will tell me I MUST change the schema.
    
    // Let's try to run it via a simple trick if possible.
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
        console.error('Error applying migration:', error);
        console.log('Please apply the SQL in supabase/migrations/20260108_update_l4_vector_dim.sql manually in the Supabase SQL Editor.');
    } else {
        console.log('Migration applied successfully!');
    }
}

main();
