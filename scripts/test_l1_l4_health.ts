
// No import needed for native fetch in Node 18+

const BASE_URL = 'http://localhost:3001';
const TEST_STATION_ID = 'odpt:Station:JR-East.Tokyo';

async function testApi(name: string, path: string, method: string = 'GET', body?: any) {
    console.log(`Testing ${name} (${path})...`);
    try {
        const response = await fetch(`${BASE_URL}${path}`, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'http://localhost:3001',
                'Referer': 'http://localhost:3001/'
            },
            body: body ? JSON.stringify(body) : undefined
        });

        if (response.ok) {
            const data = await response.json();
            console.log(`✅ ${name} Success:`, Array.isArray(data) ? `${data.length} items` : 'Object returned');
            return true;
        } else {
            console.log(`❌ ${name} Failed: ${response.status} ${response.statusText}`);
            return false;
        }
    } catch (error: any) {
        console.log(`❌ ${name} Error:`, error.message);
        return false;
    }
}

async function runTests() {
    console.log('=== L1-L4 API Health Check ===');

    // L1: Places
    await testApi('L1 Places', `/api/admin/l1/places?station_id=${TEST_STATION_ID}`);

    // L2: Route (GET)
    await testApi('L2 Route', `/api/odpt/route?from=Tokyo&to=Shinjuku&locale=zh-TW`);

    // L3: Hub Info
    await testApi('L3 Hub Info', `/api/tools/hub-info?query=Tokyo`);

    // L4: Recommendations (POST)
    await testApi('L4 Recommendations', '/api/l4/recommend', 'POST', {
        stationId: TEST_STATION_ID,
        userPreferences: {},
        locale: 'zh-TW'
    });

    // L4: Semantic Search (POST)
    await testApi('L4 Semantic Search', '/api/l4/semantic-search', 'POST', {
        query: 'How to go to Disney?',
        station_id: TEST_STATION_ID
    });
}

runTests();
