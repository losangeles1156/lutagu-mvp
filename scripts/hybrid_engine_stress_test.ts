
import { hybridEngine } from '../src/lib/l4/HybridEngine';
import { metricsCollector } from '../src/lib/l4/monitoring/MetricsCollector';

interface StressTestResult {
    phase: string;
    concurrency: number;
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    avgLatency: number;
    p50Latency: number;
    p95Latency: number;
    p99Latency: number;
    throughput: number;
    errors: string[];
}

async function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runStressTest(
    phase: string,
    concurrency: number,
    durationMs: number
): Promise<StressTestResult> {
    console.log(`\n🚀 Starting Stress Test Phase: ${phase}`);
    console.log(`   Concurrency: ${concurrency}, Duration: ${durationMs}ms`);
    
    const startTime = Date.now();
    const latencies: number[] = [];
    const errors: string[] = [];
    let completed = 0;
    let active = 0;
    let failed = 0;

    const testQueries = [
        { text: '你好', locale: 'zh-TW' },
        { text: 'Hello', locale: 'en' },
        { text: '從新宿到澀谷', locale: 'zh-TW' },
        { text: 'From Shinjuku to Shibuya', locale: 'en' },
        { text: '票價到東京', locale: 'zh-TW' },
        { text: '從上野到銀座', locale: 'zh-TW' },
        { text: '從東京到品川', locale: 'zh-TW' },
        { text: '從池袋到新宿', locale: 'zh-TW' },
    ];

    const worker = async (): Promise<void> => {
        const endTime = startTime + durationMs;
        while (Date.now() < endTime) {
            const query = testQueries[Math.floor(Math.random() * testQueries.length)];
            
            try {
                const reqStart = Date.now();
                const res = await hybridEngine.processRequest({
                    text: query.text,
                    locale: query.locale as any,
                    context: { current_station: 'odpt.Station:JR-East.Yamanote.Shinjuku' }
                });
                const latency = Date.now() - reqStart;
                
                latencies.push(latency);
                completed++;
            } catch (err: any) {
                failed++;
                errors.push(err.message || String(err));
            }
        }
    };

    // Spawn workers
    const workers: Promise<void>[] = [];
    for (let i = 0; i < concurrency; i++) {
        workers.push(worker());
    }
    await Promise.all(workers);

    const totalTime = Date.now() - startTime;
    latencies.sort((a, b) => a - b);

    const p50 = latencies[Math.floor(latencies.length * 0.50)] || 0;
    const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
    const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const throughput = (completed / totalTime) * 1000;

    const result: StressTestResult = {
        phase,
        concurrency,
        totalRequests: completed + failed,
        successfulRequests: completed,
        failedRequests: failed,
        avgLatency,
        p50Latency: p50,
        p95Latency: p95,
        p99Latency: p99,
        throughput,
        errors
    };

    console.log(`\n📊 ${phase} Results:`);
    console.log(`   Total Requests: ${result.totalRequests}`);
    console.log(`   Successful: ${result.successfulRequests}`);
    console.log(`   Failed: ${result.failedRequests}`);
    console.log(`   Avg Latency: ${result.avgLatency.toFixed(2)}ms`);
    console.log(`   P50 Latency: ${result.p50Latency.toFixed(2)}ms`);
    console.log(`   P95 Latency: ${result.p95Latency.toFixed(2)}ms`);
    console.log(`   P99 Latency: ${result.p99Latency.toFixed(2)}ms`);
    console.log(`   Throughput: ${result.throughput.toFixed(2)} QPS`);

    return result;
}

async function main() {
    console.log('🎯 AI Hybrid Engine Stress Test');
    console.log('================================');

    const results: StressTestResult[] = [];

    // Phase 1: Light Load (10 concurrent, 10 seconds)
    results.push(await runStressTest('Light Load (10 concurrent)', 10, 10000));

    // Phase 2: Normal Load (50 concurrent, 15 seconds)
    results.push(await runStressTest('Normal Load (50 concurrent)', 50, 15000));

    // Phase 3: High Load (100 concurrent, 15 seconds)
    results.push(await runStressTest('High Load (100 concurrent)', 100, 15000));

    // Phase 4: Peak Load (200 concurrent, 10 seconds)
    results.push(await runStressTest('Peak Load (200 concurrent)', 200, 10000));

    // Summary
    console.log('\n\n📈 Overall Stress Test Summary');
    console.log('==============================');
    console.table(results.map(r => ({
        Phase: r.phase,
        'Total': r.totalRequests,
        'Success': r.successfulRequests,
        'Failed': r.failedRequests,
        'Avg(ms)': r.avgLatency.toFixed(2),
        'P95(ms)': r.p95Latency.toFixed(2),
        'QPS': r.throughput.toFixed(2)
    })));

    // Get metrics snapshot
    const metrics = metricsCollector.getSnapshot();
    console.log('\n📊 Final Metrics Snapshot:');
    console.log(`   Total Requests: ${metrics.totalRequests}`);
    console.log(`   Template Hits: ${metrics.templateHits}`);
    console.log(`   Algorithm Hits: ${metrics.algorithmHits}`);
    console.log(`   LLM Requests: ${metrics.llmRequests}`);
    console.log(`   Cache Hit Rate: ${(metrics.cacheHitRate * 100).toFixed(1)}%`);
    console.log(`   Avg Response Time: ${metrics.avgResponseTime.toFixed(2)}ms`);

    // Health assessment
    const lastResult = results[results.length - 1];
    const healthScore = Math.min(100, 
        (lastResult.successfulRequests / lastResult.totalRequests) * 50 +
        Math.max(0, 50 - (lastResult.p95Latency / 10))
    );

    console.log(`\n🏥 System Health Score: ${healthScore.toFixed(1)}/100`);
    if (healthScore >= 80) {
        console.log('   Status: ✅ Excellent - System performs well under stress');
    } else if (healthScore >= 60) {
        console.log('   Status: ⚠️  Good - Minor optimizations recommended');
    } else {
        console.log('   Status: ❌ Needs Improvement - Performance issues detected');
    }
}

main().catch(console.error);
