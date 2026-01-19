import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

async function inspectL1L3Structure() {
    console.log('--- Inspecting L1~L3 Data Structure ---');

    // L1: Stations (DNA)
    const { data: stations, error: sError } = await supabase
        .from('stations')
        .select('id, name, l1_dna')
        .limit(1);

    if (sError) console.error('L1 Error:', sError);
    else {
        console.log('\n--- L1 (Stations/DNA) Sample ---');
        console.log(JSON.stringify(stations, null, 2));
    }

    // L2: Status
    const { data: status, error: stError } = await supabase
        .from('station_status')
        .select('*')
        .limit(1);

    if (stError) console.error('L2 Error:', stError);
    else {
        console.log('\n--- L2 (Status) Sample ---');
        console.log(JSON.stringify(status, null, 2));
    }

    // L3: Facilities
    const { data: facilities, error: fError } = await supabase
        .from('station_facilities')
        .select('*')
        .limit(1);

    if (fError) console.error('L3 Error:', fError);
    else {
        console.log('\n--- L3 (Facilities) Sample ---');
        console.log(JSON.stringify(facilities, null, 2));
    }
}

inspectL1L3Structure().catch(console.error);
