import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listNodes() {
    const { data, error } = await supabase
        .from('nodes')
        .select('id, name')
        .limit(100); // Limit for safety first

    if (error) {
        console.error('Error fetching nodes:', error);
        return;
    }

    console.log(`Found ${data.length} nodes.`);
    data.forEach(n => {
        console.log(`- ${n.id} (${JSON.stringify(n.name)})`);
    });
}

listNodes();
