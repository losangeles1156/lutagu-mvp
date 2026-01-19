
import { hybridEngine } from '../src/lib/l4/HybridEngine';
import { DataNormalizer } from '../src/lib/l4/utils/Normalization';
import { AnomalyDetector } from '../src/lib/l4/utils/AnomalyDetector';

async function runFunctionalTests() {
    console.log('🧪 Starting Comprehensive Functional Tests for Hybrid Engine...\n');

    const tests = [
        // 1. Template Engine Tests
        {
            name: 'Greeting Template (zh-TW)',
            input: { text: '你好', locale: 'zh-TW' },
            verify: (res: any) => res.source === 'template' && res.type === 'text'
        },
        {
            name: 'Greeting Template (en)',
            input: { text: 'Hello', locale: 'en' },
            verify: (res: any) => res.source === 'template' && res.type === 'text'
        },

        // 2. Algorithm Layer Tests - Route
        {
            name: 'Route Calculation (zh-TW)',
            input: { text: '從新宿到澀谷', locale: 'zh-TW' },
            verify: (res: any) => res.source === 'algorithm' && res.type === 'route' && res.data?.routes?.length > 0
        },
        {
            name: 'Route Calculation (en)',
            input: { text: 'From Shinjuku to Shibuya', locale: 'en' },
            verify: (res: any) => res.source === 'algorithm' && res.type === 'route' && res.data?.routes?.length > 0
        },

        // 3. Algorithm Layer Tests - Fare
        {
            name: 'Fare Calculation (zh-TW)',
            input: {
                text: '票價到東京',
                locale: 'zh-TW',
                context: { current_station: 'odpt.Station:JR-East.Yamanote.Shinjuku' }
            },
            verify: (res: any) => res.source === 'template' && res.type === 'action' && res.data?.action === 'query_fare'
        },

        // 4. Anomaly Detection
        {
            name: 'Anomaly Detection - Gibberish',
            input: { text: 'asdfghjklqwertyuiopzxcvbnm', locale: 'zh-TW' }, // Longer to trigger detector
            verify: (res: any) => res?.source === 'template' && res?.reasoning?.includes('Anomaly')
        },
        {
            name: 'Anomaly Detection - Empty String',
            input: { text: '', locale: 'zh-TW' },
            verify: (res: any) => res.source === 'template' && res.reasoning?.includes('Anomaly')
        },

        // 5. Normalization Tests
        {
            name: 'Normalization - Station Name Variant',
            input: { text: '從新宿站到東京站', locale: 'zh-TW' },
            verify: (res: any) => res.source === 'algorithm' && res.type === 'route'
        },

        // 6. Fallback Tests
        {
            name: 'Fallback to LLM - Complex Query',
            input: { text: '幫我規劃一個東京三日遊，包含甜點店', locale: 'zh-TW' },
            verify: (res: any) => res === null // null means fallback to LLM
        }
    ];

    let passed = 0;
    for (const test of tests) {
        process.stdout.write(`Testing: ${test.name}... `);
        try {
            const res = await hybridEngine.processRequest(test.input as any);
            if (test.verify(res)) {
                console.log('✅ PASSED');
                passed++;
            } else {
                console.log('❌ FAILED');
                console.log('   Input:', test.input);
                console.log('   Output:', JSON.stringify(res, null, 2));
            }
        } catch (err) {
            console.log('💥 ERROR');
            console.error(err);
        }
    }

    console.log(`\n✅ Functional Tests Completed: ${passed}/${tests.length} passed.`);
}

runFunctionalTests().catch(console.error);
