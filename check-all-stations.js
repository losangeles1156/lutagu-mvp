#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkStations() {
  console.log('檢查資料庫中的站點資料...\n');

  // 1. 檢查總共有多少站點
  const { count, error: countError } = await supabase
    .from('nodes')
    .select('*', { count: 'exact', head: true })
    .eq('node_type', 'station');

  console.log(`資料庫中共有 ${count} 個站點\n`);

  // 2. 檢查 name 欄位的結構
  const { data: sample, error: sampleError } = await supabase
    .from('nodes')
    .select('id, name, is_hub, parent_hub_id')
    .eq('node_type', 'station')
    .limit(5);

  console.log('前 5 個站點的資料結構：\n');
  sample?.forEach(node => {
    console.log('ID:', node.id);
    console.log('name 欄位:', JSON.stringify(node.name, null, 2));
    console.log('is_hub:', node.is_hub);
    console.log('parent_hub_id:', node.parent_hub_id);
    console.log('---');
  });

  // 3. 搜尋可能的上野站（使用不同的查詢方式）
  console.log('\n搜尋上野站（多種方式）：\n');

  // 方式 1: 直接查詢 name 欄位包含 "上野"
  const { data: method1 } = await supabase
    .from('nodes')
    .select('id, name, is_hub')
    .eq('node_type', 'station')
    .textSearch('name', '上野');

  console.log(`方式 1 (textSearch): 找到 ${method1?.length || 0} 筆`);

  // 方式 2: 使用 JSON 查詢
  const { data: allStations } = await supabase
    .from('nodes')
    .select('id, name, is_hub, parent_hub_id')
    .eq('node_type', 'station');

  const uenoStations = allStations?.filter(node => {
    const nameStr = JSON.stringify(node.name).toLowerCase();
    return nameStr.includes('上野') || nameStr.includes('ueno');
  });

  console.log(`方式 2 (過濾): 找到 ${uenoStations?.length || 0} 筆`);
  uenoStations?.forEach(node => {
    console.log('  -', JSON.stringify(node.name));
  });

  // 4. 找出最重要的站點（parent_hub_id = null 且在市中心）
  console.log('\n\n最可能的樞紐站（parent_hub_id = null）：\n');
  const { data: hubs } = await supabase
    .from('nodes')
    .select('id, name, is_hub, parent_hub_id, coordinates')
    .eq('node_type', 'station')
    .is('parent_hub_id', null)
    .limit(30);

  hubs?.forEach(node => {
    const names = [];
    if (node.name['zh-TW']) names.push(`zh: ${node.name['zh-TW']}`);
    if (node.name['ja']) names.push(`ja: ${node.name['ja']}`);
    if (node.name['en']) names.push(`en: ${node.name['en']}`);
    console.log(`  ${names.join(' | ')} (is_hub: ${node.is_hub})`);
  });
}

checkStations().catch(console.error);
