
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

async function verifyZoo() {
    console.log('--- Verifying Ueno Zoo Category ---');

    const { data: zoos, error } = await supabase
        .from('l1_places')
        .select('*')
        .or('name.ilike.%Zoo%,name.ilike.%動物園%')
        .limit(20);

    if (error) {
        console.error('Error:', error);
        return;
    }

    // Filter for Ueno
    const uenoZoos = zoos?.filter(z =>
        (z.name && (z.name.toLowerCase().includes('ueno') || z.name.includes('上野'))) ||
        (z.name_i18n && JSON.stringify(z.name_i18n).toLowerCase().includes('ueno'))
    );

    if (uenoZoos && uenoZoos.length > 0) {
        uenoZoos.forEach(z => {
            console.log(`- [${z.id}] ${z.name}`);
            console.log(`  Category: ${z.category}`);
            console.log(`  Station: ${z.station_id}`);
        });

        const allNature = uenoZoos.every(z => z.category === 'nature');
        if (allNature) console.log('✅ All Ueno Zoo entries are category: nature');
        else console.log('❌ Some Ueno Zoo entries have wrong category!');

        const allHub = uenoZoos.every(z => z.station_id === 'Hub:Ueno');
        if (allHub) console.log('✅ All Ueno Zoo entries are linked to Hub:Ueno');
        else console.log('⚠️ Some Ueno Zoo entries are NOT linked to Hub:Ueno (might be okay if intended)');

    } else {
        console.log('No Ueno Zoo found!');
    }
}

verifyZoo();
