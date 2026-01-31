import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../../../../.env.local') });

// Setup Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase Credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Setup Embedding Service (Simple local implementation to avoid complex imports for this script)
async function generateEmbedding(text: string): Promise<number[]> {
    const apiKey = process.env.VOYAGE_API_KEY;
    if (!apiKey) {
        console.error('❌ Missing VOYAGE_API_KEY');
        throw new Error('Missing VOYAGE_API_KEY');
    }

    const model = 'voyage-4-lite';
    try {
        const response = await fetch('https://api.voyageai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                input: text,
                model: model,
                input_type: 'document'
            })
        });

        if (!response.ok) {
            throw new Error(await response.text());
        }

        const data = await response.json();
        return data.data?.[0]?.embedding || [];
    } catch (e) {
        console.error('Embedding failed:', e);
        throw e;
    }
}

// Main Ingestion Logic
async function ingest() {
    const jsonPath = path.resolve(__dirname, '../data/knowledge_base.json');
    console.log(`📂 Loading knowledge from: ${jsonPath}`);

    const rawData = fs.readFileSync(jsonPath, 'utf-8');
    const items = JSON.parse(rawData);

    console.log(`🔢 Found ${items.length} items. Starting ingestion...`);

    let success = 0;
    let fail = 0;

    for (const item of items) {
        try {
            console.log(`Processing: ${item.id}`);

            // 1. Generate Embedding
            const embedding = await generateEmbedding(item.content);

            if (!embedding || embedding.length === 0) {
                console.warn(`⚠️ Empty embedding for ${item.id}, skipping.`);
                fail++;
                continue;
            }

            // 2. Insert into Supabase
            // Metadata includes everything except content and core ID
            const { id, content, ...metadata } = item;

            const { error } = await supabase
                .from('knowledge_vectors')
                .upsert({
                    id: id, // Use same ID for idempotency
                    content: content,
                    metadata: metadata,
                    embedding: embedding
                });

            if (error) {
                console.error(`❌ DB Insert Error for ${item.id}:`, error);
                fail++;
            } else {
                process.stdout.write('.');
                success++;
            }

            // Rate limit safety delay
            await new Promise(resolve => setTimeout(resolve, 200));

        } catch (e) {
            console.error(`❌ Error processing ${item.id}:`, e);
            fail++;
        }
    }

    console.log('\n✅ Ingestion Complete!');
    console.log(`Success: ${success}`);
    console.log(`Failed: ${fail}`);
}

ingest().catch(e => console.error(e));
