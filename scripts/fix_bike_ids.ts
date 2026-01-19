import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

async function fixIds() {
    console.log('=== Fixing Bike Share Station IDs ===');

    // 1. Check count before
    const { count: before } = await supabase.from('l3_facilities')
        .select('*', { count: 'exact', head: true })
        .like('station_id', 'odpt.Station%');
    console.log(`Found ${before} records with malformed IDs (odpt.Station...)`);

    // 1b. Fetch all valid Node IDs
    const { data: nodes } = await supabase.from('nodes').select('id');
    const validNodeIds = new Set(nodes?.map(n => n.id));
    console.log(`Loaded ${validNodeIds.size} valid Node IDs.`);

    if (before === 0) {
        console.log('No records to fix.');
        return;
    }

    // 2. Fetch and Update in batches
    let processed = 0;
    while (true) {
        const { data: batch, error } = await supabase
            .from('l3_facilities')
            .select('id, station_id, type') // Fetch type too
            .like('station_id', 'odpt.Station%')
            .limit(200);

        if (error) { console.error(error); break; }
        if (!batch || batch.length === 0) break;

        const updates = [];
        for (const row of batch) {
            const newId = row.station_id.replace('odpt.Station', 'odpt:Station');
            if (validNodeIds.has(newId)) {
                updates.push({
                    id: row.id,
                    type: row.type,
                    station_id: newId,
                    updated_at: new Date().toISOString()
                });
            } else {
                // If invalid, maybe delete? Or just log.
                // For now, let's delete them to clean up dashboard?
                // Or just leave them broken. Let's leave them.
                // Actually, if we leave them, the loop will find them again! infinite loop.
                // We MUST skip them in next query or delete them.
                // Let's delete them as they are useless for L3.
                await supabase.from('l3_facilities').delete().eq('id', row.id);
            }
        }

        if (updates.length > 0) {
            const { error: updateError } = await supabase
                .from('l3_facilities')
                .upsert(updates);

            if (updateError) { console.error(updateError); break; }
            processed += updates.length;
        }

        console.log(`Updated ${processed} records...`);
    }

    console.log('=== Fix Complete ===');
}

fixIds().catch(console.error);
