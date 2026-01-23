#!/usr/bin/env node
/**
 * 驗證資料庫中樞紐站的 is_hub 欄位設定
 * 這是調查「樞紐站標籤不顯示」問題的關鍵診斷工具
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少 Supabase 環境變數');
  console.error('需要: NEXT_PUBLIC_SUPABASE_URL 和 SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyHubData() {
  console.log('=== 樞紐站資料驗證工具 ===\n');

  // 1. 檢查上野站（用戶明確提到的問題站點）
  console.log('1️⃣ 檢查上野站群組...\n');
  const { data: uenoStations, error: uenoError } = await supabase
    .from('nodes')
    .select('id, name, is_hub, parent_hub_id, node_type')
    .eq('node_type', 'station')
    .ilike('name->>zh-TW', '%上野%')
    .order('name->>zh-TW');

  if (uenoError) {
    console.error('❌ 查詢失敗:', uenoError);
  } else {
    console.log(`找到 ${uenoStations.length} 個上野相關站點：\n`);
    uenoStations.forEach(node => {
      const name = node.name['zh-TW'] || node.name['ja'] || 'Unknown';
      const hubStatus = node.is_hub ? '✅ TRUE' : '❌ FALSE/NULL';
      const parentHub = node.parent_hub_id ? `子節點 (${node.parent_hub_id})` : '⭐ 母節點';
      console.log(`  ${name}`);
      console.log(`    is_hub: ${hubStatus}`);
      console.log(`    parent_hub_id: ${parentHub}`);
      console.log(`    id: ${node.id}\n`);
    });
  }

  // 2. 檢查其他重要樞紐站（東京、品川、澀谷、新宿）
  console.log('\n2️⃣ 檢查其他主要樞紐站...\n');
  const majorHubs = ['東京', '品川', '澀谷', '新宿'];

  for (const hubName of majorHubs) {
    const { data: stations, error } = await supabase
      .from('nodes')
      .select('id, name, is_hub, parent_hub_id')
      .eq('node_type', 'station')
      .ilike('name->>zh-TW', `%${hubName}%`)
      .order('name->>zh-TW')
      .limit(3);

    if (!error && stations.length > 0) {
      stations.forEach(node => {
        const name = node.name['zh-TW'] || node.name['ja'];
        const hubStatus = node.is_hub ? '✅' : '❌';
        console.log(`  ${hubStatus} ${name} (is_hub: ${node.is_hub})`);
      });
    }
  }

  // 3. 統計所有 is_hub = true 的節點
  console.log('\n3️⃣ 統計整體樞紐站資料...\n');
  const { data: allHubs, error: hubError } = await supabase
    .from('nodes')
    .select('id, name, node_type')
    .eq('is_hub', true);

  if (!hubError) {
    console.log(`✓ 資料庫中共有 ${allHubs.length} 個 is_hub = true 的節點`);
    console.log('\n這些節點是：');
    allHubs.forEach(node => {
      const name = node.name['zh-TW'] || node.name['ja'] || 'Unknown';
      console.log(`  - ${name} (${node.node_type})`);
    });
  }

  // 4. 檢查 parent_hub_id = null 的節點（理論上的母節點）
  console.log('\n4️⃣ 檢查理論上的母節點 (parent_hub_id IS NULL)...\n');
  const { data: theoreticalHubs, error: thError } = await supabase
    .from('nodes')
    .select('id, name, is_hub, node_type')
    .eq('node_type', 'station')
    .is('parent_hub_id', null)
    .limit(20);

  if (!thError) {
    console.log(`找到 ${theoreticalHubs.length} 個 parent_hub_id = null 的站點：\n`);
    theoreticalHubs.forEach(node => {
      const name = node.name['zh-TW'] || node.name['ja'];
      const mismatch = !node.is_hub ? '⚠️ 不一致！' : '';
      console.log(`  ${name} - is_hub: ${node.is_hub} ${mismatch}`);
    });
  }

  // 5. 診斷結論
  console.log('\n=== 診斷結論 ===\n');

  const uenoHub = uenoStations?.find(s =>
    s.name['zh-TW'] === '上野' || s.name['ja'] === '上野駅'
  );

  if (!uenoHub) {
    console.error('❌ 嚴重問題：資料庫中找不到「上野」站主節點');
  } else if (!uenoHub.is_hub) {
    console.error('❌ 根本原因確認：上野站的 is_hub = false/null');
    console.log('\n這就是為何前端看不到標籤的原因：');
    console.log('1. API 的 route.ts:571 只為 is_hub=true 的節點生成 hub_details');
    console.log('2. 沒有 hub_details → 前端 hasMembers = false');
    console.log('3. showLabel 條件不滿足 → 標籤不顯示\n');
    console.log('建議修復方案：');
    console.log(`UPDATE nodes SET is_hub = true WHERE id = '${uenoHub.id}';`);
  } else {
    console.log('✓ 上野站的 is_hub 設定正確');
    console.log('問題可能出在其他環節，需要進一步調查');
  }
}

verifyHubData().catch(console.error);
