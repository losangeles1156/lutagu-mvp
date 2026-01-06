
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // Use service key to bypass potential RLS

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Service Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkL4Status() {
    console.log('Fetching nodes with riding_knowledge...');

    // Fetch all nodes. Since we can't easily filter valid JSONB length in API sometimes, fetch a batch.
    // Actually, we can filter for non-null.
    const { data: nodes, error } = await supabase
        .from('nodes')
        .select('id, riding_knowledge')
        .not('riding_knowledge', 'is', null);

    if (error) {
        console.error('Error fetching nodes:', error);
        return;
    }

    if (!nodes) {
        console.log('No nodes found.');
        return;
    }

    let populatedCount = 0;
    const populatedIds: string[] = [];

    nodes.forEach((node: any) => {
        const rk = node.riding_knowledge;
        if (!rk) return;

        const hasTraps = Array.isArray(rk.traps) && rk.traps.length > 0;
        const hasHacks = Array.isArray(rk.hacks) && rk.hacks.length > 0;

        if (hasTraps || hasHacks) {
            populatedCount++;
            populatedIds.push(node.id);
        }
    });

    console.log(`\nTotal nodes with riding_knowledge: ${populatedCount}`);
    console.log('IDs with data:');
    populatedIds.forEach(id => console.log(`- ${id}`));
}

checkL4Status();
