
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// We need to import the templateEngine after dotenv loads
import { templateEngine } from '../src/lib/l4/intent/TemplateEngine';

const ITERATIONS = 10_000;

interface BenchmarkResult {
    test: string;
    iterations: number;
    totalMs: number;
    avgMs: number;
    opsPerSecond: number;
    p99Ms: number;
}

const testQueries = [
    // L1 Greetings (high volume)
    '你好',
    'hello',
    'こんにちは',
    '早安',
    // L1 Fare (requires regex capture)
    '新宿的票價',
    '到東京的票價多少錢',
    // L1 Status
    '延誤',
    'delay status',
    // Non-matching (tests fallback speed)
    '這是一個不會匹配的句子',
    'Random sentence that should not match any template'
];

function runBenchmark(): BenchmarkResult[] {
    const results: BenchmarkResult[] = [];

    // Allow Wasm to load (if applicable - but in Node it falls back to JS)
    // In browser environment, Wasm would be loaded already

    console.log(`=== 🚀 L1 Template Engine Performance Benchmark ===\n`);
    console.log(`Iterations per query: ${ITERATIONS.toLocaleString()}\n`);

    for (const query of testQueries) {
        const latencies: number[] = [];
        const start = process.hrtime.bigint();

        for (let i = 0; i < ITERATIONS; i++) {
            const t1 = process.hrtime.bigint();
            templateEngine.match(query);
            const t2 = process.hrtime.bigint();
            latencies.push(Number(t2 - t1) / 1_000_000); // Convert to ms
        }

        const end = process.hrtime.bigint();
        const totalMs = Number(end - start) / 1_000_000;
        const avgMs = totalMs / ITERATIONS;
        const opsPerSecond = ITERATIONS / (totalMs / 1000);

        // P99 latency
        latencies.sort((a, b) => a - b);
        const p99Index = Math.floor(ITERATIONS * 0.99);
        const p99Ms = latencies[p99Index];

        results.push({
            test: query.length > 20 ? query.substring(0, 20) + '...' : query,
            iterations: ITERATIONS,
            totalMs: Math.round(totalMs),
            avgMs: avgMs,
            opsPerSecond: Math.round(opsPerSecond),
            p99Ms: p99Ms
        });
    }

    return results;
}

function printResults(results: BenchmarkResult[]) {
    console.log('| Query | Avg (ms) | P99 (ms) | Ops/sec |');
    console.log('|-------|----------|----------|---------|');

    for (const r of results) {
        console.log(`| ${r.test.padEnd(25)} | ${r.avgMs.toFixed(4)} | ${r.p99Ms.toFixed(4)} | ${r.opsPerSecond.toLocaleString()} |`);
    }

    // Summary
    const totalOps = results.reduce((acc, r) => acc + r.opsPerSecond, 0);
    const avgOps = totalOps / results.length;
    const avgLatency = results.reduce((acc, r) => acc + r.avgMs, 0) / results.length;

    console.log('\n=== 📊 Summary ===');
    console.log(`Average Latency: ${avgLatency.toFixed(4)} ms`);
    console.log(`Average Throughput: ${avgOps.toLocaleString()} ops/sec`);

    // Verdict
    if (avgLatency < 0.01) { // 10 microseconds
        console.log('\n🏆 Result: BLAZING FAST - Sub-millisecond latency achieved!');
    } else if (avgLatency < 0.1) {
        console.log('\n✅ Result: EXCELLENT - Well under 1ms latency.');
    } else if (avgLatency < 1) {
        console.log('\n⚖️ Result: GOOD - Acceptable for production.');
    } else {
        console.log('\n⚠️ Result: SLOW - Optimization needed.');
    }
}

// Run
const results = runBenchmark();
printResults(results);
process.exit(0);
