
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

async function main() {
    const { data, error } = await supabase.rpc('get_foreign_keys');
    // RPC might not exist. Use raw query if possible, or assume limited access.
    // Actually, I can't run raw SQL easily via client unless I have an RPC for it.
    // I'll try to guess or use `inspect_schema` logic if it inspects constraints.

    // Alternative: Try to insert a dummy record with a known existing ID and see if it works.
    // If it works, then for Iidabashi it failed, meaning Iidabashi ID is somehow wrong.

    console.log('Checking Iidabashi ID in nodes directly...');
    const { data: node } = await supabase.from('nodes').select('id').eq('id', 'odpt.Station:JR-East.ChuoSobuLocal.Iidabashi').single();
    console.log('Node:', node);

    const { data: staticS } = await supabase.from('stations_static').select('id').eq('id', 'odpt.Station:JR-East.ChuoSobuLocal.Iidabashi').single();
    console.log('Static:', staticS);

}

main();
