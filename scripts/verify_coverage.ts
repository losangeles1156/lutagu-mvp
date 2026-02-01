
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// 加載環境變量
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCoverage() {
    console.log('🔍 Checking Database Coverage...\n');

    // 1. L1 Coverage (Nodes)
    const { count: nodesCount, error: nodesError } = await supabase
        .from('nodes')
        .select('*', { count: 'exact', head: true });

    if (nodesError) console.error('Error checking nodes:', nodesError.message);
    else console.log(`✅ [L1 Coverage] Total Nodes: ${nodesCount}`);

    // 2. L4 Coverage (Knowledge Chunks)
    const { count: l4Count, error: l4Error } = await supabase
        .from('l4_knowledge_embeddings')
        .select('*', { count: 'exact', head: true });

    if (l4Error) console.error('Error checking l4_knowledge:', l4Error.message);
    else console.log(`✅ [L4 Coverage] Total Knowledge Chunks: ${l4Count}`);

    // 3. L4 Breakdown by Type
    const { data: breakdown, error: breakdownError } = await supabase
        .from('l4_knowledge_embeddings')
        .select('knowledge_type');

    if (breakdownError) {
        console.error('Error checking breakdown:', breakdownError.message);
    } else {
        const stats: Record<string, number> = {};
        breakdown?.forEach((item: any) => {
            stats[item.knowledge_type] = (stats[item.knowledge_type] || 0) + 1;
        });
        console.log('📊 [L4 Breakdown]:');
        Object.entries(stats).forEach(([type, count]) => {
            console.log(`   - ${type}: ${count}`);
        });
    }
}

checkCoverage();
