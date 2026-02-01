
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
async function main() {
    console.log('🔍 Verifying Vector Search Setup...');
    // 1. Check Env
    const apiKey = process.env.MINIMAX_API_KEY || process.env.OPENAI_API_KEY;
    console.log(`🔑 API Key (Prefix): ${apiKey ? apiKey.substring(0, 8) + '...' : 'MISSING'}`);

    // 2. Test Embedding
    console.log('🧠 Generating Embedding for "Tokyo Station"...');
    // Ensure EmbeddingService uses the loaded key
    const vector = await EmbeddingService.generateEmbedding("Tokyo Station");
    const isZero = vector.every(v => v === 0);
    console.log(`📉 Vector generated. Length: ${vector.length}, Is Zero Mock: ${isZero}`);
    if (isZero) {
        console.warn('⚠️ Embedding Service returned Zero Vector (Mock). Continuing to test DB RPC with mock vector...');
        // return; // Allow proceeding to test RPC
    }
    // 3. Test RPC (Expert Knowledge)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Supabase Env Vars missing.');
        return;
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 3.1 Insert Test Data
    console.log('📝 Inserting Test Rule...');
    const testContent = "Vector Search Test Rule: Tokyo Station has a Marunouchi exit.";
    const testEmbedding = await EmbeddingService.generateEmbedding(testContent);

    // Check if table exists by simple select
    const { error: checkError } = await supabase.from('expert_knowledge').select('id').limit(1);
    // 42P01 is undefined_table
    if (checkError && checkError.code === '42P01') {
        console.error('❌ Table expert_knowledge does not exist. Migration might not have run.');
        return;
    }
    const { data: insertData, error: insertError } = await supabase
        .from('expert_knowledge')
        .insert({
            content: testContent,
            embedding: testEmbedding,
            category: 'test',
            tags: ['test']
        })
        .select()
        .single();

    if (insertError) {
        console.error('❌ Insert Test Data Failed:', insertError.message);
        return;
    }
    console.log('✅ Test Data Inserted ID:', insertData.id);
    // 3.2 Search
    console.log('🗄️ Calling match_expert_knowledge RPC for "Marunouchi exit"...');

    const searchVector = await EmbeddingService.generateEmbedding("Marunouchi exit");
    const { data: searchResults, error: searchError } = await supabase.rpc('match_expert_knowledge', {
        query_embedding: searchVector,
        match_threshold: 0.5,
        match_count: 1
    });
    if (searchError) {
        console.error('❌ RPC Failed:', searchError.message);
    } else {
        console.log('✅ RPC Call Successful!');
        console.log('📄 Search Results:', searchResults);

        const matched = searchResults && searchResults.some((r: any) => r.id === insertData.id);
        if (matched) {
            console.log('🎉 SUCCESS: Retrieved inserted test rule via vector search!');
        } else {
            console.log('Original ID:', insertData.id);
            if (searchResults) searchResults.forEach((r: any) => console.log('Result ID:', r.id));
            console.warn('⚠️ WARNING: Did not verify inserted rule (Ranking issue or RPC logic).');
        }
    }
    // 3.3 Cleanup
    console.log('🧹 Cleaning up test data...');
    await supabase.from('expert_knowledge').delete().eq('id', insertData.id);
    console.log('✅ Cleanup done.');
}
main().catch(err => console.error('FATAL:', err));
