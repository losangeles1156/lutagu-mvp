
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function activateStations() {
    console.log('--- Activating Inactive Stations ---');

    const { data: inactiveStations, error: fetchError } = await supabase
        .from('nodes')
        .select('id, name')
        .eq('node_type', 'station')
        .or('is_active.eq.false,is_active.is.null');

    if (fetchError) {
        console.error('Error fetching inactive stations:', fetchError);
        return;
    }

    console.log(`Found ${inactiveStations?.length || 0} inactive or null stations.`);

    if (inactiveStations && inactiveStations.length > 0) {
        const ids = inactiveStations.map(n => n.id);

        // Update in batches of 100
        const batchSize = 100;
        for (let i = 0; i < ids.length; i += batchSize) {
            const batch = ids.slice(i, i + batchSize);
            const { error: updateError } = await supabase
                .from('nodes')
                .update({ is_active: true })
                .in('id', batch);

            if (updateError) {
                console.error(`Error updating batch ${i / batchSize}:`, updateError);
            } else {
                console.log(`Updated batch ${i / batchSize + 1}/${Math.ceil(ids.length / batchSize)}`);
            }
        }
        console.log('Activation complete.');
    }
}

activateStations();
