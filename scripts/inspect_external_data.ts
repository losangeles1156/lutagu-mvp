// Native fetch in Node 20

async function checkExternalData() {
    const url = 'https://raw.githubusercontent.com/Jugendhackt/tokyo-metro-data/master/stations.json';
    console.log('Fetching external data...');
    const res = await fetch(url);
    if (!res.ok) {
        console.error('Failed:', res.status);
        return;
    }
    const data = await res.json();
    const keys = Object.keys(data);
    console.log(`Keys: ${keys.join(', ')}`);

    if (data.stations) {
        const stationKeys = Object.keys(data.stations);
        console.log(`Station count: ${stationKeys.length}`);
        console.log('Sample Station:', JSON.stringify(data.stations[stationKeys[0]], null, 2));
    } else {
        console.log('No stations key found');
    }

    // Check for Ginza
    // The keys look like IDs? Or it's a list?
    // If it's an object with keys...
    // Let's see structure.
}

checkExternalData();
