
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanup() {
    console.log('--- Cleaning up corrupted L4 embeddings ---');
    const { data, error } = await supabase
        .from('l4_knowledge_embeddings')
        .delete()
        .like('content', '%[object Object]%');

    if (error) {
        console.error('Cleanup error:', error);
    } else {
        console.log('Corrupted entries deleted successfully.');
    }
}

cleanup();
