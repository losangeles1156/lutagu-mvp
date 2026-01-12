
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const targets = [
    'Ueno', 'Asakusa', 'Tokyo', 'Akihabara', 'Shinjuku', 'Shibuya', 'Ginza', 'Ikebukuro',
    'Shimbashi', 'Shinagawa', 'Oshiage', 'Haneda', 'Narita', 'Roppongi', 'Kinshicho',
    'Nihonbashi', 'Hamamatsucho', 'Iidabashi', 'Ochanomizu'
];

async function audit() {
    console.log('--- L4 Knowledge Audit for 19 Stations ---\n');

    for (const name of targets) {
        // 1. Check Embeddings
        const { data: emb } = await supabase
            .from('l4_knowledge_embeddings')
            .select('id, content, knowledge_type')
            .ilike('entity_id', `%${name}%`);

        const embCount = emb?.length || 0;
        const corrupted = emb?.filter(e => e.content.includes('[object Object]')).length || 0;

        // 2. Check Nodes (riding_knowledge)
        const { data: nodes } = await supabase
            .from('nodes')
            .select('id, riding_knowledge')
            .ilike('id', `%${name}%`);

        const nodeWithKnowledge = nodes?.filter(n => n.riding_knowledge && Object.keys(n.riding_knowledge).length > 0).length || 0;

        console.log(`${name.padEnd(15)} | Embeddings: ${embCount} (${corrupted} corrupted) | Nodes with K: ${nodeWithKnowledge}/${nodes?.length || 0}`);
    }
}

audit();
