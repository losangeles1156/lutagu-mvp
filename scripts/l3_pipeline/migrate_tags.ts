
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { TagGenerator } from '../../src/lib/l1/TagGenerator';

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateL3Tags() {
    console.log('Starting L3 Tag Migration...');

    let processedCount = 0;
    let errorCount = 0;
    const pageSize = 100;
    let page = 0;

    try {
        while (true) {
            const { data: facilities, error } = await supabase
                .from('l3_facilities')
                .select('*')
                .range(page * pageSize, (page + 1) * pageSize - 1);

            if (error) throw error;
            if (!facilities || facilities.length === 0) break;

            console.log(`Processing batch ${page + 1} (${facilities.length} items)...`);

            for (const facility of facilities) {
                try {
                    const tags = TagGenerator.generateForL3({
                        type: facility.type,
                        attributes: facility.attributes || {}
                    });

                    const { error: updateError } = await supabase
                        .from('l3_facilities')
                        .update({
                            tags_core: tags.tags_core,
                            tags_intent: tags.tags_intent,
                            tags_visual: tags.tags_visual
                        })
                        .eq('id', facility.id);

                    if (updateError) {
                        console.error(`Failed to update facility ${facility.id}:`, updateError);
                        errorCount++;
                    } else {
                        processedCount++;
                    }
                } catch (err) {
                    console.error(`Error processing facility ${facility.id}:`, err);
                    errorCount++;
                }
            }

            page++;
        }

        console.log(`Migration completed.`);
        console.log(`Processed: ${processedCount}`);
        console.log(`Errors: ${errorCount}`);

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrateL3Tags();
