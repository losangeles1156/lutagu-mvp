
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { TagGenerator } from '../../src/lib/l1/TagGenerator';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateL1Tags() {
    console.log('Starting L1 Tag Migration...');

    let processedCount = 0;
    let errorCount = 0;
    const pageSize = 100;
    let page = 0;

    try {
        while (true) {
            const { data: places, error } = await supabase
                .from('l1_places')
                .select('*')
                .range(page * pageSize, (page + 1) * pageSize - 1);

            if (error) throw error;
            if (!places || places.length === 0) break;

            console.log(`Processing batch ${page + 1} (${places.length} items)...`);

            for (const place of places) {
                try {
                    // Generate new tags
                    const tags = TagGenerator.generate({
                        name: place.name,
                        category: place.category,
                        attributes: place.category_tags // Assuming category_tags contains usage attributes
                    });

                    // Update record
                    const { error: updateError } = await supabase
                        .from('l1_places')
                        .update({
                            tags_core: tags.tags_core,
                            tags_intent: tags.tags_intent,
                            tags_visual: tags.tags_visual
                        })
                        .eq('id', place.id);

                    if (updateError) {
                        console.error(`Failed to update place ${place.id}:`, updateError);
                        errorCount++;
                    } else {
                        processedCount++;
                    }
                } catch (err) {
                    console.error(`Error processing place ${place.id}:`, err);
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

migrateL1Tags();
