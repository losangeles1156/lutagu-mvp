
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testDifyConnection() {
    const apiKey = process.env.DIFY_API_KEY;
    const apiUrl = process.env.DIFY_API_URL || 'https://api.dify.ai/v1';

    console.log('--- Dify Connection Diagnostics ---');
    console.log(`API URL: ${apiUrl}`);
    console.log(`API Key Present: ${!!apiKey}`);
    if (apiKey) {
        console.log(`API Key Prefix: ${apiKey.substring(0, 3)}...`);
    }

    if (!apiKey) {
        console.error('❌ ERROR: DIFY_API_KEY is missing in .env.local');
        return;
    }

    try {
        console.log('\nTesting Chat-Messages API...');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const response = await fetch(`${apiUrl}/chat-messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                inputs: { user_context: "Connection Test" },
                query: "Hi, this is a connectivity test.",
                response_mode: "streaming",
                user: "test-user-id",
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        console.log(`HTTP Status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API Error Response:', errorText);

            if (response.status === 401) {
                console.error('👉 Cause: Invalid API Key. Please check DIFY_API_KEY.');
            } else if (response.status === 404) {
                console.error('👉 Cause: Incorrect API URL or Endpoint. Please check DIFY_API_URL.');
            } else {
                console.error('👉 Cause: Check Dify server logs or configuration.');
            }
            return;
        }

        console.log('✅ Connection Successful! Reading stream...');

        // Read a bit of the stream to ensure data is flowing
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (reader) {
            let chunkCount = 0;
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const text = decoder.decode(value);
                console.log(`[Chunk ${chunkCount++}]: ${text.substring(0, 100)}...`); // Print snippet
                if (chunkCount > 3) {
                    console.log('... (Stream Verified) ...');
                    break;
                }
            }
        }

    } catch (error: any) {
        console.error('❌ Network/Client Error:', error.message);
        if (error.name === 'AbortError') {
            console.error('👉 Cause: Request timed out (10s). Check network connection or firewall.');
        }
    }
}

testDifyConnection();
