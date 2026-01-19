// 檢查 L1 數據覆蓋率腳本
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ 缺少環境變數');
  console.log('請在 Supabase Dashboard 執行以下 SQL 查詢：\n');
  console.log(`
-- 1. 檢查 Zone A L1 數據覆蓋率
SELECT
  COUNT(*) FILTER (WHERE vibe_tags IS NOT NULL) as has_vibe,
  COUNT(*) FILTER (WHERE facility_profile IS NOT NULL) as has_facility,
  COUNT(*) as total,
  ROUND(COUNT(*) FILTER (WHERE vibe_tags IS NOT NULL)::numeric / COUNT(*) * 100) || '%' as vibe_coverage,
  ROUND(COUNT(*) FILTER (WHERE facility_profile IS NOT NULL)::numeric / COUNT(*) * 100) || '%' as facility_coverage
FROM nodes
WHERE city_id = 'tokyo_core';

-- 2. 列出缺少 L1 數據的車站
SELECT id, name->>'zh-TW' as name_zh, vibe_tags, facility_profile
FROM nodes
WHERE city_id = 'tokyo_core'
  AND (vibe_tags IS NULL OR facility_profile IS NULL)
ORDER BY id
LIMIT 20;

-- 3. 抽查已補齊的車站
SELECT id, name->>'zh-TW' as name_zh,
  vibe_tags::text as vibe,
  facility_profile::text as facility
FROM nodes
WHERE id IN (
  'odpt:Station:JR-East.Akihabara',
  'odpt:Station:JR-East.Shinjuku',
  'odpt:Station:JR-East.Shibuya',
  'odpt:Station:JR-East.Ikebukuro'
);
  `);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCoverage() {
  console.log('=== Zone A L1 數據覆蓋率檢查 ===\n');

  // 查詢覆蓋率
  const { data: coverage, error: covError } = await supabase
    .from('nodes')
    .select('vibe_tags, facility_profile')
    .eq('city_id', 'tokyo_core');

  if (covError) {
    console.log('查詢錯誤:', covError);
    return;
  }

  const total = coverage?.length || 0;
  const hasVibe = coverage?.filter(n => n.vibe_tags !== null).length || 0;
  const hasFacility = coverage?.filter(n => n.facility_profile !== null).length || 0;

  console.log(`📊 Zone A 車站總數: ${total}`);
  console.log(`   ✅ 有 vibe_tags: ${hasVibe} (${Math.round(hasVibe/total*100)}%)`);
  console.log(`   ✅ 有 facility_profile: ${hasFacility} (${Math.round(hasFacility/total*100)}%)`);
  console.log(`   ❌ 缺少數據: ${total - Math.min(hasVibe, hasFacility)}\n`);

  // 列出缺少數據的車站
  const { data: missing, error: missError } = await supabase
    .from('nodes')
    .select('id, name')
    .eq('city_id', 'tokyo_core')
    .or('vibe_tags.is_null,facility_profile.is_null');

  if (missing && missing.length > 0) {
    console.log('⚠️  缺少 L1 數據的車站:');
    missing.forEach(n => {
      console.log(`   - ${n.id}: ${n.name?.['zh-TW'] || 'Unknown'}`);
    });
  } else {
    console.log('🎉 所有 Zone A 車站都有完整的 L1 數據！');
  }
}

checkCoverage();
