import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

const TARGET_STATIONS = [
    '三ノ輪', '蔵前', '人形町', '大手町', '九段下', '永田町', '表参道',
    '月島', '勝どき', '赤坂見附', '水天宮前', '茅場町', '八丁堀', '広尾',
    '三越前', '稲荷町', '浅草橋'
];

async function verifyCoverage() {
    console.log(`Verifying identity coverage for ${TARGET_STATIONS.length} stations...`);

    const { data: nodes, error } = await supabase
        .from('nodes')
        .select('id, name, vibe_tags, facility_profile')
        .eq('node_type', 'station');

    if (error) {
        console.error('Fetch error:', error);
        return;
    }

    const results = TARGET_STATIONS.map(nameJa => {
        const matches = nodes.filter(n => n.name && n.name.ja === nameJa);
        const covered = matches.length > 0 && matches.every(n =>
            n.vibe_tags?.length > 0 &&
            n.facility_profile?.transit_tips?.en
        );
        return {
            name: nameJa,
            count: matches.length,
            covered: covered,
            ids: matches.map(n => n.id)
        };
    });

    console.table(results);

    const missing = results.filter(r => !r.covered);
    if (missing.length === 0) {
        console.log('✅ All 17 stations are fully fully covered with vibe_tags and transit_tips.');
    } else {
        console.warn(`⚠️ ${missing.length} stations are missing data:`, missing.map(m => m.name));
    }
}

verifyCoverage();
