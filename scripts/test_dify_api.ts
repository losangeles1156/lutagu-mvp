
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const DIFY_API_KEY = process.env.DIFY_API_KEY;
const DIFY_API_BASE = process.env.DIFY_API_BASE || 'https://api.dify.ai/v1';

async function testDifyConnection() {
    console.log('--- Testing Dify Connectivity ---');
    console.log('DIFY_API_BASE:', DIFY_API_BASE);
    console.log('DIFY_API_KEY configured:', !!DIFY_API_KEY);

    if (!DIFY_API_KEY) {
        console.error('Error: DIFY_API_KEY is not set in .env.local');
        return;
    }

    try {
        console.log('Testing /parameters to check key validity...');
        const paramRes = await fetch(`${DIFY_API_BASE}/parameters`, {
            headers: {
                'Authorization': `Bearer ${DIFY_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (paramRes.ok) {
            const data = await paramRes.json();
            console.log('Success! Dify API key is valid.');
            // console.log('Parameters:', data);
        } else {
            const error = await paramRes.text();
            console.error(`Error: Dify API returned ${paramRes.status}: ${error}`);
            return;
        }

        console.log('\nTesting /chat-messages (blocking mode)...');
        const chatRes = await fetch(`${DIFY_API_BASE}/chat-messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${DIFY_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                inputs: {
                    locale: 'zh-TW',
                    user_profile: 'general'
                },
                query: '你好，請簡單自我介紹',
                response_mode: 'blocking',
                user: 'test-user'
            })
        });

        if (chatRes.ok) {
            const data: any = await chatRes.json();
            console.log('Success! Received response from Agent:');
            console.log('--- Agent Response ---');
            console.log(data.answer);
            console.log('--- End Response ---');
        } else {
            const error = await chatRes.text();
            console.error(`Error: Dify Chat API returned ${chatRes.status}: ${error}`);
        }

    } catch (err) {
        console.error('Fetch error:', err);
    }
}

testDifyConnection();
