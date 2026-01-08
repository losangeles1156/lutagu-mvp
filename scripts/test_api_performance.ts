
async function testPerformance() {
    const BASE_URL = 'http://localhost:3000/api/nodes/viewport';
    const params = new URLSearchParams({
        swLat: '35.70',
        swLon: '139.75',
        neLat: '35.72',
        neLon: '139.78',
        zoom: '15'
    });

    console.log('--- API Performance Test (Native Fetch) ---');
    
    try {
        // Request 1: Should be slow (database)
        console.log('\nRequest 1: Initial call (Database)');
        const start1 = Date.now();
        const res1 = await fetch(`${BASE_URL}?${params.toString()}`);
        const data1 = await res1.json();
        const end1 = Date.now();
        console.log(`Time: ${end1 - start1}ms`);
        console.log(`Nodes: ${data1.nodes?.length || 0}`);

        // Request 2: Should be fast (Cache)
        console.log('\nRequest 2: Subsequent call (Cache hit expected)');
        const start2 = Date.now();
        const res2 = await fetch(`${BASE_URL}?${params.toString()}`);
        const data2 = await res2.json();
        const end2 = Date.now();
        console.log(`Time: ${end2 - start2}ms`);
        console.log(`Nodes: ${data2.nodes?.length || 0}`);

        // Request 3: Different params (Cache miss)
        console.log('\nRequest 3: Different parameters (Cache miss expected)');
        const params2 = new URLSearchParams(params);
        params2.set('swLat', '35.71');
        const start3 = Date.now();
        const res3 = await fetch(`${BASE_URL}?${params2.toString()}`);
        const data3 = await res3.json();
        const end3 = Date.now();
        console.log(`Time: ${end3 - start3}ms`);
        console.log(`Nodes: ${data3.nodes?.length || 0}`);

    } catch (error: any) {
        console.error('Test failed:', error.message);
    }
}

testPerformance();
