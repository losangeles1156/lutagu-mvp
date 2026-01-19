/**
 * 東京23區車站 L1~L4 數據完整性審計腳本 - 簡化版
 * 只使用確實存在的欄位
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

// Seed nodes 中的所有車站 ID
const SEED_NODE_IDS = [
    'odpt:Station:TokyoMetro.Ueno', 'odpt:Station:JR-East.Ueno', 'odpt:Station:JR-East.Akihabara',
    'odpt:Station:TsukubaExpress.Akihabara', 'odpt:Station:JR-East.Tokyo', 'odpt:Station:TokyoMetro.Ginza',
    'odpt:Station:TokyoMetro.Kyobashi', 'odpt:Station:TokyoMetro.Mitsukoshimae', 'odpt:Station:TokyoMetro.Kayabacho',
    'odpt:Station:JR-East.Hatchobori', 'odpt:Station:JR-East.Kanda', 'odpt:Station:TokyoMetro.Kanda',
    'odpt:Station:Toei.HigashiGinza', 'odpt:Station:TokyoMetro.Nihombashi', 'odpt:Station:Toei.Nihombashi',
    'odpt:Station:Toei.Ningyocho', 'odpt:Station:TokyoMetro.Shinjuku', 'odpt:Station:JR-East.Shinjuku',
    'odpt:Station:TokyoMetro.Shibuya', 'odpt:Station:JR-East.Shibuya', 'odpt:Station:TokyoMetro.Ikebukuro',
    'odpt:Station:JR-East.Ikebukuro', 'odpt:Station:Toei.BakuroYokoyama', 'odpt:Station:Toei.HigashiNihombashi',
    'odpt:Station:TokyoMetro.Asakusa', 'odpt:Station:Toei.Kuramae', 'odpt:Station:JR-East.Okachimachi',
    'odpt:Station:JR-East.Uguisudani', 'odpt:Station:Toei.Asakusabashi', 'odpt:Station:TokyoMetro.Tawaramachi',
    'odpt:Station:TokyoMetro.Iriya', 'odpt:Station:TokyoMetro.Inaricho', 'odpt:Station:TokyoMetro.Minowa',
    'odpt:Station:Toei.ShinOkachimachi', 'odpt:Station:TokyoMetro.Yushima', 'odpt:Station:TokyoMetro.Tsukiji',
    'odpt:Station:TokyoMetro.Ochanomizu', 'odpt:Station:TokyoMetro.Kasumigaseki', 'odpt:Station:TokyoMetro.Iidabashi',
    'odpt:Station:JR-East.Iidabashi', 'odpt:Station:TokyoMetro.Hibiya', 'odpt:Station:TokyoMetro.Otemachi',
    'odpt:Station:TokyoMetro.Shimbashi', 'odpt:Station:TokyoMetro.Roppongi', 'odpt:Station:JR-East.Hamamatsucho',
    'odpt:Station:TokyoMetro.Omotesando', 'odpt:Station:TokyoMetro.Hiroo', 'odpt:Station:TokyoMetro.Akasakamitsuke',
    'odpt:Station:Toei.Takaracho', 'odpt:Station:Toei.Kachidoki', 'odpt:Station:Toei.Tsukishima',
    'odpt:Station:Toei.Tsukijishijo', 'odpt:Station:Toei.Hamacho', 'odpt:Station:Toei.Jimbocho',
    'odpt:Station:Toei.Ogawamachi', 'odpt:Station:Toei.Kudanshita', 'odpt:Station:Toei.Iwamotocho',
    'odpt:Station:Toei.Hibiya', 'odpt:Station:Toei.Uchisaiwaicho', 'odpt:Station:Toei.Ichigaya'
];

async function runAudit() {
    console.log('='.repeat(70));
    console.log('🗼 東京23區車站 L1~L4 數據完整性審計報告');
    console.log('='.repeat(70));
    console.log();

    console.log('正在獲取車站節點數據...');

    // Fetch nodes with only essential columns that definitely exist
    const { data: nodes, error: nodeError } = await supabase
        .from('nodes')
        .select('id, name, coordinates, is_hub, parent_hub_id, facility_profile')
        .in('id', SEED_NODE_IDS);

    if (nodeError) {
        console.error('Error fetching nodes:', nodeError.message);
        return;
    }

    console.log(`找到 ${nodes?.length || 0} 個車站節點`);
    console.log();

    // Create a map for quick lookup
    const nodeMap = new Map(nodes?.map(n => [n.id, n]) || []);

    // Count stats
    let hubCount = 0;
    let childCount = 0;
    let standaloneCount = 0;
    let hasL1Count = 0;
    let hasFacilityTagsCount = 0;

    // Show nodes
    console.log('='.repeat(70));
    console.log('📍 車站節點詳細列表');
    console.log('='.repeat(70));
    console.log();

    for (const nodeId of SEED_NODE_IDS) {
        const node = nodeMap.get(nodeId);
        const name = node?.name?.['zh-TW'] || node?.name?.['ja'] || nodeId.split('.').pop();

        if (node) {
            // Count stats
            if (node.is_hub === true) hubCount++;
            else if (node.parent_hub_id) childCount++;
            else standaloneCount++;

            // Check L1 data
            const facilityProfile = node.facility_profile as any;
            const hasL1 = !!facilityProfile && Object.keys(facilityProfile).length > 0;
            const hasFacilityTags = Array.isArray(facilityProfile?.facilityTags) && facilityProfile.facilityTags.length > 0;

            if (hasL1) hasL1Count++;
            if (hasFacilityTags) hasFacilityTagsCount++;

            // Display
            const hubStatus = node.is_hub ? '✅ HUB' : (node.parent_hub_id ? `👶 CHILD` : '⚪ STANDALONE');
            const l1Status = hasL1 ? '✅' : '❌';
            const tagsStatus = hasFacilityTags ? `✅ (${facilityProfile.facilityTags.length})` : '❌';

            console.log(`${name} [${nodeId.split('.').pop()}]`);
            console.log(`   ${hubStatus} | L1: ${l1Status} | Tags: ${tagsStatus}`);
            console.log(`   ID: ${nodeId}`);
            if (node.parent_hub_id) {
                console.log(`   Parent: ${node.parent_hub_id.split('.').pop()}`);
            }
            console.log();
        } else {
            console.log(`${name} [MISSING IN DATABASE]`);
            console.log(`   ID: ${nodeId}`);
            console.log();
        }
    }

    // Summary
    console.log('='.repeat(70));
    console.log('📊 統計摘要');
    console.log('='.repeat(70));
    console.log();
    console.log(`總監控車站: ${SEED_NODE_IDS.length}`);
    console.log(`數據庫匹配: ${nodes?.length || 0}`);
    console.log();
    console.log(`✅ Hub 節點: ${hubCount}`);
    console.log(`👶 Child 節點: ${childCount}`);
    console.log(`⚪ Standalone 節點: ${standaloneCount}`);
    console.log();
    console.log(`✅ 有 L1 設施數據: ${hasL1Count}/${SEED_NODE_IDS.length} (${Math.round(hasL1Count/SEED_NODE_IDS.length*100)}%)`);
    console.log(`✅ 有 facilityTags: ${hasFacilityTagsCount}/${SEED_NODE_IDS.length} (${Math.round(hasFacilityTagsCount/SEED_NODE_IDS.length*100)}%)`);
    console.log();

    // Check L2 data
    console.log('='.repeat(70));
    console.log('📡 L2 動態數據檢查');
    console.log('='.repeat(70));
    console.log();

    const { data: l2Data, error: l2Error } = await supabase
        .from('transit_dynamic_snapshot')
        .select('station_id, status_code, crowd_level, updated_at')
        .in('station_id', SEED_NODE_IDS);

    if (l2Error) {
        console.error('Error fetching L2 data:', l2Error.message);
    } else {
        console.log(`L2 動態記錄數: ${l2Data?.length || 0}`);
        if (l2Data && l2Data.length > 0) {
            console.log();
            l2Data.forEach((d: any) => {
                const stationName = d.station_id?.split('.').pop() || d.station_id;
                console.log(`  - ${stationName}: ${d.status_code || 'N/A'} | Crowd: ${d.crowd_level || 'N/A'}`);
            });
        } else {
            console.log('⚠️ 沒有找到 L2 動態數據');
        }
    }
    console.log();

    // Check L3 data
    console.log('='.repeat(70));
    console.log('🏷️ L3 設施數據檢查');
    console.log('='.repeat(70));
    console.log();

    const { data: l3Data, error: l3Error } = await supabase
        .from('l3_facilities')
        .select('station_id, id, type, name_i18n')
        .in('station_id', SEED_NODE_IDS);

    if (l3Error) {
        console.error('Error fetching L3 data:', l3Error.message);
    } else {
        console.log(`L3 設施記錄數: ${l3Data?.length || 0}`);
    }
    console.log();

    // Recommendations
    console.log('='.repeat(70));
    console.log('💡 改進建議');
    console.log('='.repeat(70));
    console.log();

    if (hasL1Count < SEED_NODE_IDS.length) {
        console.log(`🔴 優先處理: 需要為 ${SEED_NODE_IDS.length - hasL1Count} 個車站添加 L1 設施數據`);
    }

    if (l2Data?.length === 0) {
        console.log(`🔴 優先處理: L2 動態數據完全缺失，需要建立數據收集機制`);
    }

    if (hasFacilityTagsCount < hasL1Count) {
        console.log(`🟡 注意: ${hasL1Count - hasFacilityTagsCount} 個車站有 L1 但缺少 facilityTags`);
    }

    console.log();
    console.log('='.repeat(70));
    console.log('審計完成！');
    console.log('='.repeat(70));
}

runAudit().catch(console.error);
