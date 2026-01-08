
import { hybridEngine } from '../src/lib/l4/HybridEngine';
import { metricsCollector } from '../src/lib/l4/monitoring/MetricsCollector';

const TEST_CASES = [
    { text: '你好', expectedSource: 'template', locale: 'zh-TW' },
    { text: 'Hello', expectedSource: 'template', locale: 'en' },
    { text: '從新宿到澀谷', expectedSource: 'algorithm', locale: 'zh-TW' },
    { text: 'From Shinjuku to Shibuya', expectedSource: 'algorithm', locale: 'en' },
    { text: '票價到東京', expectedSource: 'algorithm', locale: 'zh-TW' },
    { text: 'How much to Tokyo?', expectedSource: 'algorithm', locale: 'en' },
    { text: '我想知道明天的天氣', expectedSource: 'llm', locale: 'zh-TW' }, // Fallback
];

async function runBenchmark() {
    console.log('🚀 Starting Hybrid Engine Benchmark...');
    const results = [];

    for (const test of TEST_CASES) {
        const start = Date.now();
        const res = await hybridEngine.processRequest({
            text: test.text,
            locale: test.locale as any,
            context: { current_station: 'odpt.Station:JR-East.Yamanote.Shinjuku' }
        });
        const duration = Date.now() - start;
        
        const actualSource = res?.source || 'llm';
        const success = actualSource === test.expectedSource;

        results.push({
            text: test.text,
            expected: test.expectedSource,
            actual: actualSource,
            duration,
            success
        });
    }

    console.table(results);
    const avgDuration = results.reduce((acc, r) => acc + r.duration, 0) / results.length;
    const hitRate = (results.filter(r => r.actual !== 'llm').length / results.length) * 100;
    
    console.log(`\n📊 Summary:`);
    console.log(`- Average Latency: ${avgDuration.toFixed(2)}ms`);
    console.log(`- Non-LLM Hit Rate: ${hitRate.toFixed(1)}%`);
    console.log(`- Test Accuracy: ${(results.filter(r => r.success).length / results.length * 100).toFixed(1)}%`);
}

runBenchmark().catch(console.error);
