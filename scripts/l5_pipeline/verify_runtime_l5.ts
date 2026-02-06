import dotenv from 'dotenv';
import path from 'path';

// Force load envs before any other imports
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

// Define types locally or import them (StrategyContext is an interface, safe to import statically if it has no side effects)
// But HybridEngine has side effects (instantiation), so import dynamically.

import { StrategyContext } from '../../src/lib/ai/strategyEngine';

async function runVerification() {
    console.log('🔍 Starting HybridEngine Verification (Phase 2)...');

    // Dynamic import to ensure env vars are loaded
    const { hybridEngine } = await import('../../src/lib/l4/HybridEngine');

    // Test Case 1: L1 Template Match
    console.log('\n--- Test 1: L1 Template Match ---');
    const t1 = await hybridEngine.processRequest({
        text: '票價',
        locale: 'zh-TW',
        context: { currentStation: 'odpt.Station:TokyoMetro.Ginza.Asakusa' }
    });
    console.log(`Result: [${t1?.source}] ${t1?.content.slice(0, 50)}...`);

    // Test Case 2: POI Tagged Search (L2/L3)
    console.log('\n--- Test 2: POI Tagged Search ---');
    const t2 = await hybridEngine.processRequest({
        text: '我想吃拉麵',
        locale: 'zh-TW',
        context: {
            userLocation: { lat: 35.698383, lng: 139.773072 } // Akihabara
        }
    });
    console.log(`Result: [${t2?.source}] ${t2?.content.slice(0, 50)}...`);

    // Test Case 3: LLM Fallback with Context
    console.log('\n--- Test 3: LLM Fallback (General Query) ---');
    const mockStrategy: StrategyContext = {
        nodeId: 'test_node',
        nodeName: 'Test Station',
        l2Status: { delay: 0 },
        commercialActions: [],
        wisdomSummary: 'This is a test wisdom summary.',
        personaPrompt: 'Be funny.'
    };

    const t3 = await hybridEngine.processRequest({
        text: '給我講個笑話',
        locale: 'zh-TW',
        context: {
            strategyContext: mockStrategy
        }
    });
    console.log(`Result: [${t3?.source}] ${t3?.content.slice(0, 50)}...`);

    // Test Case 4: L5 Safety Trigger (Simulated)
    // Note: Since we don't have a live JMA feed, we can't easily trigger this unless we
    // modify the code to force it or mock the dependency.
    // For now, we verify that the code doesn't crash.
    console.log('\n--- Test 4: L5 Safety Check (Dry Run) ---');
    const t4 = await hybridEngine.processRequest({
        text: '我要去新宿',
        locale: 'zh-TW'
    });
    console.log(`Result: [${t4?.source}] ${t4?.content.slice(0, 50)}...`);
}

runVerification().catch(console.error);
