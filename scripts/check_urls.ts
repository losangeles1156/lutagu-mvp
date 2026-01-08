
const urls = [
    "https://raw.githubusercontent.com/nagix/mini-tokyo-3d/master/data/stations.json",
    "https://raw.githubusercontent.com/jugendhackt/tokyo-metro-data/master/data/stations.json",
    "https://raw.githubusercontent.com/train-operation-status/train-operation-status/master/data/stations.json",
    "https://raw.githubusercontent.com/ubilabs/kd-tree-javascript/master/examples/map/stations.json"
];

async function check() {
    for (const u of urls) {
        try {
            const res = await fetch(u);
            if (res.ok) {
                console.log(`✅ ${u}`);
                const json = await res.json();
                const values = Object.values(json) as any[];
                const subway = values.find(v => v.railway.includes('TokyoMetro'));
                console.log('Subway Sample:', JSON.stringify(subway, null, 2));
                break;
            } else {
                console.log(`❌ ${u} (${res.status})`);
            }
        } catch (e) {
            console.log(`❌ ${u} (Error)`);
        }
    }
}
check();
