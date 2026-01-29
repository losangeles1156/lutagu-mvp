
const BASE_URL = 'http://localhost:3000/api/nodes/viewport';

async function verifyRules(zoom) {
    console.log(`\n--- Verifying Rules at Zoom: ${zoom} ---`);
    const params = new URLSearchParams({
        swLat: '35.70',
        swLon: '139.75',
        neLat: '35.72',
        neLon: '139.78',
        zoom: zoom.toString()
    });

    try {
        const res = await fetch(`${BASE_URL}?${params.toString()}`);
        if (!res.ok) return console.error('API Offline');

        const data = await res.json();
        const nodes = data.nodes;

        // Rule 1: Geo-name Only for Hubs (T1/T2)
        const hubs = nodes.filter(n => n.display_tier <= 2);
        console.log(`\n[Rule 1: Geo-name Only]`);
        hubs.slice(0, 5).forEach(h => {
            const name = h.name['zh-TW'];
            const jaName = h.name.ja;
            const isClean = !name.includes('站') && !jaName.includes('駅');
            console.log(` - ${name} (${jaName}): ${isClean ? '✅ Clean' : '❌ Contains suffix'}`);
        });

        // Rule 2: Parent Priority (No child nodes at low zoom)
        if (zoom < 16) {
            console.log(`\n[Rule 2: Parent Priority]`);
            const children = nodes.filter(n => n.parent_hub_id !== null);
            console.log(` - Children found at Zoom ${zoom}: ${children.length} (Expected: 0)`);
            if (children.length === 0) console.log(' ✅ Pass');
            else children.slice(0, 3).forEach(c => console.log(`   - ❌ Leak: ${c.id}`));
        }

    } catch (err) {
        console.error('Fetch Error:', err.message);
    }
}

async function verifyResilience() {
    console.log(`\n--- Verification: Web Resilience (Silent Prefetch) ---`);
    console.log(`1. Checking if critical endpoints are accessible...`);

    const endpoints = [
        '/data/routing_graph.json',
        '/api/nodes/odpt:Station:JR-East.Ueno'
    ];

    for (const url of endpoints) {
        try {
            const res = await fetch(`${BASE_URL}${url}`);
            console.log(` - GET ${url}: ${res.status} ${res.statusText}`);
            if (!res.ok) console.error(`   ❌ Failed to fetch ${url}`);
        } catch (e) {
            console.error(`   ❌ Network error for ${url}: ${e.message}`);
        }
    }
}

async function run() {
    // await verifyRules(12); // Previous test
    await verifyResilience();
}

run();
