
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

console.log(`Loading env from ${envLocalPath}`);
dotenv.config({ path: envLocalPath });
dotenv.config({ path: envPath }); // Fallback

async function runTest(hybridEngine: any, name: string, input: { text: string; locale: 'zh-TW' | 'en' | 'ja' }) {
    console.log(`\n--- Test Case: ${name} ---`);
    console.log(`Input: "${input.text}"`);

    try {
        const result = await hybridEngine.processRequest({
            text: input.text,
            locale: input.locale,
            context: {
                userId: 'test-user',
                // Mock user location: Tokyo Station
                userLocation: { lat: 35.6812, lng: 139.7671 },
                currentStation: 'odpt.Station:JR-East.Yamanote.Tokyo'
            }
        });

        if (result) {
            console.log(`✅ Match Found!`);
            console.log(`Source: ${result.source}`);
            console.log(`Type: ${result.type}`);
            console.log(`Content Preview: ${result.content.slice(0, 100).replace(/\n/g, ' ')}...`);
            if (result.type === 'route') {
                console.log(`Route Data: Found ${(result.data as any)?.routes?.length} routes`);
                if ((result.data as any)?.routes?.[0]?.tpi) {
                    console.log(`TPI Score: ${(result.data as any).routes[0].tpi.score} - level: ${(result.data as any).routes[0].tpi.level}`);
                    console.log(`TPI Recommendation: ${(result.data as any).routes[0].tpi.recommendation}`);
                }
            }
        } else {
            console.log(`⏭️ No Exact Match (Fallback to LLM)`);
        }
    } catch (error) {
        console.error(`❌ Error in request processing:`, error);
    }
}

async function main() {
    console.log('Starting HybridEngine Verification...');

    try {
        // Dynamic import to ensure env vars are loaded before module initialization
        const module = await import('../src/lib/l4/HybridEngine');
        const hybridEngine = module.hybridEngine;

        // L1: Template
        await runTest(hybridEngine, 'L1 Template (Greeting)', { text: '你好', locale: 'zh-TW' });

        // L2: Algorithm (Fare)
        await runTest(hybridEngine, 'L2 Algorithm (Fare)', { text: '票價到新宿', locale: 'zh-TW' });

        // L2: Algorithm (Route)
        await runTest(hybridEngine, 'L2 Algorithm (Route)', { text: '從東京到上野怎麼走', locale: 'zh-TW' });

        // L3: POI Search (should use mock logic or actual DB if connected)
        await runTest(hybridEngine, 'L3 POI Search', { text: '附近的拉麵店', locale: 'zh-TW' });

        // L4: Expert Knowledge
        await runTest(hybridEngine, 'L4 Expert Knowledge', { text: '新宿站有什麼要注意的', locale: 'zh-TW' });

        // Fallback
        await runTest(hybridEngine, 'Fallback to LLM', { text: '講個笑話', locale: 'zh-TW' });

        console.log('\nVerification Complete.');
    } catch (error) {
        console.error('Failed to load HybridEngine or run tests:', error);
    }
    process.exit(0);
}

main().catch(console.error);
