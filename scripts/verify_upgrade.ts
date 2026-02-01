
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { templateEngine } from '../src/lib/l4/intent/TemplateEngine';
import { PreDecisionEngine, DecisionLevel } from '../src/lib/ai/PreDecisionEngine';
import { RerankService } from '../src/lib/ai/RerankService';

async function verifyAll() {
    console.log('=== Architecture Upgrade Verification ===\n');

    // 1. Test L1 Rust Wasm
    console.log('--- 1. Testing L1 Rust Wasm Template Engine ---');
    console.log('Note: If Wasm is working, it should match instantly. If it falls back to JS, it still works but logs a warning.');

    // Allow Wasm to load (async import in TemplateEngine)
    await new Promise(r => setTimeout(r, 1000));

    const t1 = Date.now();
    const l1Result = templateEngine.match('你好');
    const t2 = Date.now();
    console.log(`Input: "你好"`);
    console.log(`Result: ${l1Result?.content?.substring(0, 20)}...`);
    console.log(`Latency: ${t2 - t1}ms`);

    const l1Action = templateEngine.match('新宿的票價');
    console.log(`Input: "新宿的票價"`);
    console.log(`Result Type: ${l1Action?.type} (Expected: action)`);


    // 2. Test Intent Classification (Gemini Lite)
    console.log('\n--- 2. Testing Intent Classification (Gemini 2.5 Flash Lite) ---');
    const engine = new PreDecisionEngine();
    const t3 = Date.now();
    // Use a query that trips ML ("我要去新宿") to force API call if not cached or Level 2 matched
    // Actually "我要去新宿" matches Level 2 keywords potentially.
    // Let's force a complex query that definitely avoids keywords:
    const complexQuery = "Tell me a cyberpunk story about Tokyo station.";
    const intentResult = await engine.classifyIntent(complexQuery);
    const t4 = Date.now();
    console.log(`Input: "${complexQuery}"`);
    console.log(`Level: ${intentResult.level} (Expected: complex)`);
    console.log(`Model Suggested: ${intentResult.suggestedModel}`);
    console.log(`Latency: ${t4 - t3}ms`);


    // 3. Test Reranking (Voyage Rerank 2.5 Lite)
    console.log('\n--- 3. Testing Rerank Service (Voyage Rerank 2.5 Lite) ---');
    const query = "Where is the toilet?";
    const docs = [
        "The elevator is near the West Exit.",
        "There is a restroom near the North Gate ticket machine.",
        "Shinjuku station has many exits.",
        "The toilet is located on Platform 2."
    ];

    console.log(`Query: "${query}"`);
    console.log(`Docs: ${JSON.stringify(docs)}`);
    const t5 = Date.now();
    const reranked = await RerankService.rerank(query, docs);
    const t6 = Date.now();

    console.log(`Latency: ${t6 - t5}ms`);
    console.log('Top Result:', reranked[0]);
    if (reranked[0].document?.includes('restroom') || reranked[0].document?.includes('toilet')) {
        console.log('✅ Rerank Success: Toilet/Restroom ranked #1');
    } else {
        console.log('❌ Rerank Failed: Top result is not relevant');
    }

    console.log('\n=== Verification Complete ===');
    process.exit(0);
}

verifyAll();
