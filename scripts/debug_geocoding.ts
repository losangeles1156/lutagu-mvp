
// Native fetch in Node 20
async function testGeocoding(name: string) {
    const queries = [
        `${name} Station Tokyo`,
        `${name.replace(/-/g, ' ')} Station Tokyo`,
        `${name} Station`,
        `${name}`
    ];

    for (const q of queries) {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`;
        console.log(`Testing: "${q}"`);
        try {
            const res = await fetch(url, { headers: { 'User-Agent': 'LUTAGU-Debug/1.0' } });
            const data = await res.json();
            if (data && data.length > 0) {
                console.log(`✅ Success: ${data[0].lat}, ${data[0].lon}`);
                return; // Stop after first success
            } else {
                console.log('❌ Failed');
            }
        } catch (e) {
            console.error(e);
        }
        // Nice delay
        await new Promise(r => setTimeout(r, 1000));
    }
}

async function main() {
    // Test known failures
    await testGeocoding('Roppongi-itchome');
    await testGeocoding('Kiyosumi-shirakawa');
    await testGeocoding('Monzen-nakacho');
    await testGeocoding('Wakoshi');
}

main();
