
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { performance } from 'perf_hooks';

// Load environment variables
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envLocalPath });
dotenv.config({ path: envPath });

// Import Engines (Dynamic imports to ensure env loaded)
async function getEngines() {
    const { hybridEngine } = await import('../src/lib/l4/HybridEngine');
    const { StrategyEngine } = await import('../src/lib/ai/strategyEngine');
    const { generateLLMResponse } = await import('../src/lib/ai/llmClient');
    return { hybridEngine, StrategyEngine, generateLLMResponse };
}

// Load Golden Dataset
const goldenDatasetPath = path.resolve(process.cwd(), 'src/tests/data/golden_queries.json');
const goldenDataset = JSON.parse(fs.readFileSync(goldenDatasetPath, 'utf-8'));

interface BenchmarkResult {
    id: string;
    text: string;
    category: string;
    latencyMs: number;
    accuracy: boolean;
    actualSource: string | null;
    expectedSource: string;
    modelUsed?: string;
}

async function runBenchmark() {
    console.log('🚀 Starting Hybrid Architecture Benchmark...\n');
    console.log(`Loaded ${goldenDataset.length} queries from Golden Dataset.`);

    const { hybridEngine, StrategyEngine, generateLLMResponse } = await getEngines();

    // Mock Context
    const userLocation = { lat: 35.6812, lng: 139.7671 };
    const locale = 'zh-TW';

    // Pre-warm (optional, to load models/connections)
    console.log('Heating up engines...');
    await hybridEngine.processRequest({ text: 'warmup', locale, context: {} });
    console.log('Engines ready.\n');

    const results: BenchmarkResult[] = [];
    const startTime = performance.now();

    for (const query of goldenDataset) {
        process.stdout.write(`Testing: "${query.text}" (${query.category})... `);

        const qStart = performance.now();

        // 1. Strategy Context (Latent Factor)
        // Measure this separately if needed, but here we include it in "End-to-End" if part of the flow
        // In the sandbox route, we call this first.
        let strategyContext = null;
        try {
            strategyContext = await StrategyEngine.getSynthesis(userLocation.lat, userLocation.lng, locale);
        } catch (e) { /* ignore for bench */ }

        // 2. Hybrid Execution
        let hybridMatch = await hybridEngine.processRequest({
            text: query.text,
            locale,
            context: {
                userLocation,
                currentStation: strategyContext?.nodeId
            }
        });

        // 3. Fallback Logic (Sandboxed)
        let modelUsed = hybridMatch?.source;
        if (!hybridMatch) {
            // Simulate MiniMax Fallback
            // We won't actually call the expensive MiniMax API for EVERY bench run to save cost/time unless needed
            // For LATENCY bench, we might want to mock the delay or use a cheaper model?
            // For ACCURACY, we rely on the fact that it fell back to LLM.

            // Check if expected source is 'llm'
            if (query.expected_source === 'llm') {
                // Correctly fell back
                modelUsed = 'llm';
            } else {
                modelUsed = 'llm_fallback_unexpected';
            }
        }

        const qEnd = performance.now();
        const latency = qEnd - qStart;

        const isAccurate = modelUsed === query.expected_source ||
            (query.expected_source === 'llm' && !hybridMatch) ||
            (modelUsed === 'poi_tagged' && query.expected_source === 'poi_tagged'); // loose match

        results.push({
            id: query.id,
            text: query.text,
            category: query.category,
            latencyMs: latency,
            accuracy: isAccurate,
            actualSource: modelUsed || 'null',
            expectedSource: query.expected_source
        });

        console.log(`${isAccurate ? '✅' : '❌'} [${Math.round(latency)}ms] -> ${modelUsed}`);
    }

    const totalTime = performance.now() - startTime;

    // Analysis
    console.log('\n--- Benchmark Report ---');
    console.log(`Total Time: ${(totalTime / 1000).toFixed(2)}s`);

    const avgLatency = results.reduce((acc, r) => acc + r.latencyMs, 0) / results.length;
    const p90Latency = results.sort((a, b) => a.latencyMs - b.latencyMs)[Math.floor(results.length * 0.9)].latencyMs;
    const accuracyRate = (results.filter(r => r.accuracy).length / results.length) * 100;

    console.log(`Average Latency: ${avgLatency.toFixed(2)}ms`);
    console.log(`P90 Latency:     ${p90Latency.toFixed(2)}ms`);
    console.log(`Accuracy Rate:   ${accuracyRate.toFixed(1)}%`);

    console.log('\n--- Detailed Failures ---');
    results.filter(r => !r.accuracy).forEach(r => {
        console.log(`[${r.id}] Exp: ${r.expectedSource}, Act: ${r.actualSource} (${r.text})`);
    });

    // Write report
    const reportPath = path.resolve(process.cwd(), 'benchmark_report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        metrics: { avgLatency, p90Latency, accuracyRate },
        results
    }, null, 2));
    console.log(`\nReport saved to ${reportPath}`);

    process.exit(0);
}

runBenchmark().catch(error => {
    console.error('Benchmark failed:', error);
    process.exit(1);
});
