
import fs from 'fs';
import path from 'path';

// Core 11 Wards for MVP
const CORE_WARDS = [
    'Chiyoda', 'Chuo', 'Minato', 'Shinjuku', 'Shibuya', 
    'Toshima', 'Taito', 'Shinagawa', 'Bunkyo', 'Meguro', 'Sumida'
];

const top100Stations = JSON.parse(fs.readFileSync('scripts/data/top_100_stations.json', 'utf8'));
const knowledgeBase = JSON.parse(fs.readFileSync('src/data/knowledge_base.json', 'utf8'));
const staticL1Content = fs.readFileSync('src/data/staticL1Data.ts', 'utf8');

// Get L4 knowledge IDs and names mentioned in content
const knowledgeIds = new Set(knowledgeBase.flatMap((k: any) => k.entityIds || []));
const knowledgeNames = new Set(knowledgeBase.map((k: any) => k.entityName));

// Rough parsing of L1_NAME_INDEX
const nameIndexMatch = staticL1Content.match(/export const L1_NAME_INDEX: Record<string, string> = \{([\s\S]+?)\};/);
const l1NameIndex = new Map<string, string>();
if (nameIndexMatch) {
    const lines = nameIndexMatch[1].split('\n');
    lines.forEach(line => {
        const match = line.match(/"([^"]+)":\s*"([^"]+)"/);
        if (match) l1NameIndex.set(match[1], match[2]);
    });
}

// Improved parsing of STATIC_L1_DATA keys - search the whole file for keys
const staticL1Ids = new Set<string>();
const allStationKeyMatches = staticL1Content.matchAll(/"(odpt\.Station:[^"]+)":\s*\{/g);
for (const match of allStationKeyMatches) {
    staticL1Ids.add(match[1]);
}

console.log(`L1 Name Index Size: ${l1NameIndex.size}`);
console.log(`Static L1 IDs Size: ${staticL1Ids.size}`);

console.log(`=== Tokyo Core 11 Wards Coverage Report ===`);
console.log(`Analyzing top 100 stations from scripts/data/top_100_stations.json\n`);

console.log('| Station | Ward | L1 | L4 | Operators |');
console.log('|:---|:---|:---:|:---:|:---|');

let l1Count = 0;
let l1FullCount = 0;
let l4Count = 0;

top100Stations.forEach((s: any) => {
    const name = s.name || s.names?.ja || 'Unknown';
    const ward = s.ward || 'Unknown';
    const operators = s.operators ? s.operators.join(', ') : (s.operator || 'Unknown');
    
    // Check L1 coverage
    const nameEn = s.name_en || s.names?.en || '';
    const clusterId = l1NameIndex.get(name) || l1NameIndex.get(nameEn);
    const hasL1Index = !!clusterId;
    const hasL1Full = !!(clusterId && staticL1Ids.has(clusterId));
    
    if (name === '上野' || name === '東京' || name === '鶯谷') {
        console.log(`Debug ${name}: clusterId=${clusterId}, hasL1Full=${hasL1Full}, staticL1IdsHas=${staticL1Ids.has(clusterId || '')}`);
    }
    
    // Check L4 coverage (ID or Name)
    const ids = s.ids || (s.id ? [s.id] : []);
    const hasL4Id = ids.some((id: string) => knowledgeIds.has(id));
    
    // Normalize names for comparison (simple check for common variations)
    const nameVariations = [
        name, 
        name + '車站', 
        name + '駅',
        nameEn,
        nameEn + ' Station'
    ];
    
    // Manual mapping for common Trad/Simp differences in report
    if (name === '浅草') nameVariations.push('淺草', '淺草車站');
    if (name === '新宿') nameVariations.push('新宿車站');
    if (name === '渋谷') nameVariations.push('澀谷', '澀谷車站', '涉谷', '涉谷車站');
    if (name === '日本橋') nameVariations.push('日本橋車站');
    if (name === '新橋') nameVariations.push('新橋車站');
    if (name === '浜松町') nameVariations.push('濱松町', '濱松町車站');
    if (name === '恵比寿') nameVariations.push('惠比壽', '惠比壽車站');
    if (name === '目黒') nameVariations.push('目黑', '目黑車站');
    if (name === '五反田') nameVariations.push('五反田車站');
    if (name === '市ケ谷') nameVariations.push('市谷', '市谷車站', '市ヶ谷', '市ヶ谷車站');
    if (name === '霞ケ関') nameVariations.push('霞關', '霞關車站', '霞ヶ関', '霞ヶ関車站');
    if (name === '九段下') nameVariations.push('九段下車站');
    if (name === '三越前') nameVariations.push('三越前車站');
    if (name === '日比谷') nameVariations.push('日比谷車站');
    if (name === '大崎') nameVariations.push('大崎車站');
    if (name === '神田') nameVariations.push('神田車站');
    if (name === '品川') nameVariations.push('品川車站');

    const hasL4Name = nameVariations.some(v => knowledgeNames.has(v));
    const hasL4 = hasL4Id || hasL4Name;
    
    if (hasL1Index) l1Count++;
    if (hasL1Full) l1FullCount++;
    if (hasL4) l4Count++;

    const row = [
        name.padEnd(8),
        ward.padEnd(10),
        hasL1Full ? '✅' : (hasL1Index ? '➖' : '❌'),
        hasL4 ? '✅' : '❌',
        operators
    ];
    console.log(`| ${row.join(' | ')} |`);
});

console.log(`\nSummary:`);
console.log(`L1 Index Coverage: ${l1Count}/100`);
console.log(`L1 Full Coverage:  ${l1FullCount}/100`);
console.log(`L4 Content Coverage: ${l4Count}/100`);
console.log(`\n* Total Unique Stations Analyzed: ${top100Stations.length}`);
console.log(`\n* Legend: ✅ Full Content, ➖ Name Index Only, ❌ No Coverage`);
