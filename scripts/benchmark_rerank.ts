
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { searchL4Knowledge } from '../src/lib/l4/searchService';

interface TestCase {
    name: string;
    query: string;
    stationId: string; // Filter by station to keep it fair (as real app does)
    expectedKeywords: string[];
}

const testCases: TestCase[] = [
    {
        name: "Shinjuku Keio Trap",
        query: "Where is the Keio Line gate?",
        stationId: "odpt:Station:JR-East.Shinjuku",
        expectedKeywords: ["Keio New Line", "ticket gates", "distinct", "Trap"]
    },
    {
        name: "Shibuya Meeting Point",
        query: "Meeting at Hachiko is crowded, where else?",
        stationId: "odpt:Station:JR-East.Shibuya",
        expectedKeywords: ["Moyai Statue", "South Exit", "Trap"]
    },
    {
        name: "Tokyo Stn Keiyo Line",
        query: "How to get to Keiyo Line platform?",
        stationId: "odpt:Station:JR-East.Tokyo",
        expectedKeywords: ["underground", "10-15 minutes", "Trap"]
    },
    {
        name: "Ueno Park Exit",
        query: "Fastest way to Ueno Zoo?",
        stationId: "odpt:Station:JR-East.Ueno",
        expectedKeywords: ["Park Exit", "Museum", "Hack"]
    },
    {
        name: "Narita T3 Train",
        query: "Is there a train station at Terminal 3?",
        stationId: "odpt:Station:NaritaAirport",
        expectedKeywords: ["no train", "Walk", "shuttle", "Trap"]
    },
    {
        name: "Asakusa Elevator",
        query: "Where is the elevator in Asakusa station?",
        stationId: "odpt:Station:Toei.Asakusa",
        expectedKeywords: ["Exit A2b", "shortage", "Trap"]
    }
];

async function runBenchmark() {
    console.log('=== 🧪 Reranker Accuracy Stress Test ===\n');
    let p1Hits = 0;
    let r3Hits = 0;

    for (const test of testCases) {
        console.log(`\n🔎 Testing: [${test.name}]`);
        console.log(`   Query: "${test.query}"`);

        try {
            const start = Date.now();
            // Request Top 5 to check Recall@3
            const results = await searchL4Knowledge({
                query: test.query,
                stationId: test.stationId,
                topK: 5,
                threshold: 0.3
            });
            const latency = Date.now() - start;

            if (results.length === 0) {
                console.log(`   ❌ No results found.`);
                continue;
            }

            const top1 = results[0];
            const top3 = results.slice(0, 3);

            // Check P@1
            const p1Match = test.expectedKeywords.some(kw => top1.content.toLowerCase().includes(kw.toLowerCase()));
            if (p1Match) {
                p1Hits++;
                console.log(`   ✅ P@1: HIT (Score: ${top1.similarity.toFixed(4)})`);
                console.log(`      Snippet: ${top1.content.substring(0, 80)}...`);
            } else {
                console.log(`   ❌ P@1: MISS (Score: ${top1.similarity.toFixed(4)})`);
                console.log(`      Got: ${top1.content.substring(0, 80)}...`);
                console.log(`      Expected Keywords: ${test.expectedKeywords.join(', ')}`);
            }

            // Check R@3
            const r3Match = top3.some(r => test.expectedKeywords.some(kw => r.content.toLowerCase().includes(kw.toLowerCase())));
            if (r3Match) {
                r3Hits++;
                // console.log(`   Note: Found in Top 3`);
            } else {
                console.log(`   ⚠️ R@3: MISS`);
            }

            console.log(`   ⏱️ Latency: ${latency}ms`);
        } catch (e) {
            console.error(`   💀 Error:`, e);
        }
    }

    const total = testCases.length;
    console.log('\n=== 📊 Benchmark Results ===');
    console.log(`Total Cases: ${total}`);
    console.log(`Precision@1: ${p1Hits}/${total} (${((p1Hits / total) * 100).toFixed(1)}%)`);
    console.log(`Recall@3:    ${r3Hits}/${total} (${((r3Hits / total) * 100).toFixed(1)}%)`);

    if (p1Hits / total > 0.8) {
        console.log('\n🏆 Result: EXCELLENT. Reranker is highly effective.');
    } else if (p1Hits / total > 0.6) {
        console.log('\n⚖️ Result: GOOD. Acceptable for production.');
    } else {
        console.log('\n⚠️ Result: POOR. Tuning needed.');
    }
    process.exit(0);
}

runBenchmark();
