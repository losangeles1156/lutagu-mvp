import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Service Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Define the core 11 wards
const CORE_WARDS = [
    'Chiyoda', 'Chuo', 'Minato', 'Shinjuku', 'Shibuya',
    'Toshima', 'Taito', 'Shinagawa', 'Bunkyo', 'Meguro', 'Sumida'
];

// Load static data
const staticL1Path = path.resolve(process.cwd(), 'src/data/staticL1Data.ts');

// Load L1 data (rough check)
const staticL1Content = fs.readFileSync(staticL1Path, 'utf8');
// Check for station names in L1_NAME_INDEX
const nameIndexMatch = staticL1Content.match(/export const L1_NAME_INDEX: Record<string, string> = \{([\s\S]+?)\};/);
const l1NameIndex: Record<string, string> = {};
if (nameIndexMatch) {
    try {
        const jsonStr = `{${nameIndexMatch[1]}}`.replace(/(\w+):/g, '"$1":'); // Simple fix for keys
        // Actually, matching line by line is safer for non-json
        const lines = nameIndexMatch[1].split('\n');
        lines.forEach(line => {
            const match = line.match(/"([^"]+)":\s*"([^"]+)"/);
            if (match) l1NameIndex[match[1]] = match[2];
        });
    } catch (e) {
        console.warn('Failed to parse L1_NAME_INDEX, using fallback matching');
    }
}

// Target stations (Heuristic list for validation)
const TOP_STATIONS = [
    // Chiyoda
    { name: '東京', id: 'odpt:Station:JR-East.Tokyo', ward: 'Chiyoda' },
    { name: '秋葉原', id: 'odpt:Station:JR-East.Akihabara', ward: 'Chiyoda' },
    { name: '有樂町', id: 'odpt:Station:JR-East.Yurakucho', ward: 'Chiyoda' },
    { name: '飯田橋', id: 'odpt:Station:JR-East.Iidabashi', ward: 'Chiyoda' },
    { name: '大手町', id: 'odpt:Station:TokyoMetro.Otemachi', ward: 'Chiyoda' },
    { name: '日比谷', id: 'odpt:Station:TokyoMetro.Hibiya', ward: 'Chiyoda' },
    { name: '九段下', id: 'odpt:Station:TokyoMetro.Kudanshita', ward: 'Chiyoda' },
    { name: '神田', id: 'odpt:Station:JR-East.Kanda', ward: 'Chiyoda' },
    { name: '永田町', id: 'odpt:Station:TokyoMetro.Nagatacho', ward: 'Chiyoda' },
    { name: '霞關', id: 'odpt:Station:TokyoMetro.Kasumigaseki', ward: 'Chiyoda' },

    // Shinjuku
    { name: '新宿', id: 'odpt:Station:JR-East.Shinjuku', ward: 'Shinjuku' },
    { name: '高田馬場', id: 'odpt:Station:JR-East.Takadanobaba', ward: 'Shinjuku' },
    { name: '四谷', id: 'odpt:Station:JR-East.Yotsuya', ward: 'Shinjuku' },
    { name: '新宿三丁目', id: 'odpt:Station:TokyoMetro.Shinjuku-sanchome', ward: 'Shinjuku' },
    { name: '新大久保', id: 'odpt:Station:JR-East.Shin-Okubo', ward: 'Shinjuku' },

    // Shibuya
    { name: '渋谷', id: 'odpt:Station:JR-East.Shibuya', ward: 'Shibuya' },
    { name: '惠比壽', id: 'odpt:Station:JR-East.Ebisu', ward: 'Shibuya' },
    { name: '原宿', id: 'odpt:Station:JR-East.Harajuku', ward: 'Shibuya' },
    { name: '代官山', id: 'odpt:Station:Tokyu.Toyoko.Daikanyama', ward: 'Shibuya' },
    { name: '表參道', id: 'odpt:Station:TokyoMetro.Omotesando', ward: 'Shibuya' },

    // Toshima
    { name: '池袋', id: 'odpt:Station:JR-East.Ikebukuro', ward: 'Toshima' },
    { name: '大塚', id: 'odpt:Station:JR-East.Otsuka', ward: 'Toshima' },
    { name: '巢鴨', id: 'odpt:Station:JR-East.Sugamo', ward: 'Toshima' },
    { name: '駒込', id: 'odpt:Station:JR-East.Komagome', ward: 'Toshima' },
    { name: '目白', id: 'odpt:Station:JR-East.Mejiro', ward: 'Toshima' },

    // Taito
    { name: '上野', id: 'odpt:Station:JR-East.Ueno', ward: 'Taito' },
    { name: '淺草', id: 'odpt:Station:TokyoMetro.Asakusa', ward: 'Taito' },
    { name: '御徒町', id: 'odpt:Station:JR-East.Okachimachi', ward: 'Taito' },
    { name: '藏前', id: 'odpt:Station:Toei.Oedo.Kuramae', ward: 'Taito' },
    { name: '鶯谷', id: 'odpt:Station:JR-East.Uguisudani', ward: 'Taito' },

    // Minato
    { name: '新橋', id: 'odpt:Station:JR-East.Shimbashi', ward: 'Minato' },
    { name: '品川', id: 'odpt:Station:JR-East.Shinagawa', ward: 'Minato' },
    { name: '濱松町', id: 'odpt:Station:JR-East.Hamamatsucho', ward: 'Minato' },
    { name: '六本木', id: 'odpt:Station:TokyoMetro.Roppongi', ward: 'Minato' },
    { name: '赤坂', id: 'odpt:Station:TokyoMetro.Akasaka', ward: 'Minato' },
    { name: '麻布十番', id: 'odpt:Station:Toei.Oedo.Azabu-juban', ward: 'Minato' },

    // Shinagawa
    { name: '大崎', id: 'odpt:Station:JR-East.Osaki', ward: 'Shinagawa' },
    { name: '五反田', id: 'odpt:Station:JR-East.Gotanda', ward: 'Shinagawa' },
    { name: '目黑', id: 'odpt:Station:JR-East.Meguro', ward: 'Shinagawa' },
    { name: '大井町', id: 'odpt:Station:JR-East.Oimachi', ward: 'Shinagawa' },

    // Chuo
    { name: '銀座', id: 'odpt:Station:TokyoMetro.Ginza', ward: 'Chuo' },
    { name: '日本橋', id: 'odpt:Station:TokyoMetro.Nihombashi', ward: 'Chuo' },
    { name: '築地', id: 'odpt:Station:TokyoMetro.Hibiya.Tsukiji', ward: 'Chuo' },
    { name: '月島', id: 'odpt:Station:TokyoMetro.Yurakucho.Tsukishima', ward: 'Chuo' },

    // Bunkyo
    { name: '後樂園', id: 'odpt:Station:TokyoMetro.Korakuen', ward: 'Bunkyo' },
    { name: '本鄉三丁目', id: 'odpt:Station:TokyoMetro.Hongo-sanchome', ward: 'Bunkyo' },
    { name: '湯島', id: 'odpt:Station:TokyoMetro.Yushima', ward: 'Bunkyo' },

    // Meguro
    { name: '中目黑', id: 'odpt:Station:Tokyu.Toyoko.Naka-meguro', ward: 'Meguro' },
    { name: '自由之丘', id: 'odpt:Station:Tokyu.Toyoko.Jiyugaoka', ward: 'Meguro' },

    // Sumida
    { name: '錦糸町', id: 'odpt:Station:JR-East.Kinshicho', ward: 'Sumida' },
    { name: '押上', id: 'odpt:Station:TokyoMetro.Hanzomon.Oshiage', ward: 'Sumida' },
    { name: '兩國', id: 'odpt:Station:JR-East.Ryogoku', ward: 'Sumida' }
];

