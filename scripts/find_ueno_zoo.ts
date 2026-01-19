
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

async function findZoo() {
    console.log('--- Finding Ueno Zoo ---');

    // 1. Search by name broad
    const { data: nameMatches } = await supabase
        .from('l1_places')
        .select('id, name, station_id, category')
        .or('name.ilike.%Zoo%,name.ilike.%動物園%')
        .limit(20);

    console.log('Matches by name "Zoo/動物園":');
    nameMatches?.forEach(p => console.log(`- [${p.name}] (${p.id}) Cat: ${p.category} Stn: ${p.station_id}`));

    // 2. Search by category 'shopping' in Ueno
    const { data: shoppingMatches } = await supabase
        .from('l1_places')
        .select('id, name, station_id, category')
        .eq('category', 'shopping')
        .ilike('name', '%Ueno%')
        .limit(20);

    console.log('\nMatches by Category "shopping" + Name "Ueno":');
    shoppingMatches?.forEach(p => console.log(`- [${p.name}] (${p.id}) Cat: ${p.category} Stn: ${p.station_id}`));

    // 3. Search for specific OSM ID if known (Ueno Zoo is famous)
    // Often it is "Ueno Zoological Gardens"
    const { data: gardenMatches } = await supabase
        .from('l1_places')
        .select('id, name, station_id, category')
        .ilike('name', '%Zoological%')
        .limit(10);

    console.log('\nMatches by name "Zoological":');
    gardenMatches?.forEach(p => console.log(`- [${p.name}] (${p.id}) Cat: ${p.category} Stn: ${p.station_id}`));
}

findZoo();
