
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { hybridEngine, RequestContext } from '../src/lib/l4/HybridEngine';

async function testQuery(query: string, context?: RequestContext) {
    console.log(`\n-----------------------------------`);
    console.log(`\n🧪 Testing Query: "${query}"`);
    if (context) console.log(`   Context:`, JSON.stringify(context));

    const startTime = Date.now();
    const result = await hybridEngine.processRequest({
        text: query,
        locale: 'en',
        context: context
    });
    const duration = Date.now() - startTime;

    console.log(`\n⏱️ Duration: ${duration}ms`);

    if (result) {
        console.log(`✅ Result Type: ${result.type}`);
        console.log(`ℹ️  Source: ${result.source}`);
        console.log(`📝 Content: ${result.content}`);
        console.log(`🧠 Reasoning: ${result.reasoning}`);

        // Check for Agent logs
        const agentLog = result.reasoningLog?.find(l => l.includes('Agent Decision'));
        if (agentLog) {
            console.log(`🤖 \x1b[32m${agentLog}\x1b[0m`); // Green color
        } else {
            console.log(`⚠️ No Agent Decision found in logs (Standard Regex or Fallback used)`);
        }
    } else {
        console.log(`❌ No result returned.`);
    }
}

async function runTests() {
    console.log("🚀 Starting Agentic Flow Tests...");

    // Test 1: Explicit Fare (Should match FareRulesSkill)
    await testQuery("How much is the ticket for a child?");

    // Test 2: Luggage with Parameter (Should match LuggageSkill with params)
    await testQuery("I have a huge suitcase to store", { currentStation: "Unspecified" });

    // Test 3: Complex / Vibe (Should match CrowdDispatcherSkill)
    await testQuery("I want to find a quiet cafe nearby", { currentStation: "Shibuya" });

    // Test 4: Regex Fallback Check (Simple route)
    await testQuery("Route to Shinjuku");
}

runTests().catch(console.error);
