
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

async function findAndFixZoo() {
    console.log('--- Finding Ueno Zoo ---');

    // Search broadly
    const { data: zoos, error } = await supabase
        .from('l1_places')
        .select('*')
        .or('name_i18n->>en.ilike.%Zoo%,name_i18n->>ja.ilike.%動物園%');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${zoos?.length} zoo-like places.`);

    const uenoZoo = zoos?.find(z =>
        (z.name && (z.name.includes('Ueno') || z.name.includes('上野'))) ||
        (JSON.stringify(z.name_i18n).includes('Ueno') || JSON.stringify(z.name_i18n).includes('上野'))
    );

    if (uenoZoo) {
        console.log('Found Ueno Zoo:', uenoZoo);
        console.log('Current Category:', uenoZoo.category);
        console.log('Current Station ID:', uenoZoo.station_id);

        // Fix Category
        if (uenoZoo.category === 'shopping') {
            const { error: updateError } = await supabase
                .from('l1_places')
                .update({ category: 'nature' }) // or culture
                .eq('id', uenoZoo.id);

            if (updateError) console.error('Update Error:', updateError);
            else console.log('✅ Updated category to nature');
        }

        // Fix Station ID if null or wrong
        // Ideally link to Hub:Ueno or odpt:Station:JR-East.Ueno
        if (!uenoZoo.station_id || !uenoZoo.station_id.includes('Ueno')) {
             const { error: linkError } = await supabase
                .from('l1_places')
                .update({ station_id: 'Hub:Ueno' })
                .eq('id', uenoZoo.id);

            if (linkError) console.error('Link Error:', linkError);
            else console.log('✅ Linked to Hub:Ueno');
        }
    } else {
        console.log('❌ Ueno Zoo NOT found in query results.');
    }
}

findAndFixZoo();
