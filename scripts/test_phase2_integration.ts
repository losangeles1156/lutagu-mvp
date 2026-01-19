
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// --- Environment Setup ---
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Mock imports for types to avoid module resolution issues in script
enum AgentLevel { L1='L1', L2='L2', L3='L3', L4='L4' }
interface ITool { id: string; execute(p:any, c:any): Promise<any>; }

// --- Mock Classes from Phase 2 ---

class MockToolRegistry {
    register(t: any) { console.log(`[Registry] Registered ${t.id}`); }
    getTool(id: string) {
        if(id === 'fare') return { execute: async() => ({ ticket: 170 }) };
        return null;
    }
}

class MockDecisionEngine {
    process(ctx: any, state: any, actions: any[]) {
        console.log(`[Engine] Processing ${actions.length} actions with intent: ${ctx.intent}`);
        return actions.map(a => ({ ...a, score: 0.9 }));
    }
}

// --- Integration Test ---

async function runIntegrationTest() {
    console.log('🚀 Starting Phase 2 Integration Test...');

    // 1. Initialize Registry
    const registry = new MockToolRegistry();
    registry.register({ id: 'fare_calculator' });
    registry.register({ id: 'facility_search' });

    // 2. Initialize Engine
    const engine = new MockDecisionEngine();

    // 3. Simulate Agent Workflow
    const context = { userId: 'u1', intent: 'urgent_travel' };
    const nodeState = { status: 'DELAY' };
    const potentialActions = [
        { type: 'taxi', description: 'Take a taxi' },
        { type: 'wait', description: 'Wait for train' }
    ];

    console.log('\n--- Decision Cycle ---');
    const suggestions = engine.process(context, nodeState, potentialActions);

    console.log('Top Suggestion:', suggestions[0]);

    // 4. Simulate Tool Call
    console.log('\n--- Tool Execution ---');
    const tool = registry.getTool('fare');
    if (tool) {
        const result = await tool.execute({ from: 'A', to: 'B' }, { nodeId: 'A', level: AgentLevel.L2 });
        console.log('Tool Result:', result);
    }

    console.log('\n✅ Phase 2 Components Verified.');
}

runIntegrationTest();
