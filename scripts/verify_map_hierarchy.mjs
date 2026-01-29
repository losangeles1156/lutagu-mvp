
// Plain JS version to avoid SyntaxError in .mjs
const BASE_URL = 'http://localhost:3000/api/nodes/viewport';
const TIER_1_SAMPLES = ['Tokyo', 'Shinjuku', 'Ueno'];

async function testZoomTier(zoom) {
    console.log(`\n--- Testing Zoom: ${zoom} ---`);
    const params = new URLSearchParams({
        swLat: '35.6',
        swLon: '139.6',
        neLat: '35.8',
        neLon: '139.8',
        zoom: zoom.toString(),
        pageSize: '100'
    });

    try {
        const res = await fetch(`${BASE_URL}?${params.toString()}`);
        if (!res.ok) {
            console.error(`Failed: ${res.status}`);
            return;
        }

        const data = await res.json();
        console.log(`Total nodes in view: ${data.total_in_viewport}`);
        console.log(`Nodes returned: ${data.nodes.length}`);

        const tier1Found = data.nodes.filter((n) => n.display_tier === 1);
        console.log(`Tier 1 nodes found: ${tier1Found.length}`);
        tier1Found.forEach((n) => {
            const name = n.name['zh-TW'] || n.name.ja || n.id;
            console.log(` - ${name} (${n.id})`);
        });

        // Check for specific targets
        TIER_1_SAMPLES.forEach(s => {
            const found = data.nodes.some((n) => n.id.toLowerCase().includes(s.toLowerCase()));
            console.log(`[${s}] Persistent: ${found ? '✅' : '❌'}`);
        });

    } catch (err) {
        console.error('Fetch Error:', err);
    }
}

async function run() {
    // Note: This requires the dev server to be running!
    // Since I'm in an agent environment, I'll try to run the tests.
    // However, if the server isn't running, this will fail.
    await testZoomTier(5);
    await testZoomTier(13);
}

run();
