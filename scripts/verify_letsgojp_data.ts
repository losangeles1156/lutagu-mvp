import { searchL4Knowledge } from '../src/lib/l4/searchService';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function verify() {
    const targets = [
        { name: '池袋 (Ikebukuro)', id: 'odpt:Station:JR-East.Ikebukuro' },
        { name: '新宿 (Shinjuku)', id: 'odpt:Station:JR-East.Shinjuku' },
        { name: '上野 (Ueno)', id: 'odpt:Station:JR-East.Ueno' }
    ];

    console.log('=== LetsGoJP Expert Knowledge Verification ===\n');

    for (const target of targets) {
        console.log(`--- Testing: ${target.name} ---`);
        const results = await searchL4Knowledge({
            query: `What are the traps and hacks at ${target.name} station?`,
            stationId: target.id,
            topK: 5,
            threshold: 0.3
        });

        if (results.length === 0) {
            console.log('❌ No results found.');
        } else {
            results.forEach((r, i) => {
                console.log(`${i + 1}. [${r.knowledge_type}] (Sim: ${r.similarity?.toFixed(3)})`);
                console.log(`   Content: ${r.content?.substring(0, 150)}...`);
            });
        }
        console.log('\n');
    }
}

verify().catch(console.error);
