import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkConsistency() {
    console.log('--- Data Consistency Verification Report ---');
    
    // 1. Get sample of L4 data
    const { data: l4Samples, error: l4Error } = await supabase
        .from('l4_knowledge_embeddings')
        .select('source, entity_id, entity_name')
        .order('updated_at', { ascending: false })
        .limit(1000); // Increased limit to see older entries

    if (l4Error) {
        console.error('Error fetching L4 data:', l4Error);
        return;
    }

    const uniqueSources = Array.from(new Set(l4Samples.map(s => s.source)));
    console.log(`Found ${l4Samples.length} L4 entries from ${uniqueSources.length} unique sources.`);

    // 2. Check corresponding L1 data
    const { data: l1Entries, error: l1Error } = await supabase
        .from('crawler_raw_data')
        .select('url, title')
        .in('url', uniqueSources);

    if (l1Error) {
        console.error('Error fetching L1 data:', l1Error);
        return;
    }

    const l1Urls = new Set(l1Entries.map(e => e.url));
    console.log(`Found ${l1Entries.length} corresponding L1 entries.`);

    // 3. Compare
    let matched = 0;
    let missing = 0;
    const missingUrls: string[] = [];

    for (const source of uniqueSources) {
        if (l1Urls.has(source)) {
            matched++;
        } else {
            missing++;
            missingUrls.push(source);
        }
    }

    console.log('\n--- Summary ---');
    console.log(`Successfully Synced (L1 & L4): ${matched}`);
    console.log(`Missing L1 (only L4 exists): ${missing}`);
    
    if (missing > 0) {
        console.log('\nMissing L1 URLs (possibly from previous failed runs):');
        missingUrls.forEach(url => console.log(`- ${url}`));
    }

    console.log('\n--- Sample Mapping (L4 -> L1) ---');
    l1Entries.slice(0, 5).forEach(e => {
        console.log(`Source: ${e.url}`);
        console.log(`Title: ${e.title}`);
        console.log('---');
    });
}

checkConsistency();
