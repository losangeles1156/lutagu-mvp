
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectRpc() {
    const { data, error } = await supabase.rpc('get_rpc_definition', { rpc_name: 'nearby_nodes_v2' });
    if (error) {
        // Fallback: try to query pg_proc directly if get_rpc_definition doesn't exist
        const { data: procData, error: procError } = await supabase.from('pg_proc').select('prosrc').eq('proname', 'nearby_nodes_v2').single();
        if (procError) {
            console.error('Error fetching RPC definition:', procError);
            return;
        }
        console.log('RPC Definition (from pg_proc):');
        console.log(procData.prosrc);
    } else {
        console.log('RPC Definition:');
        console.log(data);
    }
}

inspectRpc();
