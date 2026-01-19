
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

async function main() {
    const { data: stations, error } = await supabase
        .from('nodes')
        .select('id, name')
        .eq('is_active', true);

    if (error) { console.error(error); return; }

    const KEYWORDS = [
        // Chiyoda
        '大手町', '東京', '丸の内', '日比谷', '霞ケ関', '永田町', '桜田門',
        '有楽町', '二重橋', '神田', '秋葉原', '御茶ノ水', '水道橋', '飯田橋', '九段下', '竹橋',
        '神保町', '岩本町', '小川町', '淡路町', '新御茶ノ水', '麹町', '半蔵門',
        // Chuo
        '銀座', '日本橋', '京橋', '築地', '八丁堀', '茅場町', '三越前', '人形町',
        '東銀座', '水天宮前', '小伝馬町', '新富町', '月島', '勝どき', '馬喰町', '浜町',
        // Taito
        '上野', '浅草', '御徒町', '入谷', '三ノ輪', '稲荷町', '田原町', '蔵前', '鶯谷', '上野御徒町', '新御徒町'
    ];

    const targetStations = stations.filter(s => {
        const jaName = s.name?.ja || '';
        return s.id.includes('Toei') && KEYWORDS.some(k => jaName.includes(k));
    });

    console.log(`Found ${targetStations.length} Toei stations in target wards.`);

    const formatted = targetStations.map(s => ({
        id: s.id,
        slug: s.name.en.toLowerCase().replace(/[-\s]+/g, '_').replace(/[()]/g, ''), // Toei often uses underscores? Let's check.
        // Metro URL was jimbocho.html.
        // Let's assume standard slug for now, but Toei might differ.
        // Actually Jimbocho was just 'jimbocho'.
        // Let's print raw EN name to decide.
        raw_en: s.name.en,
        name_ja: s.name.ja,
        operator: "Toei"
    }));

    console.log(JSON.stringify(formatted, null, 2));
}

main();
