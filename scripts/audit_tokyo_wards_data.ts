/**
 * 東京23區車站 L1~L4 數據完整性審計腳本
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

// 東京23區行政區與車站對照表
const WARDS_STATIONS: Record<string, string[]> = {
    // Zone A: 核心商業區
    '新宿區': [
        'odpt.Station:JR-East.Shinjuku', 'odpt.Station:JR-East.Yamanote.Shinjuku',
        'odpt.Station:TokyoMetro.Marunouchi.Shinjuku', 'odpt.Station:Toei.Shinjuku.Shinjuku',
        'odpt.Station:Odakyu.Shinjuku', 'odpt.Station:Keio.Shinjuku',
        'odpt.Station:Toei.Oedo.Shinjuku', 'odpt.Station:JR-East.Shibuya',
        'odpt.Station:TokyoMetro.Hanzomon.Shibuya', 'odpt.Station:TokyoMetro.Fukutoshin.Shibuya',
        'odpt.Station:Tokyu.Toyoko.Shibuya', 'odpt.Station:Tokyu.Denentoshi.Shibuya',
        'odpt.Station:Keio.Inokashira.Shibuya'
    ],
    '港區': [
        'odpt.Station:JR-East.Shinagawa', 'odpt.Station:JR-East.Yamanote.Shinagawa',
        'odpt.Station:Keikyu.Shinagawa', 'odpt.Station:JR-East.Tamachi',
        'odpt.Station:JR-East.Hamamatsucho', 'odpt.Station:Toei.Mita.Hamamatsucho',
        'odpt.Station:TokyoMetro.Hibiya.Kamiyacho', 'odpt.Station:Toei.Oedo.Daimon',
        'odpt.Station:JR-East.Daimon', 'odpt.Station:TokyoMetro.Ginza.Shimbashi',
        'odpt.Station:JR-East.Shimbashi', 'odpt.Station:Toei.Asakusa.Shinbashi'
    ],
    '渋谷區': [
        'odpt.Station:JR-East.Shibuya', 'odpt.Station:JR-East.Yamanote.Shibuya',
        'odpt.Station:TokyoMetro.Hanzomon.Shibuya', 'odpt.Station:TokyoMetro.Fukutoshin.Shibuya',
        'odpt.Station:Tokyu.Toyoko.Shibuya', 'odpt.Station:Tokyu.Denentoshi.Shibuya',
        'odpt.Station:Keio.Inokashira.Shibuya', 'odpt.Station:TokyoMetro.Ginza.AkasakaMitsuke',
        'odpt.Station:TokyoMetro.Hibiya.NakaMeguro', 'odpt.Station:Tokyu.Toyoko.NakaMeguro'
    ],
    '千代田區': [
        'odpt.Station:JR-East.Tokyo', 'odpt.Station:JR-East.Yamanote.Tokyo',
        'odpt.Station:TokyoMetro.Marunouchi.Tokyo', 'odpt.Station:TokyoMetro.Tozai.Otemachi',
        'odpt.Station:TokyoMetro.Chiyoda.Otemachi', 'odpt.Station:Toei.Mita.Otemachi',
        'odpt.Station:TokyoMetro.Ginza.Kanda', 'odpt.Station:JR-East.Kanda',
        'odpt.Station:TokyoMetro.Hibiya.Kanda', 'odpt.Station:TokyoMetro.Chiyoda.KokkaiGijidomae'
    ],
    '中央區': [
        'odpt.Station:TokyoMetro.Ginza.Ginza', 'odpt.Station:TokyoMetro.Hibiya.Ginza',
        'odpt.Station:TokyoMetro.Yurakucho.Ginza', 'odpt.Station:TokyoMetro.Hibiya.HigashiGinza',
        'odpt.Station:TokyoMetro.Tozai.Nihombashi', 'odpt.Station:TokyoMetro.Ginza.Nihombashi',
        'odpt.Station:Toei.Asakusa.Nihombashi', 'odpt.Station:TokyoMetro.Hibiya.Ningyocho',
        'odpt.Station:Toei.Asakusa.Ningyocho', 'odpt.Station:TokyoMetro.Hibiya.Kodemmacho'
    ],

    // Zone B: 傳統文化區
    '文京區': [
        'odpt.Station:JR-East.Ueno', 'odpt.Station:JR-East.Yamanote.Ueno',
        'odpt.Station:TokyoMetro.Ginza.Ueno', 'odpt.Station:TokyoMetro.Hibiya.Ueno',
        'odpt.Station:Keisei.Ueno', 'odpt.Station:TokyoMetro.Chiyoda.Ochanomizu',
        'odpt.Station:JR-East.Ochanomizu', 'odpt.Station:TokyoMetro.Namboku.Todaimae',
        'odpt.Station:TokyoMetro.Tozai.Kagurazaka', 'odpt.Station:JR-East.Kagurazaka'
    ],
    '台東區': [
        'odpt.Station:JR-East.Ueno', 'odpt.Station:JR-East.Yamanote.Ueno',
        'odpt.Station:TokyoMetro.Ginza.Ueno', 'odpt.Station:TokyoMetro.Hibiya.Ueno',
        'odpt.Station:Keisei.Ueno', 'odpt.Station:TokyoMetro.Ginza.Asakusa',
        'odpt.Station:Toei.Asakusa.Asakusa', 'odpt.Station:Tobu.Isesaki.Asakusa',
        'odpt.Station:TokyoMetro.Hibiya.Akihabara', 'odpt.Station:JR-East.Akihabara',
        'odpt.Station:JR-East.Yamanote.Akihabara', 'odpt.Station:TsukubaExpress.Akihabara'
    ],
    '墨田區': [
        'odpt.Station:TokyoMetro.Hanzomon.Oshiage', 'odpt.Station:Toei.Asakusa.Oshiage',
        'odpt.Station:Tobu.Isesaki.Oshiage', 'odpt.Station:Keisei.Oshiage.Oshiage',
        'odpt.Station:JR-East.Kinshicho', 'odpt.Station:TokyoMetro.Hanzomon.Kinshicho',
        'odpt.Station:Toei.Shinjuku.Sumiyoshi'
    ],
    '江東區': [
        'odpt.Station:TokyoMetro.Tozai.Toyocho', 'odpt.Station:TokyoMetro.Hibiya.MinamiSenju',
        'odpt.Station:JR-East.MinamiSenju', 'odpt.Station:TokyoMetro.Yurakucho.Toyosu',
        'odpt.Station:TokyoMetro.Yurakucho.Shintoshin', 'odpt.Station:JR-East.Kanda',
        'odpt.Station:Toei.Oedo.Tsukijishijo', 'odpt.Station:Toei.Oedo.Kachidoki',
        'odpt.Station:TokyoMetro.Yurakucho.Tsukishima', 'odpt.Station:Toei.Oedo.MonzenNakacho'
    ],

    // Zone C: 西南區
    '品川區': [
        'odpt.Station:JR-East.Shinagawa', 'odpt.Station:JR-East.Yamanote.Shinagawa',
        'odpt.Station:Keikyu.Shinagawa', 'odpt.Station:JR-East.Osaki',
        'odpt.Station:JR-East.Yamanote.Osaki', 'odpt.Station:Tokyu.Osaki',
        'odpt.Station:JR-East.Magome', 'odpt.Station:Toei.Asakusa.Nihombashi'
    ],
    '目黑區': [
        'odpt.Station:TokyoMetro.Hibiya.NakaMeguro', 'odpt.Station:Tokyu.Toyoko.NakaMeguro',
        'odpt.Station:TokyoMetro.Namboku.Meguro', 'odpt.Station:Tokyu.Meguro',
        'odpt.Station:JR-East.Meguro', 'odpt.Station:TokyoMetro.Hibiya.Ebisu',
        'odpt.Station:JR-East.Ebisu', 'odpt.Station:TokyoMetro.Hibiya.NakaMeguro'
    ],
    '大田区': [
        'odpt.Station:JR-East.Kamata', 'odpt.Station:Keikyu.Kamata',
        'odpt.Station:TokyoMetro.Meguro.OtaWard', 'odpt.Station:Tokyu.Tamagawa',
        'odpt.Station:JR-East.Omori', 'odpt.Station:Keikyu.Omori',
        'odpt.Station:TokyoMetro.Tozai.NishiFunabashi'
    ],
    '世田谷區': [
        'odpt.Station:Tokyu.Setagaya', 'odpt.Station:Odakyu.Setagaya',
        'odpt.Station:Tokyu.Toyoko.FutakoTamagawa', 'odpt.Station:Tokyu.Denentoshi.Ikuta',
        'odpt.Station:Odakyu.Chitose', 'odpt.Station:Tokyu.Sangenjaya',
        'odpt.Station:Keio.Inokashira.Shimokitazawa'
    ],
    '杉並區': [
        'odpt.Station:JR-East.Asagaya', 'odpt.Station:JR-East.Kichijoji',
        'odpt.Station:Seibu.Ikebukuro.Asagaya', 'odpt.Station:Seibu.ShinjukuOgawa',
        'odpt.Station:TokyoMetro.Chiyoda.Horikiri', 'odpt.Station:JR-East.Horikiri'
    ],
    '豐島區': [
        'odpt.Station:JR-East.Ikebukuro', 'odpt.Station:JR-East.Yamanote.Ikebukuro',
        'odpt.Station:TokyoMetro.Yurakucho.Ikebukuro', 'odpt.Station:TokyoMetro.Marunouchi.Ikebukuro',
        'odpt.Station:Tobu.Ikebukuro', 'odpt.Station:Seibu.Ikebukuro',
        'odpt.Station:TokyoMetro.Namboku.Ikebukuro', 'odpt.Station:JR-East.Sugamo',
        'odpt.Station:TokyoMetro.Marunouchi.Sugamo'
    ],

    // Zone D: 北區
    '北區': [
        'odpt.Station:JR-East.Tabata', 'odpt.Station:JR-East.Yamanote.Tabata',
        'odpt.Station:TokyoMetro.Namboku.Tabata', 'odpt.Station:JR-East.Akabanebashi',
        'odpt.Station:TokyoMetro.Namboku.Akabanebashi', 'odpt.Station:JR-East.Oji',
        'odpt.Station:TokyoMetro.Namboku.Oji', 'odpt.Station:JR-East.Komagome',
        'odpt.Station:TokyoMetro.Namboku.Komagome'
    ],
    '荒川区': [
        'odpt.Station:JR-East.Nippori', 'odpt.Station:JR-East.Yamanote.Nippori',
        'odpt.Station:TokyoMetro.Chiyoda.Nippori', 'odpt.Station:Keisei.Nippori',
        'odpt.Station:JR-East.NishiNippori', 'odpt.Station:TokyoMetro.Chiyoda.NishiNippori',
        'odpt.Station:Toei.NipporiToneri.Minowabashi', 'odpt.Station:JR-East.Machiya'
    ],
    '板橋區': [
        'odpt.Station:JR-East.Itabashi', 'odpt.Station:TokyoMetro.Tozai.Itabashi',
        'odpt.Station:JR-East.Shimo', 'odpt.Station:TokyoMetro.Marunouchi.Shinotsuka',
        'odpt.Station:JR-East.Otsuka', 'odpt.Station:TokyoMetro.Yurakucho.Otsuka',
        'odpt.Station:Tobu.Ojiya.Otsuka'
    ],

    // Zone E: 西部邊緣區
    '練馬區': [
        'odpt.Station:Seibu.Ikebukuro.Nerima', 'odpt.Station:TokyoMetro.Tozai.Nerima',
        'odpt.Station:Seibu.Shinjuku.Nerima', 'odpt.Station:Odakyu.Nerima',
        'odpt.Station:TokyoMetro.Yurakucho.ChikatetsuNerima', 'odpt.Station:Seibu.ChikatetsuAkebono'
    ],
    '足立區': [
        'odpt.Station:JR-East.Kitasenju', 'odpt.Station:TokyoMetro.Hibiya.Kitasenju',
        'odpt.Station:Tobu.Isesaki.Kitasenju', 'odpt.Station:TokyoMetro.Mayano',
        'odpt.Station:JR-East.MinamiKurume', 'odpt.Station:Toei.NipporiToneri.Arakawa'
    ],

    // Zone F: 東部邊緣區
    '葛飾區': [
        'odpt.Station:JR-East.Katsushika', 'odpt.Station:TokyoMetro.Chiyoda.Katsushika',
        'odpt.Station:Shinkeisei.Kanamicho', 'odpt.Station:JR-East.Aoto',
        'odpt.Station:TokyoMetro.Chiyoda.Aoto'
    ],
    '江戶川區': [
        'odpt.Station:JR-East.Koiwa', 'odpt.Station:SobuEastLine.Koiwa',
        'odpt.Station:JR-East.ShinKoiwa', 'odpt.Station:TokyoMetro.Tozai.Funabashi',
        'odpt.Station:Keiyo.ShinFunabashi'
    ]
};

interface StationDataStatus {
    station_id: string;
    has_l1: boolean;
    has_l2: boolean;
    l3_count: number;
    is_hub: boolean | null;
    parent_hub_id: string | null;
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

async function auditWardData(wardName: string, stationIds: string[]): Promise<WardReport> {
    const stations: StationDataStatus[] = [];
    let totalL3Count = 0;
    let hubCount = 0;
    let childCount = 0;

    // Fetch node data
    const { data: nodes, error: nodeError } = await supabase
        .from('nodes')
        .select('id, is_hub, parent_hub_id, facility_profile')
        .in('id', stationIds);

    if (nodeError) {
        console.error(`Error fetching nodes for ${wardName}:`, nodeError.message);
    }

    // Fetch L2 data
    const { data: l2Data, error: l2Error } = await supabase
        .from('transit_dynamic_snapshot')
        .select('station_id')
        .in('station_id', stationIds);

    if (l2Error) {
        console.error(`Error fetching L2 data for ${wardName}:`, l2Error.message);
    }

    // Fetch L3 data
    const { data: l3Data, error: l3Error } = await supabase
        .from('l3_facilities')
        .select('station_id')
        .in('station_id', stationIds);

    if (l3Error) {
        console.error(`Error fetching L3 data for ${wardName}:`, l3Error.message);
    }

    // Create lookup sets
    const l2Set = new Set(l2Data?.map(d => d.station_id) || []);
    const l3Counts: Record<string, number> = {};
    l3Data?.forEach(d => {
        l3Counts[d.station_id] = (l3Counts[d.station_id] || 0) + 1;
    });

    const nodeMap = new Map(nodes?.map(n => [n.id, n]) || []);

    for (const stationId of stationIds) {
        const node = nodeMap.get(stationId);
        const facilityProfile = node?.facility_profile as any;

        const hasL1 = !!(
            facilityProfile?.category_counts?.convenience_count !== undefined ||
            facilityProfile?.category_counts?.restaurant_count !== undefined ||
            facilityProfile?.category_counts?.cafe_count !== undefined
        );

        stations.push({
            station_id: stationId,
            has_l1: hasL1,
            has_l2: l2Set.has(stationId),
            l3_count: l3Counts[stationId] || 0,
            is_hub: node?.is_hub ?? null,
            parent_hub_id: node?.parent_hub_id ?? null
        });

        if (hasL1) totalL3Count++;
        if (node?.is_hub === true) hubCount++;
        if (node?.is_hub === false && node?.parent_hub_id) childCount++;
    }

    const stationsWithL1 = stations.filter(s => s.has_l1).length;
    const stationsWithL2 = stations.filter(s => s.has_l2).length;

    return {
        ward_name: wardName,
        total_stations: stationIds.length,
        stations_with_l1: stationsWithL1,
        stations_with_l2: stationsWithL2,
        total_l3_facilities: Object.values(l3Counts).reduce((a, b) => a + b, 0),
        hub_count: hubCount,
        child_count: childCount,
        coverage_percentage: Math.round((stationsWithL1 / stationIds.length) * 100),
        stations
    };
}

async function runAudit() {
    console.log('='.repeat(60));
    console.log('🗼 東京23區車站 L1~L4 數據完整性審計報告');
    console.log('='.repeat(60));
    console.log();

    const reports: WardReport[] = [];
    let grandTotalStations = 0;
    let grandTotalL1 = 0;
    let grandTotalL2 = 0;
    let grandTotalL3 = 0;

    for (const [wardName, stationIds] of Object.entries(WARDS_STATIONS)) {
        console.log(`正在審計 ${wardName}...`);
        const report = await auditWardData(wardName, stationIds);
        reports.push(report);

        grandTotalStations += report.total_stations;
        grandTotalL1 += report.stations_with_l1;
        grandTotalL2 += report.stations_with_l2;
        grandTotalL3 += report.total_l3_facilities;

        console.log(`  └─ 車站數: ${report.total_stations}, L1: ${report.stations_with_l1}, L2: ${report.stations_with_l2}, L3: ${report.total_l3_facilities}`);
        console.log(`  └─ Hub: ${report.hub_count}, Child: ${report.child_count}, 覆蓋率: ${report.coverage_percentage}%`);
        console.log();
    }

    // Print summary
    console.log('='.repeat(60));
    console.log('📊 總體統計摘要');
    console.log('='.repeat(60));
    console.log();
    console.log(`總車站數量: ${grandTotalStations}`);
    console.log(`L1 數據覆蓋: ${grandTotalL1} (${Math.round((grandTotalL1/grandTotalStations)*100)}%)`);
    console.log(`L2 數據覆蓋: ${grandTotalL2} (${Math.round((grandTotalL2/grandTotalStations)*100)}%)`);
    console.log(`L3 設施總數: ${grandTotalL3}`);
    console.log();

    // Print by zone
    console.log('='.repeat(60));
    console.log('📍 分區統計');
    console.log('='.repeat(60));
    console.log();

    const zones = {
        'Zone A (核心商業區)': ['新宿區', '港區', '渋谷區', '千代田區', '中央區'],
        'Zone B (傳統文化區)': ['文京區', '台東區', '墨田區', '江東區'],
        'Zone C (西南區)': ['品川區', '目黑區', '大田区', '世田谷區', '杉並區', '豐島區'],
        'Zone D (北區)': ['北區', '荒川区', '板橋區'],
        'Zone E (西部邊緣區)': ['練馬區', '足立區'],
        'Zone F (東部邊緣區)': ['葛飾區', '江戶川區']
    };

    for (const [zoneName, wards] of Object.entries(zones)) {
        const zoneReports = reports.filter(r => wards.includes(r.ward_name));
        const zoneStations = zoneReports.reduce((sum, r) => sum + r.total_stations, 0);
        const zoneL1 = zoneReports.reduce((sum, r) => sum + r.stations_with_l1, 0);
        const zoneL2 = zoneReports.reduce((sum, r) => sum + r.stations_with_l2, 0);
        const zoneL3 = zoneReports.reduce((sum, r) => sum + r.total_l3_facilities, 0);

        console.log(`${zoneName}:`);
        console.log(`  車站數: ${zoneStations}, L1覆蓋: ${Math.round((zoneL1/zoneStations)*100)}%, L2覆蓋: ${Math.round((zoneL2/zoneStations)*100)}%, L3設施: ${zoneL3}`);
        console.log();
    }

    // Identify issues
    console.log('='.repeat(60));
    console.log('⚠️ 需要關注的問題區域');
    console.log('='.repeat(60));
    console.log();

    for (const report of reports) {
        if (report.coverage_percentage < 50) {
            console.log(`🔴 ${report.ward_name}: L1 覆蓋率過低 (${report.coverage_percentage}%)`);
        } else if (report.coverage_percentage < 80) {
            console.log(`🟡 ${report.ward_name}: L1 覆蓋率偏低 (${report.coverage_percentage}%)`);
        }

        if (report.stations_with_l2 === 0) {
            console.log(`🔴 ${report.ward_name}: 完全沒有 L2 動態數據`);
        }
    }

    console.log();
    console.log('='.repeat(60));
    console.log('審計完成！');
    console.log('='.repeat(60));

    return reports;
}

runAudit().catch(console.error);
