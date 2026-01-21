const { createClient } = require('@supabase/supabase-js');

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing environment variables. Please check .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyData() {
    console.log('=== 驗證 Rust ETL 寫入的資料 ===\n');

    // 查詢最近 10 分鐘內新增的廁所設施
    const { data: recentToilets, error } = await supabase
        .from('l3_facilities')
        .select('station_id, attributes, created_at')
        .eq('type', 'toilet')
        .gte('updated_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('Error:', error);
        return;
    }

    const stations = new Set(recentToilets.map(r => r.station_id));

    console.log(`📊 最近 10 分鐘內的統計:`);
    console.log(`   總計新增廁所: ${recentToilets.length} 筆`);
    console.log(`   涉及車站數: ${stations.size} 個`);
    console.log(`\n📍 車站清單:`);

    const stationCounts = {};
    recentToilets.forEach(t => {
        stationCounts[t.station_id] = (stationCounts[t.station_id] || 0) + 1;
    });

    Object.entries(stationCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([station, count]) => {
            console.log(`   ${station}: ${count} 個廁所`);
        });

    // 驗證 OSM ID 存在
    const withOsmId = recentToilets.filter(t => t.attributes?.osm_id).length;
    console.log(`\n✅ 資料完整性: ${withOsmId}/${recentToilets.length} (${(withOsmId / recentToilets.length * 100).toFixed(1)}%) 包含 OSM ID`);
}

verifyData().catch(console.error);
