
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRLS() {
    console.log('Checking RLS for pedestrian_links...');

    // We can't query pg_class directly via client easily unless we have a helper RPC.
    // Instead, we can try to query the table with an ANON client and see if we get data.

    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const anonClient = createClient(supabaseUrl, anonKey);

    const { data, error } = await anonClient
        .from('pedestrian_links')
        .select('id')
        .limit(1);

    if (error) {
        console.error('Anon Query Error:', error);
    } else {
        console.log(`Anon Query returned ${data?.length} rows.`);
        if (data?.length === 0) {
            console.warn('WARNING: Anon client got 0 rows. RLS might be blocking or table is empty.');

            // Check if table is actually empty using Admin client
            const { count } = await supabase.from('pedestrian_links').select('*', { count: 'exact', head: true });
            console.log(`Total rows in table (Admin): ${count}`);
        } else {
            console.log('Anon client can read data. RLS is likely Open or Disabled.');
        }
    }
}

checkRLS();
