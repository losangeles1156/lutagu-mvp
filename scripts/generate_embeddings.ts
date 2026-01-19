
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

// --- Configuration ---
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
}

if (!GOOGLE_API_KEY) {
    console.error('❌ Missing GOOGLE_API_KEY in .env.local');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "embedding-001" }); // Or text-embedding-004

async function generateEmbedding(text: string): Promise<number[] | null> {
    try {
        const result = await model.embedContent(text);
        const embedding = result.embedding;
        return embedding.values;
    } catch (error) {
        console.error('Error generating embedding:', error);
        return null;
    }
}

async function main() {
    console.log('=== Generating Embeddings for Stations ===');

    // 1. Fetch stations without embeddings
    // Note: 'embedding' column might not exist yet if migration isn't applied.
    // We assume migration 20251231_enable_pgvector_stations.sql is applied.

    // First check if column exists/fetchable
    const { data: stations, error } = await supabase
        .from('stations_static')
        .select('id, name, tags, embedding') // Select embedding to check if it's null
        .is('embedding', null)
        .limit(100); // Process in batches

    if (error) {
        console.error('❌ Error fetching stations:', error.message);
        console.log('   (Did you apply the migration 20251231_enable_pgvector_stations.sql?)');
        return;
    }

    if (!stations || stations.length === 0) {
        console.log('✅ All stations have embeddings (or no stations found).');
        return;
    }

    console.log(`Found ${stations.length} stations needing embeddings.`);

    for (const station of stations) {
        // Construct text to embed
        // We combine Name and Tags for a rich semantic representation
        const nameStr = JSON.stringify(station.name);
        const tagsStr = JSON.stringify(station.tags || {});

        // You can refine this template
        const textToEmbed = `Station: ${nameStr}. Features: ${tagsStr}`;

        console.log(`Processing: ${station.id}...`);

        const vector = await generateEmbedding(textToEmbed);

        if (vector) {
            const { error: updateError } = await supabase
                .from('stations_static')
                .update({ embedding: vector })
                .eq('id', station.id);

            if (updateError) {
                console.error(`❌ Failed to update ${station.id}:`, updateError.message);
            } else {
                console.log(`✅ Updated ${station.id}`);
            }
        }

        // Rate limit / Avoid hitting API limits too hard
        await new Promise(r => setTimeout(r, 500));
    }

    console.log('\n=== Batch Complete ===');
    console.log('Run again to process more stations if needed.');
}

main().catch(console.error);
