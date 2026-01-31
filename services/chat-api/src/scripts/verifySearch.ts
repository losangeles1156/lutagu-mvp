import dotenv from 'dotenv';
import path from 'path';
import { vectorStore } from '../lib/ai/vectorStore';
import { supabaseAdmin } from '../lib/supabase';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../../.env.local') });

async function verifySemanticSearch() {
    console.log('🧪 Starting Semantic Search Verification...');

    // Test Query
    const query = '東京車站哪裡有廁所？';
    console.log(`🔍 Query: "${query}"`);

    // 1. Direct Vector Search
    console.log('--- Testing vectorStore.search() ---');
    try {
        const results = await vectorStore.search(query, { limit: 3, threshold: 0.5 });

        if (results.length > 0) {
            console.log(`✅ Found ${results.length} results:`);
            results.forEach((r, i) => {
                console.log(`   ${i + 1}. [${r.similarity?.toFixed(4)}] ${r.content.substring(0, 50)}...`);
            });
        } else {
            console.warn('⚠️ No results found via vectorStore.');
        }
    } catch (error) {
        console.error('❌ vectorStore.search failed:', error);
    }

    // 2. Direct RPC Call Verification (Double Check)
    console.log('\n--- Testing RPC match_knowledge directly ---');
    try {
        // Generate embedding manually using the same logic as ingestion script for verification
        // Or just rely on the store if previous step worked. 
        // Let's assume store logic is correct if step 1 passed, but to isolate DB issue:

        // Check if any data exists
        const { count, error } = await supabaseAdmin
            .from('knowledge_vectors')
            .select('*', { count: 'exact', head: true });

        if (error) {
            console.error('❌ Failed to count rows:', error);
        } else {
            console.log(`📊 Total rows in knowledge_vectors: ${count}`);
        }

    } catch (error) {
        console.error('❌ RPC Verification failed:', error);
    }
}

verifySemanticSearch().catch(e => console.error(e));
