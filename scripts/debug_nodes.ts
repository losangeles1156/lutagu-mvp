import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

async function inspectNodes() {
    const { data: nodes, error } = await supabase
        .from('nodes')
        .select('id, name')
        .eq('node_type', 'station');

    if (error) {
        console.error('Error:', error);
        return;
    }

    const targets = ['秋葉原', '上野', '東京'];
    const found = nodes.filter(n => targets.includes(n.name.ja));

    found.forEach(n => {
        console.log(`${n.name.ja}: ${n.id}`);
    });
}

inspectNodes();
