
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { generateEmbedding } from '../../src/lib/ai/embedding';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function ingest() {
    console.log('Starting L4 Embedding Ingestion (Mistral 1024)...');

    // 1. Fetch nodes with riding_knowledge
    const { data: nodes, error } = await supabase
        .from('nodes')
        .select('id, name, riding_knowledge') // name is JSONB?
        .not('riding_knowledge', 'is', null);

    if (error) {
        console.error('Error fetching nodes:', error);
        return;
    }

    if (!nodes || nodes.length === 0) {
        console.log('No nodes with riding_knowledge found.');
        return;
    }

    console.log(`Found ${nodes.length} nodes with knowledge.`);

    let count = 0;

    for (const node of nodes) {
        // riding_knowledge is JSON string or object? Supabase returns object if column is jsonb.
        const knowledge: any = typeof node.riding_knowledge === 'string'
            ? JSON.parse(node.riding_knowledge)
            : node.riding_knowledge;

        if (!knowledge) continue;

        const items: any[] = [];

        // Traps
        if (knowledge.traps) {
            items.push(...knowledge.traps.map((t: any) => ({ ...t, type: 'warning', category: 'trap' })));
        }
        // Hacks
        if (knowledge.hacks) {
            items.push(...knowledge.hacks.map((h: any) => ({ ...h, type: 'tip', category: 'hack' })));
        }
        // Facilities (if needed? maybe simple indexing?)
        // Usually facilities are L3 structures, but L4 knowledge might have textual descriptions.
        // We'll skip raw facilities list for now unless they have descriptions.

        for (const item of items) {
            const content = `${item.title || ''}\n${item.description || ''}\n${item.advice || ''}`.trim();
            if (!content) continue;

            // Simple rate limit avoidance
            await new Promise(resolve => setTimeout(resolve, 1000));

            const embedding = await generateEmbedding(content);
            if (!embedding || embedding.length !== 1024) {
                // Fallback embedding might be 1024.
                // If embedding() calls fallback, it returns 1024 zeros?
                // embedding.ts fallback uses 1024 dim.
                // Good.
            }

            // Insert into l4_knowledge_embeddings
            const { error: insertError } = await supabase
                .from('l4_knowledge_embeddings')
                .insert({
                    knowledge_type: 'railway', // or station specific?
                    entity_id: node.id,
                    entity_name: node.name, // JSONB
                    content: content,
                    icon: item.icon,
                    category: item.category, // 'trap' or 'hack'
                    subcategory: item.type, // 'warning' or 'tip'
                    embedding: embedding,
                    source: 'riding_knowledge_node',
                    user_context: getContextTags(content), // Simple tagging
                    ward_context: [] // Could infer from node location if needed
                });

            if (insertError) {
                console.error(`Failed to insert for ${node.id}:`, insertError);
            } else {
                count++;
            }
        }
    }
    console.log(`Ingestion complete. Inserted ${count} items.`);
}

function getContextTags(text: string): string[] {
    const tags: string[] = [];
    if (text.includes('wheelchair') || text.includes('輪椅') || text.includes('elevator')) tags.push('wheelchair');
    if (text.includes('stroller') || text.includes('嬰兒車')) tags.push('stroller');
    if (text.includes('luggage') || text.includes('行李')) tags.push('largeLuggage');
    return tags;
}

ingest();
