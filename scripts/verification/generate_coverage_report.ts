
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

function getArgValue(name: string): string | null {
    const prefix = `--${name}=`;
    const found = process.argv.find(a => a.startsWith(prefix));
    return found ? found.slice(prefix.length) : null;
}

function hasFlag(name: string): boolean {
    return process.argv.includes(`--${name}`);
}

function parsePositiveInt(value: string | null, fallback: number): number {
    if (!value) return fallback;
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
}

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

const start = parsePositiveInt(getArgValue('start'), 1);
const end = parsePositiveInt(getArgValue('end'), top100Stations.length);
const summaryOnly = hasFlag('summaryOnly') || hasFlag('summary');
const verbose = hasFlag('verbose');
const limitMissing = parsePositiveInt(getArgValue('limitMissing'), 20);

const sliceStart = Math.max(1, start);
const sliceEnd = Math.min(Math.max(sliceStart, end), top100Stations.length);
const stations = top100Stations.slice(sliceStart - 1, sliceEnd);

if (!summaryOnly || verbose) {
    console.log(`=== Tokyo Core 11 Wards Coverage Report ===`);
    console.log(`Range: ${sliceStart}-${sliceEnd} (${stations.length} stations)\n`);
    console.log('| Station | Ward | L1 | L4 | Operators |');
    console.log('|:---|:---|:---:|:---:|:---|');
}

let l1Count = 0;
let l1FullCount = 0;
let l4Count = 0;

const missingL1Full: { name: string; ward: string }[] = [];
const missingL4: { name: string; ward: string }[] = [];
const missingBoth: { name: string; ward: string }[] = [];

stations.forEach((s: any) => {
    const name = s.name || s.names?.ja || 'Unknown';
    const ward = s.ward || 'Unknown';
    const operators = s.operators ? s.operators.join(', ') : (s.operator || 'Unknown');

    // Check L1 coverage
    const nameEn = s.name_en || s.names?.en || '';
    const clusterId = l1NameIndex.get(name) || l1NameIndex.get(nameEn);
    const hasL1Index = !!clusterId;
    const hasL1Full = !!(clusterId && staticL1Ids.has(clusterId));

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

    if (hasL1Index && !hasL1Full) missingL1Full.push({ name, ward });
    if (!hasL4) missingL4.push({ name, ward });
    if ((!hasL1Full && hasL1Index) && !hasL4) missingBoth.push({ name, ward });

    if (!summaryOnly || verbose) {
        const row = [
            name.padEnd(8),
            ward.padEnd(10),
            hasL1Full ? '✅' : (hasL1Index ? '➖' : '❌'),
            hasL4 ? '✅' : '❌',
            operators
        ];
        console.log(`| ${row.join(' | ')} |`);
    }
});

console.log(`\nSummary (Range ${sliceStart}-${sliceEnd}):`);
console.log(`L1 Index Coverage: ${l1Count}/${stations.length}`);
console.log(`L1 Full Coverage:  ${l1FullCount}/${stations.length}`);
console.log(`L4 Content Coverage: ${l4Count}/${stations.length}`);

const formatMissing = (items: { name: string; ward: string }[]) =>
    items
        .slice(0, limitMissing)
        .map(i => `${i.name} (${i.ward})`)
        .join(', ');

if (missingL1Full.length > 0) {
    console.log(`\nMissing L1 Full (showing up to ${limitMissing}): ${formatMissing(missingL1Full)}${missingL1Full.length > limitMissing ? ` ...(+${missingL1Full.length - limitMissing})` : ''}`);
}

if (missingL4.length > 0) {
    console.log(`Missing L4 (showing up to ${limitMissing}): ${formatMissing(missingL4)}${missingL4.length > limitMissing ? ` ...(+${missingL4.length - limitMissing})` : ''}`);
}

if (missingBoth.length > 0) {
    console.log(`Missing Both (showing up to ${limitMissing}): ${formatMissing(missingBoth)}${missingBoth.length > limitMissing ? ` ...(+${missingBoth.length - limitMissing})` : ''}`);
}
