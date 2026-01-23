
import { createClient } from '@supabase/supabase-js';
import { EmbeddingService } from '../src/lib/ai/embeddingService';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load .env.local
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}

// Config
const TARGET_FILE = 'knowledge/stations/riding_knowledge/area_letsgojp_expert.md';
const DELAY_MS = 200; // Fast for Voyage/Gemini

interface KnowledgeItem {
    entity_id: string;
    content: string;
    knowledge_type: string; // 'trap' | 'hack' | 'expert'
    category: string;
    tags: string[];
}

function parseLetsGoJP(filePath: string): KnowledgeItem[] {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const lines = raw.split('\n');
    const items: KnowledgeItem[] = [];

    let currentStationId = '';
    let currentType = 'expert'; // Default

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Station Header: ## odpt:Station:JR-East.Shinjuku（新宿站）
        // We want to extract 'odpt:Station:JR-East.Shinjuku'
        // Regex: ## (odpt:[A-Za-z0-9.:-]+)
        const stationMatch = trimmed.match(/^##\s+(odpt:[A-Za-z0-9.:\-\+]+)/);
        if (stationMatch) {
            currentStationId = stationMatch[1];
            continue;
        }

        // Type Header: ### Traps / ### Hacks
        if (trimmed.startsWith('###')) {
            if (trimmed.toLowerCase().includes('trap')) currentType = 'trap';
            else if (trimmed.toLowerCase().includes('hack')) currentType = 'hack';
            else currentType = 'expert';
            continue;
        }

        // List Items: - [Trap] Content...
        if (trimmed.startsWith('-')) {
            // Remove markdown list dash
            const cleanContent = trimmed.replace(/^-\s*/, '').trim();
            // Optional: Extract [Trap] tag as separate metadat if needed, but keeping in content is good for RAG.

            if (currentStationId) {
                items.push({
                    entity_id: currentStationId,
                    content: cleanContent,
                    knowledge_type: 'expert_knowledge', // Unified type for search filtering, or distinct?
                    // SearchService filters by 'knowledgeType' param. Usually 'expert_knowledge'.
                    // Can we distinguish? Let's use 'expert_knowledge' as primary type, 
                    // and put 'trap'/'hack' in tags or content.
                    // Actually searchService fallback looks for `knowledge_type`.
                    category: 'letsgojp',
                    tags: [currentType, 'letsgojp', 'expert']
                });
            }
        }
    }
    return items;
}

async function main() {
    console.log('📚 Starting LetsGoJP Knowledge Ingestion...');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Supabase Creds Missing');
        process.exit(1);
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Parse
    const filePath = path.join(process.cwd(), TARGET_FILE);
    if (!fs.existsSync(filePath)) {
        console.error(`❌ File not found: ${filePath}`);
        process.exit(1);
    }
    const items = parseLetsGoJP(filePath);
    console.log(`Found ${items.length} items to ingest.`);

    // 2. Clear existing LetsGoJP data to prevent duplicates?
    // Safer to delete by category 'letsgojp'
    console.log('🧹 Clearing old LetsGoJP data...');
    const { error: deleteError } = await supabase
        .from('l4_knowledge_embeddings')
        .delete()
        .eq('category', 'letsgojp');

    if (deleteError) {
        console.error('⚠️ Failed to clear old data (table might not allow delete or not exist):', deleteError.message);
    }

    // 3. Embed & Insert
    for (const [i, item] of items.entries()) {
        process.stdout.write(`[${i + 1}/${items.length}] ${item.entity_id} - ${item.tags[0]}... `);

        try {
            const vector = await EmbeddingService.generateEmbedding(item.content, 'db');

            // Insert
            const { error } = await supabase.from('l4_knowledge_embeddings').insert({
                content: item.content,
                embedding: vector, // Verify column name is 'embedding' (vector type)
                entity_id: item.entity_id,
                knowledge_type: 'expert_knowledge', // Standardize
                category: item.category
            });

            if (error) {
                console.log('❌ DB Error:', error.message);
            } else {
                console.log('✅');
            }
        } catch (e: any) {
            console.log('❌ Error:', e.message);
        }
        await new Promise(r => setTimeout(r, DELAY_MS));
    }
    console.log('🎉 Ingestion Complete');
}

main().catch(console.error);
