
import { generateLLMResponse } from '../src/lib/ai/llmClient';
import { hybridEngine } from '../src/lib/l4/HybridEngine';
import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testModelConnectivity() {
    console.log('--- 🧪 Testing Model Connectivity ---');

    // 1. Test Gemini 3 Flash Preview (via synthesis)
    console.log('\n[1/3] Testing Gemini 3 Flash Preview (Task: synthesis)');
    const gen3 = await generateLLMResponse({
        systemPrompt: "You are a helpful assistant. Reply in Traditional Chinese.",
        userPrompt: "Hello, who are you? Please mention your model name if you know it.",
        taskType: 'synthesis'
    });
    console.log('Response:', gen3);

    // 2. Test Gemini 2.5 Flash Lite (via classification)
    console.log('\n[2/3] Testing Gemini 2.5 Flash Lite (Task: classification)');
    const gen25 = await generateLLMResponse({
        systemPrompt: "You are a text classifier. Reply with one word.",
        userPrompt: "Is this a traffic query: 'How to go to Ueno?'",
        taskType: 'classification'
    });
    console.log('Response:', gen25);

    // 3. Test MiniMax-M2.1 (via reasoning)
    console.log('\n[3/3] Testing MiniMax-M2.1 (Task: reasoning)');
    const minimax = await generateLLMResponse({
        systemPrompt: "You are a reasoning expert. Reply in Traditional Chinese.",
        userPrompt: "分析一下為什麼上野站有這麼多條線路整合？",
        taskType: 'reasoning'
    });
    console.log('Response:', minimax);
}

async function testHybridRules() {
    console.log('\n--- 🧠 Testing Architecture Rules (Persona & Formatting) ---');

    const queries = [
        "上野站怎麼去淺草？",
        "新宿車站人多嗎？",
        "推薦一下澀谷好吃的拉麵"
    ];

    for (const text of queries) {
        console.log(`\nQuery: "${text}"`);
        const response = await hybridEngine.processRequest({
            text,
            locale: 'zh-TW',
            context: {
                currentStation: 'Tokyo',
                userLocation: { lat: 35.6812, lng: 139.7671 }
            }
        });

        if (response) {
            console.log('Source:', response.source);
            console.log('Type:', response.type);
            console.log('Content:', response.content);

            // Validation
            const hasBold = response.content.includes('**');
            const hasHeading = response.content.includes('#');
            const hasList = /^\d\.|\n- /m.test(response.content);
            const sentenceCount = response.content.split(/[。！？\n]/).filter(s => s.trim().length > 0).length;

            console.log('Validation:');
            console.log(`- No Bold: ${!hasBold ? '✅' : '❌'}`);
            console.log(`- No Headings: ${!hasHeading ? '✅' : '❌'}`);
            console.log(`- No Lists: ${!hasList ? '✅' : '❌'}`);
            console.log(`- Concise (${sentenceCount} sentences): ${sentenceCount <= 3 ? '✅' : '⚠️ (Max 3 sentences)'}`);
        } else {
            console.log('❌ No response from engine');
        }
    }
}

async function runAll() {
    try {
        await testModelConnectivity();
        await testHybridRules();
    } catch (e) {
        console.error('Test failed:', e);
    }
}

runAll();
