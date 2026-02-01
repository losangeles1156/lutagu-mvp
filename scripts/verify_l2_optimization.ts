
import { DataMux } from '@/lib/data/DataMux';

// Mock env for test
process.env.OPENAI_API_KEY = 'mock';

async function main() {
    console.log('--- Verifying DataMux Optimization ---');

    // Choose a station that is likely to exist in Seed Data
    const stationId = 'odpt:Station:TokyoMetro.Ginza.Ginza';

    const start = performance.now();
    try {
        const result = await DataMux.enrichStationData(stationId, {
            userId: 'test-user',
            locale: 'zh-TW',
            userProfile: 'tourist'
        });
        const end = performance.now();

        console.log(`[Result] Latency: ${(end - start).toFixed(2)}ms`);
        // Check structure
        const keys = Object.keys(result);
        console.log(`[Result] Keys: ${keys.join(', ')}`);

        if (keys.includes('weather_condition') && keys.includes('l4_cards')) {
            console.log('✅ Structure Valid');
        }

        if ((end - start) < 500) {
            console.log('✅ PASS: Latency under 500ms (Optimistic UI works)');
        } else {
            console.log('⚠️ WARN: Latency high. Check DB connection.');
        }

    } catch (e) {
        console.error('Execution Failed:', e);
    }
}

main();
