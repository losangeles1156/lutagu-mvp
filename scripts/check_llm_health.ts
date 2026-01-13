
import path from 'path';
import dotenv from 'dotenv';


// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Simple fetch wrapper to test the API directly
async function testLLM(model: string, apiKeyName: string) {
    const apiKey = process.env[apiKeyName];
    if (!apiKey) {
        console.error(`[${model}] Missing API Key: ${apiKeyName}`);
        return;
    }

    const endpoint = 'https://hnd1.aihub.zeabur.ai/v1/chat/completions';
    console.log(`[${model}] Testing connection to ${endpoint}...`);

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000); // 20s test timeout

        const start = Date.now();
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: 'user', content: 'Say "Hello" in one word.' }],
                temperature: 0.1,
                max_tokens: 100
            }),
            signal: controller.signal
        });
        clearTimeout(timeout);
        const duration = Date.now() - start;

        if (!res.ok) {
            const text = await res.text();
            console.error(`[${model}] FAILED: Status ${res.status} in ${duration}ms. Response: ${text}`);
        } else {
            const data: any = await res.json();
            const content = data.choices?.[0]?.message?.content;
            if (!content) {
                console.warn(`[${model}] WARNING: Content is missing! Full response:`, JSON.stringify(data));
            } else {
                console.log(`[${model}] SUCCESS in ${duration}ms. Content: "${content}"`);
            }
        }

    } catch (e: any) {
        if (e.name === 'AbortError') {
            console.error(`[${model}] TIMEOUT after 20s.`);
        } else {
            console.error(`[${model}] ERROR: ${e.message}`);
        }
    }
}

async function main() {
    console.log('--- Diagnosis Start ---');
    // Test Zeabur Key for both models
    await testLLM('gemini-3-flash-preview', 'ZEABUR_API_KEY');
    await testLLM('deepseek-v3.2', 'ZEABUR_API_KEY');
    console.log('--- Diagnosis End ---');
}

main();
