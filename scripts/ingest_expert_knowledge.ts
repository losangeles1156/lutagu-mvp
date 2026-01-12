
import { createClient } from '@supabase/supabase-js';
import { EmbeddingService } from '../src/lib/ai/embeddingService';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';

// Load .env.local
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}

// Knowledge Base Data
const KNOWLEDGE_BASE = [
    {
        category: 'fare',
        tags: ['fare', 'child', 'toddler', 'baby', 'price', 'ticket'],
        content: 'Child Fare (6-11 yo) is 50% of Adult Fare. Toddlers (1-5 yo) are FREE (up to 2 per adult). Infants (<1 yo) are always FREE.'
    },
    {
        category: 'access',
        tags: ['pass', 'jr', 'subway', 'metro', 'ticket', 'validity'],
        content: 'The Japan Rail Pass (JR Pass) is VALID on JR Lines (Yamanote, Chuo, etc.) and Tokyo Monorail. It is NOT valid on Tokyo Metro or Toei Subway lines.'
    },
    {
        category: 'fare',
        tags: ['transfer', 'discount', 'metro', 'toei', 'price'],
        content: 'Transferring between Tokyo Metro and Toei Subway within 60 minutes grants a 70 JPY discount on the total fare (Adult).'
    },
    {
        category: 'payment',
        tags: ['ic card', 'suica', 'pasmo', 'compatibility', 'refund'],
        content: 'Suica and Pasmo are fully interchangeable. You can use either card on almost all trains, subways, and buses in Tokyo. Refund is possible at issuing operator stations.'
    },
    {
        category: 'crowd',
        tags: ['rush', 'hour', 'crowd', 'time', 'peak', 'luggage'],
        content: 'Tokyo Rush Hour is typically 7:30-9:30 AM and 5:30-7:30 PM on weekdays. Avoid bulky luggage and strollers during these times if possible.'
    },
    {
        category: 'access',
        tags: ['elevator', 'accessibility', 'transfer', 'path'],
        content: 'For easier elevator access at major stations like Shinjuku or Tokyo, look for "Access" routes marked with wheelchair icons. These are often longer but step-free.'
    },
    {
        category: 'luggage',
        tags: ['locker', 'coin locker', 'storage', 'luggage', 'size'],
        content: 'Large coin lockers (for suitcases) are often full by 10 AM at major stations. Use "Ecbo Cloak" or manned baggage counters as a backup.'
    }
];

const DELAY_MS = 2000; // 2 seconds delay to avoid 1002 Rate Limit

async function main() {
    console.log('📚 Starting Knowledge Ingestion...');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Supabase Creds Missing');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    for (const [index, item] of KNOWLEDGE_BASE.entries()) {
        console.log(`\n[${index + 1}/${KNOWLEDGE_BASE.length}] Processing: "${item.content.substring(0, 30)}..."`);

        try {
            // Use type: 'db' as verified in debug script
            const vector = await EmbeddingService.generateEmbedding(item.content, 'db');

            // Check for mock vector
            const isZero = vector.every(v => v === 0);
            if (isZero) {
                console.warn('⚠️ Got Zero Vector (Mock). Skipping DB insert to prevent pollution.');
                // continue; // Allow insert for now to test flow, or skip? Skip is safer for prod.
                // But for first run, let's skip.
                continue;
            }

            const { error } = await supabase.from('expert_knowledge').insert({
                id: randomUUID(),
                content: item.content,
                embedding: vector,
                category: item.category,
                tags: item.tags,
                created_at: new Date().toISOString()
            });

            if (error) {
                console.error('❌ DB Insert Failed:', error.message);
            } else {
                console.log('✅ Ingested successfully.');
            }

        } catch (e: any) {
            console.error('❌ Processing Error:', e.message);
        }

        // Wait to be nice to API
        console.log(`⏳ Waiting ${DELAY_MS}ms...`);
        await new Promise(r => setTimeout(r, DELAY_MS));
    }

    console.log('\n🎉 Ingestion Complete!');
}

main().catch(console.error);
