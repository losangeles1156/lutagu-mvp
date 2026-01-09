
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkActiveNodes() {
    const { data, error } = await supabase
        .from('nodes')
        .select('id, name, is_active')
        .limit(100);
    
    if (error) {
        console.error(error);
        return;
    }

    const inactive = data.filter(n => !n.is_active);
    console.log(`Sample: ${data.length} nodes, ${inactive.length} are inactive.`);
    console.log('Sample inactive nodes:');
    console.log(JSON.stringify(inactive.slice(0, 10), null, 2));
}

checkActiveNodes();