async function main() {
    console.log('=== Tokyo Core Station Coverage Validation ===\n');
    console.log(`Targeting ${TOP_STATIONS.length} major stations across core wards.\n`);

    // Fetch node info for all target stations to check L4 and cross-check L1
    const { data: nodeInfos, error } = await supabase
        .from('nodes')
        .select('id, name, riding_knowledge');

    if (error) {
        console.error('Error fetching node data:', error);
        return;
    }

    const nodeMap = new Map();
    nodeInfos.forEach(node => {
        const ja = (node.name as any)?.ja;
        const en = (node.name as any)?.en;
        const normalizedJa = ja?.replace(/ (Station|站)$/, '');
        const normalizedEn = en?.replace(/ (Station|站)$/, '');

        if (normalizedJa) nodeMap.set(normalizedJa, node);
        if (normalizedEn) nodeMap.set(normalizedEn, node);
    });

    const normalize = (name: string) => {
        return name
            .replace(/黑/g, '黒')
            .replace(/淺/g, '浅')
            .replace(/樂/g, '楽')
            .replace(/澀/g, '渋')
            .replace(/澤/g, '沢')
            .replace(/濱/g, '浜')
            .replace(/區/g, '区')
            .replace(/橋/g, '橋'); // Just in case, but usually same
    };

    const results = TOP_STATIONS.map(station => {
        const normName = normalize(station.name);

        // L1 Check: Name exists in static index
        const hasL1 = !!l1NameIndex[station.name] ||
            !!l1NameIndex[normName] ||
            !!l1NameIndex[station.name.replace('・', ' / ')] ||
            !!l1NameIndex[station.name.replace('ヶ', 'ケ')];

        // L4 Check: Database has riding_knowledge
        const node = nodeMap.get(station.name) ||
            nodeMap.get(normName) ||
            nodeMap.get(station.name.replace(/ /g, ''));

        const hasL4 = node?.riding_knowledge !== null && node?.riding_knowledge !== undefined;

        return {
            ...station,
            hasL1,
            hasL4
        };
    });

    console.log('| Station  | Ward       | L1 | L4 |');
    console.log('|----------|------------|----|----|');
    results.forEach(r => {
        console.log(`| ${r.name.padEnd(8)} | ${r.ward.padEnd(10)} | ${r.hasL1 ? '✅' : '❌'} | ${r.hasL4 ? '✅' : '❌'} |`);
    });

    const l1Count = results.filter(r => r.hasL1).length;
    const l4Count = results.filter(r => r.hasL4).length;

    console.log(`\nSummary:`);
    console.log(`L1 Coverage: ${l1Count}/${results.length} (${Math.round(l1Count / results.length * 100)}%)`);
    console.log(`L4 Coverage: ${l4Count}/${results.length} (${Math.round(l4Count / results.length * 100)}%)`);

    if (l1Count / results.length > 0.8 && l4Count / results.length > 0.8) {
        console.log('\n✅ Coverage targets met (>80%)');
    } else {
        console.log('\n⚠️ Coverage targets not yet fully met.');
    }
}

main();
