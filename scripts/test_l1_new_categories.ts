/**
 * Quick test script to verify the 4 new L1 categories are working
 * Tests: medical, leisure, finance, service
 */

const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

// Test coordinates: Ueno Station
const TEST_LAT = 35.7141;
const TEST_LON = 139.7774;
const RADIUS = 800;

const CATEGORY_QUERIES: Record<string, string> = {
    medical: `
        [out:json][timeout:30];
        (
            node["amenity"~"hospital|clinic|pharmacy|doctors|dentist"](around:${RADIUS},${TEST_LAT},${TEST_LON});
        );
        out count;
    `,
    leisure: `
        [out:json][timeout:30];
        (
            node["leisure"~"sports_centre|stadium|playground|swimming_pool|fitness_centre"](around:${RADIUS},${TEST_LAT},${TEST_LON});
            node["tourism"~"theme_park|zoo|aquarium|attraction"](around:${RADIUS},${TEST_LAT},${TEST_LON});
        );
        out count;
    `,
    finance: `
        [out:json][timeout:30];
        (
            node["amenity"="bank"](around:${RADIUS},${TEST_LAT},${TEST_LON});
        );
        out count;
    `,
    service: `
        [out:json][timeout:30];
        (
            node["amenity"~"post_office|police|townhall|community_centre|fire_station"](around:${RADIUS},${TEST_LAT},${TEST_LON});
        );
        out count;
    `
};

async function testCategory(category: string, query: string) {
    try {
        const res = await fetch(OVERPASS_API, {
            method: 'POST',
            body: query
        });
        const data = await res.json();
        const count = data.elements?.length || 0;
        console.log(`✅ ${category}: ${count} POIs found within ${RADIUS}m of Ueno`);
        return count;
    } catch (e: any) {
        console.error(`❌ ${category}: Failed - ${e.message}`);
        return -1;
    }
}

async function main() {
    console.log('=== L1 New Categories Test ===');
    console.log(`Testing at Ueno Station (${TEST_LAT}, ${TEST_LON})`);
    console.log('');

    for (const [cat, query] of Object.entries(CATEGORY_QUERIES)) {
        await testCategory(cat, query);
        await new Promise(r => setTimeout(r, 1500)); // Polite delay
    }

    console.log('');
    console.log('Test complete!');
}

main();
