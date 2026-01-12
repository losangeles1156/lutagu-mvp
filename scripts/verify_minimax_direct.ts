
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { generateLLMResponse } from '../src/lib/ai/llmClient';

async function verifyMiniMax() {
    console.log("🔍 Checking MiniMax Connection...");

    // Log masked key to verify it's loaded
    const key = process.env.MINIMAX_API_KEY;
    if (!key) {
        console.error("❌ MINIMAX_API_KEY is missing in process.env");
        return;
    }
    console.log("✅ MINIMAX_API_KEY found (length: " + key.length + ")");

    const startTime = Date.now();
    const response = await generateLLMResponse({
        systemPrompt: "You are a helpful assistant.",
        userPrompt: "Is this the MiniMax model? Answer 'Yes, I am MiniMax' if you are.",
        taskType: 'reasoning',
        temperature: 0.1
    });
    const duration = Date.now() - startTime;

    console.log("\n--------------------------------");
    console.log(`⏱️ Duration: ${duration}ms`);
    console.log(`📝 Response: ${response}`);

    if (response) {
        console.log("✅ API Call Successful");
        // Additional info in case it fell back
        if (typeof response === 'string' && response.includes('MiniMax')) {
            console.log("✅ Confirmed MiniMax Identity");
        }
    } else {
        console.log("❌ API Call Failed (Returned null)");
    }
}

verifyMiniMax();
