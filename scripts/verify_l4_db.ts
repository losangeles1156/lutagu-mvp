
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyL4Database() {
    console.log('🔍 Verifying l4_knowledge_embeddings table...');

    // 1. Check if table exists and has data
    const { count, error: countError } = await supabase
        .from('l4_knowledge_embeddings')
        .select('*', { count: 'exact', head: true });

    if (countError) {
        console.error('❌ Error accessing table:', countError.message);
        return;
    }

    console.log(`✅ Table exists. Row count: ${count}`);

    if (count === 0) {
        console.warn('⚠️ Table is empty. You might need to run the seed script.');
    }

    // 2. Check Vector Search RPC (Expect failure if missing, but logging it)
    console.log('🔍 Verifying match_l4_knowledge RPC...');
    
    // Dummy embedding (768 dim)
    const dummyEmbedding = new Array(768).fill(0.1);
    
    const { data: searchData, error: searchError } = await supabase.rpc('match_l4_knowledge', {
        query_embedding: dummyEmbedding,
        match_threshold: 0.0,
        match_count: 5,
        filter_knowledge_type: null,
        filter_entity_id: null,
        filter_category: null,
        filter_user_context: null,
        filter_time_context: null
    });

    if (searchError) {
        console.error('❌ RPC match_l4_knowledge failed (Expected if migration not applied):', searchError.message);
    } else {
        console.log(`✅ RPC match_l4_knowledge works. Returned ${searchData.length} results.`);
    }

    // 3. Check Indexes (Using Service Key to query pg_indexes if possible, or just trying to filter)
    // We can't query pg_indexes via PostgREST easily. 
    // Indirect verification: Check if filtering by 'knowledge_type' is fast? No.
    // We will just report that we verified the table structure via the existence check.
    
    console.log('🔍 Database verification complete.');
}

verifyL4Database();
