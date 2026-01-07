
import { performance } from 'perf_hooks';

const BASE_URL = 'http://localhost:3000/api/odpt/flight?airport=HND&type=departure';

async function benchmark() {
    console.log('--- Starting Load Test for Flight API ---');
    console.log(`Target: ${BASE_URL}\n`);

    // 1. Warm-up (First call triggers External API)
    const startWarm = performance.now();
    const resWarm = await fetch(BASE_URL);
    const endWarm = performance.now();
    const jsonWarm = await resWarm.json();

    console.log(`[Warm-up] Status: ${resWarm.status} | Time: ${(endWarm - startWarm).toFixed(2)}ms | Cached: ${jsonWarm.cached}`);

    if (jsonWarm.error) {
        console.error('API Error:', jsonWarm.error);
        return;
    }

    // 2. Cache Hit Test (Should be instant)
    const startCache = performance.now();
    const resCache = await fetch(BASE_URL);
    const endCache = performance.now();
    const jsonCache = await resCache.json();

    console.log(`[Cache Hit] Status: ${resCache.status} | Time: ${(endCache - startCache).toFixed(2)}ms | Cached: ${jsonCache.cached}`);

    // 3. Concurrency Test (50 requests)
    console.log('\n--- Running Concurrency Test (50 reqs) ---');
    const requests = [];
    const startConcurrent = performance.now();

    for (let i = 0; i < 50; i++) {
        requests.push(fetch(BASE_URL).then(r => r.json()));
    }

    await Promise.all(requests);
    const endConcurrent = performance.now();
    const totalTime = endConcurrent - startConcurrent;
    const avgTime = totalTime / 50;

    console.log(`Total Time: ${totalTime.toFixed(2)}ms`);
    console.log(`Avg Time per Req: ${avgTime.toFixed(2)}ms`); // Should be very low due to cache and local network

    if (avgTime < 200) {
        console.log('\n✅ PASSED: Avg response time < 200ms');
    } else {
        console.log('\n❌ FAILED: Avg response time > 200ms');
    }
}

benchmark();
