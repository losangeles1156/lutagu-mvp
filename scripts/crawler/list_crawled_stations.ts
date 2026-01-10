import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;

async function listCrawledStations() {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    
    console.log('--- Querying l4_knowledge_embeddings for crawled stations ---');
    
    const { data, error } = await supabase
        .from('l4_knowledge_embeddings')
        .select('entity_name, source, knowledge_type')
        .not('source', 'is', null);

    if (error) {
        console.error('Error fetching data:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('No crawled station knowledge found in database.');
        return;
    }

    const stations = new Map<string, Set<string>>();
    data.forEach(item => {
        const name = typeof item.entity_name === 'string' 
            ? item.entity_name 
            : (item.entity_name as any)?.ja || (item.entity_name as any)?.['zh-TW'] || 'Unknown';
        
        if (!stations.has(name)) {
            stations.set(name, new Set());
        }
        if (item.source) {
            stations.get(name)?.add(item.source);
        }
    });

    console.log(`\nFound ${stations.size} stations with crawled knowledge:\n`);
    stations.forEach((sources, name) => {
        console.log(`- ${name} (${sources.size} sources)`);
        sources.forEach(src => console.log(`  └ ${src}`));
    });
}

listCrawledStations();
