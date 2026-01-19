
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

async function main() {
    const term = process.argv[2] || 'Iidabashi';
    console.log(`Searching for ${term}...`);

    // Check stations_static
    const { data: staticData } = await supabase
        .from('stations_static')
        .select('id, name')
        .ilike('id', `%${term}%`);

    console.log('\n--- stations_static ---');
    staticData?.forEach(s => console.log(`${s.id} | ${JSON.stringify(s.name)}`));

    // Check nodes
    const { data: nodesData } = await supabase
        .from('nodes')
        .select('id, name')
        .ilike('id', `%${term}%`);

    console.log('\n--- nodes ---');
    nodesData?.forEach(s => console.log(`${s.id} | ${JSON.stringify(s.name)}`));
}

main();
