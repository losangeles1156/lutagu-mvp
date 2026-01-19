
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Testing Supabase Connection...');
console.log('URL:', supabaseUrl);
console.log('Key exists:', !!supabaseKey);

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    try {
        const { data, error } = await supabase.from('nodes').select('count', { count: 'exact', head: true });
        if (error) {
            console.error('Supabase Error:', error);
        } else {
            console.log('Connection Successful! Node count:', data); // data is null for head:true with count
        }

        // Try to select 1 row
        const { data: nodes, error: nodeError } = await supabase.from('nodes').select('id, name').limit(1);
        if (nodeError) {
             console.error('Select Error:', nodeError);
        } else {
            console.log('Sample Node:', nodes);
        }

    } catch (e) {
        console.error('Unexpected Error:', e);
    }
}

testConnection();
