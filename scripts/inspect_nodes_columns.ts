import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

async function inspectColumns() {
    const { data, error } = await supabase
        .from('nodes')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Fetch error:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Columns in nodes table:', Object.keys(data[0]));
    } else {
        console.log('Nodes table is empty or could not fetch columns.');
    }
}

inspectColumns();
