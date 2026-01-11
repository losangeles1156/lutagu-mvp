
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

async function migrateL4Tags() {
    console.log('Starting L4 Tag Migration...');

    let processedCount = 0;
    let errorCount = 0;
    const pageSize = 50;
    let page = 0;

    try {
        while (true) {
            // Note: l4_knowledge_embeddings might be large, paging is essential
            const { data: items, error } = await supabase
                .from('l4_knowledge_embeddings')
                .select('*')
                .range(page * pageSize, (page + 1) * pageSize - 1);

            if (error) throw error;
            if (!items || items.length === 0) break;

            console.log(`Processing batch ${page + 1} (${items.length} items)...`);

            for (const item of items) {
                try {
                    // Extract title from entity_name (JSONB)
                    const titleV = item.entity_name ?
                        (item.entity_name['zh-TW'] || item.entity_name['en'] || item.entity_name['ja'] || '')
                        : '';

                    // Generate new tags
                    const tags = TagGenerator.generateForL4({
                        category: item.knowledge_type || 'general',
                        title: titleV,
                        content: item.content || ''
                    });

                    // Update record
                    const { error: updateError } = await supabase
                        .from('l4_knowledge_embeddings')
                        .update({
                            tags_core: tags.tags_core,
                            tags_intent: tags.tags_intent
                            // tags_visual is not part of L4 schema yet, or if it is we can add it. 
                            // Based on task description, only core and intent were added to L4.
                        })
                        .eq('id', item.id);

                    if (updateError) {
                        console.error(`Failed to update item ${item.id}:`, updateError);
                        errorCount++;
                    } else {
                        processedCount++;
                    }
                } catch (err) {
                    console.error(`Error processing item ${item.id}:`, err);
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

migrateL4Tags();
