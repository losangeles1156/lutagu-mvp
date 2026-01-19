
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

async function debugUenoPlaces() {
    console.log('--- Debugging Ueno Places ---');

    // Search for anything with Ueno/上野 in name
    const { data: places, error } = await supabase
        .from('l1_places')
        .select('*')
        .or('name.ilike.%Ueno%,name.ilike.%上野%')
        .limit(50);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${places?.length} places matching Ueno/上野.`);

    if (places && places.length > 0) {
        places.forEach(p => {
            console.log(`- [${p.id}] ${p.name} (Cat: ${p.category}, Stn: ${p.station_id})`);
            if (p.name_i18n) console.log(`   i18n: ${JSON.stringify(p.name_i18n)}`);
        });
    }

    // Also search specifically for Zoo-like things globally to see if Ueno Zoo is named differently
    console.log('\n--- Searching for Zoos globally ---');
    const { data: zoos, error: zooError } = await supabase
        .from('l1_places')
        .select('*')
        .or('name.ilike.%Zoo%,name.ilike.%動物園%')
        .limit(20);

    if (zooError) {
        console.error('Zoo Error:', zooError);
    } else {
        zoos?.forEach(z => {
            console.log(`- [${z.id}] ${z.name} (Cat: ${z.category}, Stn: ${z.station_id})`);
        });
    }
}

debugUenoPlaces();
