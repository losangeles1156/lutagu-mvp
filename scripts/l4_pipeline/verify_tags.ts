
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
    console.log('Verifying L4 Knowledge Tags...');
    const { data: l4Data, error: l4Error } = await supabase
        .from('l4_knowledge_embeddings')
        .select('id, content, tags_core, tags_intent')
        .limit(5);

    if (l4Error) console.error('L4 Error:', l4Error);
    else {
        console.log('L4 Sample:', JSON.stringify(l4Data, null, 2));
    }

    console.log('Verifying L1 Places Tags...');
    const { data: l1Data, error: l1Error } = await supabase
        .from('l1_places')
        .select('id, name, category, tags_core, tags_intent, tags_visual')
        .limit(5);

    if (l1Error) console.error('L1 Error:', l1Error);
    else {
        console.log('L1 Sample:', JSON.stringify(l1Data, null, 2));
    }
}

verify();
