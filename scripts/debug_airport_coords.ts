
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env properly
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

async function inspectData() {
    console.log('--- Inspecting Narita L1 Places ---');
    const { data: l1, error: l1Error } = await supabase
        .from('l1_places')
        .select('*')
        .eq('station_id', 'odpt:Station:Airport.Narita')
        .limit(5);

    if (l1Error) console.error(l1Error);
    else {
        l1.forEach(p => {
            console.log(`[L1] ${p.name} | Lat: ${p.lat}, Lng: ${p.lng} | Tags:`, p.tags);
        });
    }

    console.log('\n--- Inspecting Narita L3 Services ---');
    const { data: l3, error: l3Error } = await supabase
        .from('stations_static')
        .select('*')
        .eq('id', 'odpt:Station:Airport.Narita');

    if (l3Error) console.error(l3Error);
    else if (l3 && l3.length > 0) {
        const services = l3[0].l3_services || [];
        console.log(`Found ${services.length} services.`);
        services.slice(0, 5).forEach((s: any) => {
            console.log(`[L3] ${s.type} | Loc: ${s.location} | Coords:`, s.coordinates);
        });
    }
}

inspectData();
