/**
 * 東京23區車站 L1~L4 數據完整性審計腳本 - 修正版
 *
 * 此腳本用於審計東京23區各行政區的車站數據完整性
 * 檢查項目：
 * - L1 設施分類數據
 * - L2 即時動態數據
 * - L3 設施數據
 * - Hub/Child 節點關係
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

// 核心車站清單（ODPT 格式）
const CORE_STATIONS = [
    // 新宿區
    'odpt.Station:JR-East.Shinjuku', 'odpt.Station:JR-East.Yamanote.Shinjuku',
    'odpt.Station:TokyoMetro.Marunouchi.Shinjuku', 'odpt.Station:Toei.Shinjuku.Shinjuku',
    'odpt.Station:Odakyu.Shinjuku', 'odpt.Station:Keio.Shinjuku',
    'odpt.Station:Toei.Oedo.Shinjuku',

    // 港區
    'odpt.Station:JR-East.Shinagawa', 'odpt.Station:JR-East.Yamanote.Shinagawa',
    'odpt.Station:Keikyu.Shinagawa', 'odpt.Station:JR-East.Hamamatsucho',
    'odpt.Station:Toei.Mita.Hamamatsucho', 'odpt.Station:Toei.Oedo.Daimon',
    'odpt.Station:JR-East.Daimon', 'odpt.Station:TokyoMetro.Ginza.Shimbashi',
    'odpt.Station:JR-East.Shimbashi',

    // 渋谷區
    'odpt.Station:JR-East.Shibuya', 'odpt.Station:JR-East.Yamanote.Shibuya',
    'odpt.Station:TokyoMetro.Hanzomon.Shibuya', 'odpt.Station:TokyoMetro.Fukutoshin.Shibuya',
    'odpt.Station:Tokyu.Toyoko.Shibuya', 'odpt.Station:Tokyu.Denentoshi.Shibuya',
    'odpt.Station:Keio.Inokashira.Shibuya',

    // 千代田區
    'odpt.Station:JR-East.Tokyo', 'odpt.Station:JR-East.Yamanote.Tokyo',
    'odpt.Station:TokyoMetro.Marunouchi.Tokyo', 'odpt.Station:TokyoMetro.Tozai.Otemachi',
    'odpt.Station:TokyoMetro.Chiyoda.Otemachi', 'odpt.Station:Toei.Mita.Otemachi',
    'odpt.Station:TokyoMetro.Ginza.Kanda', 'odpt.Station:JR-East.Kanda',

    // 中央區
    'odpt.Station:TokyoMetro.Ginza.Ginza', 'odpt.Station:TokyoMetro.Hibiya.Ginza',
    'odpt.Station:TokyoMetro.Yurakucho.Ginza', 'odpt.Station:TokyoMetro.Hibiya.HigashiGinza',
    'odpt.Station:TokyoMetro.Tozai.Nihombashi', 'odpt.Station:TokyoMetro.Ginza.Nihombashi',
    'odpt.Station:Toei.Asakusa.Nihombashi', 'odpt.Station:TokyoMetro.Hibiya.Ningyocho',
    'odpt.Station:Toei.Asakusa.Ningyocho',

    // 文京區
    'odpt.Station:JR-East.Ueno', 'odpt.Station:JR-East.Yamanote.Ueno',
    'odpt.Station:TokyoMetro.Ginza.Ueno', 'odpt.Station:TokyoMetro.Hibiya.Ueno',
    'odpt.Station:Keisei.Ueno', 'odpt.Station:TokyoMetro.Chiyoda.Ochanomizu',
    'odpt.Station:JR-East.Ochanomizu',

    // 台東區
    'odpt.Station:TokyoMetro.Ginza.Asakusa', 'odpt.Station:Toei.Asakusa.Asakusa',
    'odpt.Station:Tobu.Isesaki.Asakusa', 'odpt.Station:TokyoMetro.Hibiya.Akihabara',
    'odpt.Station:JR-East.Akihabara', 'odpt.Station:JR-East.Yamanote.Akihabara',
    'odpt.Station:TsukubaExpress.Akihabara',

    // 墨田區
    'odpt.Station:TokyoMetro.Hanzomon.Oshiage', 'odpt.Station:Toei.Asakusa.Oshiage',
    'odpt.Station:Tobu.Isesaki.Oshiage', 'odpt.Station:Keisei.Oshiage.Oshiage',
    'odpt.Station:JR-East.Kinshicho', 'odpt.Station:TokyoMetro.Hanzomon.Kinshicho',

    // 江東區
    'odpt.Station:TokyoMetro.Tozai.Toyocho', 'odpt.Station:TokyoMetro.Yurakucho.Toyosu',
    'odpt.Station:TokyoMetro.Yurakucho.Shintoshin', 'odpt.Station:Toei.Oedo.Tsukijishijo',
    'odpt.Station:Toei.Oedo.Kachidoki', 'odpt.Station:TokyoMetro.Yurakucho.Tsukishima',
    'odpt.Station:Toei.Oedo.MonzenNakacho',

    // 品川區
    'odpt.Station:JR-East.Osaki', 'odpt.Station:JR-East.Yamanote.Osaki',
    'odpt.Station:Tokyu.Osaki',

    // 目黑區
    'odpt.Station:TokyoMetro.Hibiya.NakaMeguro', 'odpt.Station:Tokyu.Toyoko.NakaMeguro',
    'odpt.Station:TokyoMetro.Namboku.Meguro', 'odpt.Station:Tokyu.Meguro',
    'odpt.Station:JR-East.Meguro', 'odpt.Station:TokyoMetro.Hibiya.Ebisu',
    'odpt.Station:JR-East.Ebisu',

    // 大田区
    'odpt.Station:JR-East.Kamata', 'odpt.Station:Keikyu.Kamata',
    'odpt.Station:Tokyu.Tamagawa', 'odpt.Station:JR-East.Omori',

    // 世田谷區
    'odpt.Station:Tokyu.Sangenjaya', 'odpt.Station:Keio.Inokashira.Shimokitazawa',

    // 杉並區
    'odpt.Station:JR-East.Asagaya', 'odpt.Station:JR-East.Kichijoji',
    'odpt.Station:Seibu.ShinjukuOgawa',

    // 豐島區
    'odpt.Station:JR-East.Ikebukuro', 'odpt.Station:JR-East.Yamanote.Ikebukuro',
    'odpt.Station:TokyoMetro.Yurakucho.Ikebukuro', 'odpt.Station:TokyoMetro.Marunouchi.Ikebukuro',
    'odpt.Station:Tobu.Ikebukuro', 'odpt.Station:Seibu.Ikebukuro',
    'odpt.Station:JR-East.Sugamo',

    // 北區
    'odpt.Station:JR-East.Tabata', 'odpt.Station:JR-East.Yamanote.Tabata',
    'odpt.Station:JR-East.Oji', 'odpt.Station:TokyoMetro.Namboku.Oji',
    'odpt.Station:JR-East.Komagome', 'odpt.Station:TokyoMetro.Namboku.Komagome',

    // 荒川区
    'odpt.Station:JR-East.Nippori', 'odpt.Station:JR-East.Yamanote.Nippori',
    'odpt.Station:TokyoMetro.Chiyoda.Nippori', 'odpt.Station:Keisei.Nippori',
    'odpt.Station:JR-East.NishiNippori', 'odpt.Station:TokyoMetro.Chiyoda.NishiNippori',

    // 板橋區
    'odpt.Station:JR-East.Itabashi', 'odpt.Station:TokyoMetro.Tozai.Itabashi',
    'odpt.Station:JR-East.Otsuka', 'odpt.Station:TokyoMetro.Yurakucho.Otsuka',

    // 練馬區
    'odpt.Station:Seibu.Ikebukuro.Nerima', 'odpt.Station:TokyoMetro.Tozai.Nerima',
    'odpt.Station:Seibu.Shinjuku.Nerima',

    // 足立區
    'odpt.Station:JR-East.Kitasenju', 'odpt.Station:TokyoMetro.Hibiya.Kitasenju',
    'odpt.Station:Tobu.Isesaki.Kitasenju',

    // 葛飾區
    'odpt.Station:JR-East.Katsushika', 'odpt.Station:TokyoMetro.Chiyoda.Katsushika',

    // 江戶川區
    'odpt.Station:JR-East.Koiwa', 'odpt.Station:JR-East.ShinKoiwa'
];

interface StationDataStatus {
    station_id: string;
    has_l1: boolean;
    l1_data?: any;
    has_l2: boolean;
    l2_data?: any;
    l3_count: number;
    is_hub: boolean | null;
    parent_hub_id: string | null;
    location?: any;
    name?: any;
}

interface WardReport {
    ward_name: string;
    total_stations: number;
    stations_with_l1: number;
    stations_with_l2: number;
    total_l3_facilities: number;
    hub_count: number;
    child_count: number;
    coverage_percentage: number;
    stations: StationDataStatus[];
}

async function auditAllData(): Promise<void> {
    console.log('='.repeat(70));
    console.log('🗼 東京23區車站 L1~L4 數據完整性審計報告');
    console.log('='.repeat(70));
    console.log();

    console.log('正在獲取車站節點數據...');

    // Fetch ALL nodes from database
    const { data: nodes, error: nodeError } = await supabase
        .from('nodes')
        .select('id, name, location, is_hub, parent_hub_id, facility_profile, type, city_id, zone')
        .or(`id.in.(${CORE_STATIONS.map(s => s.replace('odpt.Station:', '')).join(',')}),id.in.(${CORE_STATIONS.join(',')})`);

    if (nodeError) {
        console.error('Error fetching nodes:', nodeError.message);
        return;
    }

    console.log(`找到 ${nodes?.length || 0} 個車站節點`);
    console.log();

    // Create station ID mapping (normalize IDs)
    const stationIdMap = new Map<string, any>();
    nodes?.forEach(node => {
        // Try multiple ID formats
        const normalizedId = node.id.replace('odpt:Station:', 'odpt.Station:');
        stationIdMap.set(node.id, node);
        stationIdMap.set(normalizedId, node);

        // Also map without odpt.Station: prefix
        const shortId = node.id.replace('odpt.Station:', '').replace('odpt:Station:', '');
        stationIdMap.set(shortId, node);
    });

    // Fetch L2 data
    console.log('正在獲取 L2 動態數據...');
    const { data: l2Data, error: l2Error } = await supabase
        .from('transit_dynamic_snapshot')
        .select('station_id, status_code, crowd_level, updated_at');

    if (l2Error) {
        console.error('Error fetching L2 data:', l2Error.message);
    }

    const l2Set = new Set(l2Data?.map(d => d.station_id) || []);
    console.log(`找到 ${l2Data?.length || 0} 條 L2 動態記錄`);
    console.log();

    // Fetch L3 data
    console.log('正在獲取 L3 設施數據...');
    const { data: l3Data, error: l3Error } = await supabase
        .from('l3_facilities')
        .select('station_id, id, type, name_i18n');

    if (l3Error) {
        console.error('Error fetching L3 data:', l3Error.message);
    }

    const l3Counts: Record<string, number> = {};
    l3Data?.forEach(d => {
        const normalizedId = d.station_id?.replace('odpt:Station:', 'odpt.Station:') || d.station_id;
        l3Counts[normalizedId] = (l3Counts[normalizedId] || 0) + 1;
        l3Counts[d.station_id] = (l3Counts[d.station_id] || 0) + 1;
    });
    console.log(`找到 ${l3Data?.length || 0} 條 L3 設施記錄`);
    console.log();

    // Process stations
    const stations: StationDataStatus[] = [];
    let hubCount = 0;
    let childCount = 0;
    let l1Count = 0;
    let l2Count = 0;
    let l3Count = 0;

    for (const stationId of CORE_STATIONS) {
        let node = stationIdMap.get(stationId) || stationIdMap.get(stationId.replace('odpt.Station:', ''));

        // Try alternative formats
        if (!node) {
            const altId = stationId.replace('odpt.Station:', 'odpt:Station:');
            node = stationIdMap.get(altId);
        }

        const hasL1 = !!node?.facility_profile;
        const hasL2 = l2Set.has(stationId) || l2Set.has(stationId.replace('odpt.Station:', ''));
        const l3 = l3Counts[stationId] || 0;

        stations.push({
            station_id: stationId,
            has_l1: hasL1,
            l1_data: node?.facility_profile || null,
            has_l2: hasL2,
            l3_count: l3,
            is_hub: node?.is_hub ?? null,
            parent_hub_id: node?.parent_hub_id ?? null,
            location: node?.location,
            name: node?.name
        });

        if (hasL1) l1Count++;
        if (hasL2) l2Count++;
        if (l3 > 0) l3Count++;
        if (node?.is_hub === true) hubCount++;
        if (node?.is_hub === false && node?.parent_hub_id) childCount++;
    }

    // Print summary
    console.log('='.repeat(70));
    console.log('📊 總體統計摘要');
    console.log('='.repeat(70));
    console.log();
    console.log(`監控車站數量: ${CORE_STATIONS.length}`);
    console.log(`數據庫匹配車站: ${nodes?.length || 0}`);
    console.log();
    console.log(`✅ L1 設施數據: ${l1Count} (${Math.round((l1Count/CORE_STATIONS.length)*100)}%)`);
    console.log(`✅ L2 動態數據: ${l2Count} (${Math.round((l2Count/CORE_STATIONS.length)*100)}%)`);
    console.log(`✅ L3 設施數據: ${l3Count > 0 ? '有數據' : '無數據'} (${l3Data?.length || 0} 條記錄)`);
    console.log(`✅ Hub 節點: ${hubCount}`);
    console.log(`✅ Child 節點: ${childCount}`);
    console.log();

    // Sample data inspection
    console.log('='.repeat(70));
    console.log('🔍 樣本數據檢查 (前10個車站)');
    console.log('='.repeat(70));
    console.log();

    stations.slice(0, 10).forEach((s, idx) => {
        console.log(`${idx + 1}. ${s.station_id.split('.').pop()}`);
        console.log(`   L1: ${s.has_l1 ? '✅' : '❌'} | L2: ${s.has_l2 ? '✅' : '❌'} | L3: ${s.l3_count} | Hub: ${s.is_hub ?? '?'}`);
        if (s.l1_data) {
            const l1 = s.l1_data as any;
            const cats = Object.keys(l1.category_counts || {}).filter(k => (l1.category_counts || {})[k] > 0);
            console.log(`   L1 Categories: ${cats.slice(0, 5).join(', ') || 'none'}`);
        }
    });

    console.log();

    // L2 data details
    console.log('='.repeat(70));
    console.log('📡 L2 動態數據詳情');
    console.log('='.repeat(70));
    console.log();

    if (l2Data && l2Data.length > 0) {
        l2Data.forEach((d: any, idx: number) => {
            console.log(`${idx + 1}. ${d.station_id?.split('.').pop() || d.station_id}`);
            console.log(`   Status: ${d.status_code || 'N/A'} | Crowd: ${d.crowd_level || 'N/A'} | Updated: ${d.updated_at || 'N/A'}`);
        });
    } else {
        console.log('沒有找到 L2 動態數據記錄');
    }

    console.log();

    // L1 data structure inspection
    console.log('='.repeat(70));
    console.log('🏷️ L1 設施數據結構檢查');
    console.log('='.repeat(70));
    console.log();

    const sampleL1 = stations.find(s => s.has_l1 && s.l1_data);
    if (sampleL1 && sampleL1.l1_data) {
        console.log('Sample L1 data structure:');
        console.log(JSON.stringify(sampleL1.l1_data, null, 2).slice(0, 1000));
    } else {
        console.log('沒有找到帶有 L1 數據的車站');
    }

    console.log();
    console.log('='.repeat(70));
    console.log('審計完成！');
    console.log('='.repeat(70));
}

auditAllData().catch(console.error);
