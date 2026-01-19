
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

async function main() {
    const term = process.argv[2] || '';
    console.log(`Checking L3 count for ${term}...`);

    // Get station IDs matching term
    const { data: stations } = await supabase
        .from('stations_static')
        .select('id, name')
        .ilike('id', `%${term}%`);

    if (!stations) {
        console.log('No stations found.');
        return;
    }

    for (const s of stations) {
        const { count } = await supabase
            .from('l3_facilities')
            .select('*', { count: 'exact', head: true })
            .eq('station_id', s.id);

        console.log(`${s.id}: ${count} facilities`);
    }
}

main();
