
import { HybridEngine } from '../src/lib/l4/HybridEngine';
import { DataMux } from '../src/lib/data/DataMux';

// Mock Environment Variables if needed
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'mock';

async function verifyPolicies() {
    const engine = new HybridEngine();
    const stationId = 'odpt:Station:JR-East.Shinjuku';

    const testCases = [
        {
            policy: 'Traffic Vacuum (Last Mile)',
            query: "How to get to Zenpukuji Park? It seems far to walk.",
            expectedStrategy: 'last_mile_connector',
            context: { currentStation: stationId }
        },
        {
            policy: 'Overtourism (Crowd Dispersion)',
            query: "Asakusa is too crowded! Any similar vibe places that are quiet?",
            expectedStrategy: 'crowd_dispatcher',
            context: { currentStation: 'odpt:Station:TokyoMetro.Asakusa' }
        },
        {
            policy: 'Hands-Free (Luggage)',
            query: "All coin lockers are full... I have heavy luggage.",
            expectedStrategy: 'luggage_logistics',
            context: { currentStation: stationId }
        },
        {
            policy: 'Barrier-Free (Accessibility)',
            query: "I have a stroller, need an elevator route to the park.",
            expectedStrategy: 'accessibility_master',
            context: { currentStation: stationId, preferences: { categories: ['wheelchair'] } }
        },
        // Phase 4: Expert Knowledge
        {
            policy: 'Expert Knowledge (Fares)',
            query: "I have a 4 year old child, do I need a ticket?",
            expectedStrategy: 'expert_knowledge_rag',
            context: { currentStation: stationId }
        },
        {
            policy: 'Expert Knowledge (JR Pass)',
            query: "Can I use my JR Pass on the Ginza Line? I want to save money.",
            expectedStrategy: 'expert_knowledge_rag',
            context: { currentStation: stationId }
        }
    ];

    console.log("🚀 Starting Phase 3 Policy Verification...\n");

    for (const tc of testCases) {
        console.log(`\n--------------------------------------------------`);
        console.log(`🧪 Testing Policy: [${tc.policy}]`);
        console.log(`📝 Query: "${tc.query}"`);

        const result = await engine.processRequest({
            text: tc.query,
            locale: 'en',
            context: {
                currentStation: tc.context.currentStation,
                userLocation: { lat: 35.69, lng: 139.70 },
                preferences: tc.context.preferences
            }
        });

        if (result && result.data && result.data.strategy === tc.expectedStrategy) {
            console.log(`✅ PASS: Triggered strategy '${result.data.strategy}'`);
            console.log(`💡 Response: ${result.content}`);
            // In real test we would check if SignalCollector logged, here we rely on console output from SignalCollector
        } else {
            console.log(`❌ FAIL: Expected '${tc.expectedStrategy}', got '${result?.data?.strategy || 'None'}'`);
            console.log(`Result Source: ${result?.source}`);
        }
    }
}

// Run verify
verifyPolicies().catch(console.error);
