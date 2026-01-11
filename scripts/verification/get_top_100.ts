import fs from 'fs';
import path from 'path';

const CORE_WARDS = [
    'Chiyoda', 'Chuo', 'Minato', 'Shinjuku', 'Shibuya', 
    'Toshima', 'Taito', 'Shinagawa', 'Bunkyo', 'Meguro', 'Sumida'
];

// Helper to extract ward from address
function getWardFromAddress(address: string): string | null {
    if (!address) return null;
    for (const ward of CORE_WARDS) {
        if (address.includes(ward) || address.includes(ward + '區') || address.includes(ward + '区')) {
            return ward;
        }
    }
    // Handle Japanese names
    const WARD_JA_MAP: Record<string, string> = {
        '千代田': 'Chiyoda',
        '中央': 'Chuo',
        '港': 'Minato',
        '新宿': 'Shinjuku',
        '渋谷': 'Shibuya',
        '豊島': 'Toshima',
        '台東': 'Taito',
        '品川': 'Shinagawa',
        '文京': 'Bunkyo',
        '目黒': 'Meguro',
        '墨田': 'Sumida'
    };
    for (const [ja, en] of Object.entries(WARD_JA_MAP)) {
        if (address.includes(ja)) return en;
    }
    return null;
}

const stationsByWard = JSON.parse(fs.readFileSync('scripts/data/stations_by_ward.json', 'utf8'));
const seedNodesContent = fs.readFileSync('src/lib/nodes/seedNodes.ts', 'utf8');

// Extract all station IDs from seedNodes
const seedNodeIds = new Set<string>();
const idMatches = seedNodesContent.matchAll(/id: 'odpt:Station:([^']+)'/g);
for (const match of idMatches) {
    seedNodeIds.add('odpt:Station:' + match[1]);
}

// Extract hub status
const hubIds = new Set<string>();
const blocks = seedNodesContent.split(/\{[\s\n]+id:/);
blocks.forEach(block => {
    const idMatch = block.match(/'odpt:Station:([^']+)'/);
    if (idMatch && block.includes('is_hub: true')) {
        hubIds.add('odpt:Station:' + idMatch[1]);
    }
});

console.log(`Extracted ${seedNodeIds.size} station IDs from seedNodes.ts (${hubIds.size} hubs)`);

// Normalize Operator Names (same as in coverage report)
const OPERATOR_MAP: Record<string, string> = {
    'JR東日本': 'JR-East',
    '東日本旅客鉄道': 'JR-East',
    '東日本旅客鉄道株式会社': 'JR-East',
    '東日本旅客鉃道': 'JR-East',
    '東京地下鉄': 'TokyoMetro',
    '東京メトロ': 'TokyoMetro',
    '東京メト': 'TokyoMetro',
    '東京都交通局': 'Toei',
    '京王電鉄': 'Keio',
    '東急電鉄': 'Tokyu',
    '東急': 'Tokyu',
    '東京急行電鉄': 'Tokyu',
    '小田急電鉄': 'Odakyu',
    '京浜急行電鉄': 'Keikyu',
    '京浜急行電鉄 (Keikyu Corporation)': 'Keikyu',
    '京成電鉄': 'Keisei',
    '西武鉄道': 'Seibu',
    '東武鉄道': 'Tobu',
    '東京臨海高速鉄道': 'TWR',
    '東海旅客鉄道': 'JR-Central',
    'JR東海': 'JR-Central'
};

function normalizeOperator(op: string): string {
    if (!op) return 'Unknown';
    for (const key in OPERATOR_MAP) {
        if (op.includes(key)) return OPERATOR_MAP[key];
    }
    return op;
}

// Map stations_by_ward to our format and group by name+ward
const groupedStations = new Map<string, any>();

stationsByWard.filter((s: any) => CORE_WARDS.includes(s.ward)).forEach((s: any) => {
    const key = `${s.name}_${s.ward}`;
    const normOp = normalizeOperator(s.operator);
    const id = `odpt:Station:${normOp}.${s.name_en}`;
    const inSeed = seedNodeIds.has(id);
    const isHub = hubIds.has(id);

    if (!groupedStations.has(key)) {
        groupedStations.set(key, {
            name: s.name,
            name_en: s.name_en,
            ward: s.ward,
            operators: [normOp],
            ids: [id],
            inSeed: inSeed,
            isHub: isHub
        });
    } else {
        const existing = groupedStations.get(key);
        if (!existing.operators.includes(normOp)) existing.operators.push(normOp);
        if (!existing.ids.includes(id)) existing.ids.push(id);
        if (inSeed) existing.inSeed = true;
        if (isHub) existing.isHub = true;
    }
});

const coreStations = Array.from(groupedStations.values());
console.log(`Total unique core stations: ${coreStations.length}`);

// Prioritize: In Seed Nodes (integrated) > Hubs > Others
coreStations.sort((a, b) => {
    if (a.inSeed && !b.inSeed) return -1;
    if (!a.inSeed && b.inSeed) return 1;
    if (a.isHub && !b.isHub) return -1;
    if (!a.isHub && b.isHub) return 1;
    return a.name_en.localeCompare(b.name_en);
});

const top100 = coreStations.slice(0, 100);
fs.writeFileSync('scripts/data/top_100_stations.json', JSON.stringify(top100, null, 2));

console.log(`Saved top 100 stations to scripts/data/top_100_stations.json`);

// Print summary
console.log(`\nSummary:`);
console.log(`- In Seed Nodes: ${top100.filter((s: any) => s.inSeed).length}/100`);
console.log(`- Hubs: ${top100.filter((s: any) => s.isHub).length}/100`);
console.log(`- Wards covered: ${new Set(top100.map((s: any) => s.ward)).size}/11`);

console.log(`\nTop 20 Stations:`);
console.log('| Name | Ward | Operators | Seed | Hub |');
console.log('|:---|:---|:---|:---:|:---:|');
top100.slice(0, 20).forEach((s: any) => {
    console.log(`| ${s.name} | ${s.ward} | ${s.operators.join(', ')} | ${s.inSeed ? '✅' : '❌'} | ${s.isHub ? '✅' : '❌'} |`);
});
