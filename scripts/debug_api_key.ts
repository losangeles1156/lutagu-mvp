
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
const envPath = path.resolve(__dirname, '../.env.local');
dotenv.config({ path: envPath });

const apiKey = process.env.MINIMAX_API_KEY || process.env.OPENAI_API_KEY;

if (!apiKey) {
    console.error('❌ No MINIMAX_API_KEY or OPENAI_API_KEY found in environment.');
    process.exit(1);
}

console.log(`🔑 Debugging API Key: ${apiKey.substring(0, 8)}...`);

const targetUrl = 'https://api.minimax.io/v1/embeddings';

const payloads = [
    { name: 'Native Style (texts array)', body: { texts: ["Test Query"], model: "embo-01", type: "db" } },
    { name: 'Native Style (text string)', body: { text: "Test Query", model: "embo-01", type: "db" } },
    { name: 'OpenAI Style (input array)', body: { input: ["Test Query"], model: "embo-01" } },
    { name: 'Legacy Style (query)', body: { query: "Test Query", model: "embo-01" } }
];

async function runDebug() {
    console.log(`🎯 Targeting verified endpoint: ${targetUrl}`);

    for (const p of payloads) {
        console.log(`\n📦 Testing Payload: ${p.name}`);
        console.log(`   Body: ${JSON.stringify(p.body)}`);

        try {
            const res = await fetch(targetUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(p.body)
            });

            const data = await res.json();

            if (res.ok && data.base_resp?.status_code === 0) {
                console.log('✅ SUCCESS!');
                const vec = data?.vectors?.[0] || data?.data?.[0]?.embedding;
                console.log(`   Vector Length: ${vec?.length}`);
                console.log(`   Full Response:`, JSON.stringify(data).substring(0, 200));
                break; // Found it
            } else {
                console.log(`❌ FAILED: ${data.base_resp?.status_code} - ${data.base_resp?.status_msg}`);
                if (!data.base_resp) console.log('   Raw:', JSON.stringify(data));
            }
        } catch (e: any) {
            console.log(`❌ EXCEPTION: ${e.message}`);
        }
    }
}

runDebug();
