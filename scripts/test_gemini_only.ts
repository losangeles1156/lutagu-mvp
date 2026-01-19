
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function fetchWithTimeout(url: string, options: RequestInit, timeout = 5000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
}

async function testGemini() {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        console.error('No GOOGLE_API_KEY');
        return;
    }

    const candidates = [
        'gemini-2.0-flash-exp',
        'gemini-2.0-flash-thinking-exp-1219',
        'gemini-3-pro-preview',
        'gemini-1.5-flash'
    ];

    console.log('Testing Gemini Models...');

    for (const modelName of candidates) {
        console.log(`\nTrying ${modelName}...`);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

        try {
            const res = await fetchWithTimeout(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: "ping" }] }]
                })
            }, 8000);

            if (res.ok) {
                console.log(`✅ SUCCESS: ${modelName}`);
                const data = await res.json();
                console.log('Response:', JSON.stringify(data).substring(0, 100) + '...');
                return; // Stop after first success
            } else {
                console.log(`❌ FAIL: ${modelName} (${res.status})`);
                const txt = await res.text();
                console.log('Error:', txt.substring(0, 200));
            }
        } catch (e) {
            console.log(`❌ ERROR: ${modelName} - ${(e as Error).message}`);
        }
    }
}

testGemini();
