
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
    console.log('Checking l4_knowledge_embeddings table...');
    const { data, error } = await supabase
        .from('l4_knowledge_embeddings')
        .select('id')
        .limit(1);
    
    if (error) {
        console.error('Table check failed:', error.message);
    } else {
        console.log('Table exists. Sample data:', data);
    }
}

checkTable();
