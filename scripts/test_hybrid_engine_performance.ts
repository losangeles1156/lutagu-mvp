
import { hybridEngine } from '../src/lib/l4/HybridEngine';
import { metricsCollector } from '../src/lib/l4/monitoring/MetricsCollector';

async function runPerformanceTests() {
    console.log('🚀 Starting Performance Evaluation for Hybrid Engine...\n');

    const concurrentRequests = 50;
    const totalRequests = 200;

    const testCases = [
        { text: '你好', locale: 'zh-TW' },
        { text: '從新宿到澀谷', locale: 'zh-TW' },
        { text: '票價到東京', locale: 'zh-TW', context: { current_station: 'odpt.Station:JR-East.Yamanote.Shinjuku' } },
        { text: '幫我規劃一個東京三日遊', locale: 'zh-TW' } // Fallback case
    ];

    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;
    const startCpu = process.cpuUsage();

    console.log(`Running ${totalRequests} requests with ${concurrentRequests} concurrency...`);

    const results: any[] = [];
    const runBatch = async (batchSize: number) => {
        const batch = Array.from({ length: batchSize }).map(async (_, i) => {
            const testCase = testCases[i % testCases.length];
            const reqStart = Date.now();
            const res = await hybridEngine.processRequest(testCase as any);
            const duration = Date.now() - reqStart;
            return { duration, source: res?.source || 'llm' };
        });
        return Promise.all(batch);
    };

    for (let i = 0; i < totalRequests; i += concurrentRequests) {
        const batchResults = await runBatch(Math.min(concurrentRequests, totalRequests - i));
        results.push(...batchResults);
    }

    const endTime = Date.now();
    const endMemory = process.memoryUsage().heapUsed;
    const endCpu = process.cpuUsage(startCpu);

    const totalDuration = endTime - startTime;
    const avgLatency = results.reduce((acc, r) => acc + r.duration, 0) / results.length;
    const throughput = (totalRequests / (totalDuration / 1000)).toFixed(2);

    const sources = results.reduce((acc: any, r) => {
        acc[r.source] = (acc[r.source] || 0) + 1;
        return acc;
    }, {});

    console.log('\n📊 Performance Results:');
    console.log(`- Total Requests: ${totalRequests}`);
    console.log(`- Total Time: ${totalDuration}ms`);
    console.log(`- Throughput: ${throughput} req/sec`);
    console.log(`- Avg Latency: ${avgLatency.toFixed(2)}ms`);
    console.log(`- Min Latency: ${Math.min(...results.map(r => r.duration))}ms`);
    console.log(`- Max Latency: ${Math.max(...results.map(r => r.duration))}ms`);

    console.log('\n🧠 Resource Usage:');
    console.log(`- Memory Used: ${((endMemory - startMemory) / 1024 / 1024).toFixed(2)} MB`);
    console.log(`- CPU User Time: ${(endCpu.user / 1000).toFixed(2)}ms`);
    console.log(`- CPU System Time: ${(endCpu.system / 1000).toFixed(2)}ms`);

    console.log('\n🔗 Request Distribution:');
    Object.entries(sources).forEach(([source, count]: [string, any]) => {
        const percentage = ((count / totalRequests) * 100).toFixed(1);
        console.log(`- ${source}: ${count} (${percentage}%)`);
    });
}

runPerformanceTests().catch(console.error);
