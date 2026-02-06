
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { POITaggedDecisionEngine } from '../../src/lib/ai/poi-tagged-decision-engine';
import { searchL4Knowledge } from '../../src/lib/l4/searchService';

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRuntime() {
    console.log('=== Testing POITaggedDecisionEngine ===');
    const engine = new POITaggedDecisionEngine(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!
    );

    const queries = [
        '想找飯店',
        '便宜的住宿',
        '拉麵',
        '安靜的咖啡廳'
    ];

    for (const query of queries) {
        console.log(`\nQuery: "${query}"`);
        try {
            const results = await engine.decide({
                userId: 'test-user',
                location: { lat: 35.6812, lng: 139.7671 } // Tokyo Station
            }, query);

            console.log(`Found ${results.length} results.`);
            if (results.length > 0) {
                const top = results[0];
                console.log('Top Result:', {
                    name: top.name,
                    relevance: top.relevanceScore,
                    matchedCriteria: top.matchedCriteria,
                    tags_core: top.tags_core,
                    tags_intent: top.tags_intent
                });
            }
        } catch (e) {
            console.error('Error in decide:', e);
        }
    }

    console.log('\n=== Testing searchL4Knowledge ===');
    const l4Queries = [
        '大型行李',
        '避開人潮',
        '電梯'
    ];

    for (const query of l4Queries) {
        console.log(`\nL4 Query: "${query}"`);
        try {
            const results = await searchL4Knowledge({
                query,
                topK: 3
            });

            console.log(`Found ${results.length} results.`);
            if (results.length > 0) {
                const top = results[0];
                console.log('Top Result:', {
                    content: top.content.substring(0, 50) + '...',
                    tags_core: (top as any).tags_core,
                    tags_intent: (top as any).tags_intent
                });
            }
        } catch (e) {
            console.error('Error in searchL4Knowledge:', e);
        }
    }
}

testRuntime();
