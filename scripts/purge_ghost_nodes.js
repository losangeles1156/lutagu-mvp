const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function purgeGhostNodes() {
  console.log('--- 開始激進清理幽靈數據 ---');

  // 1. 找出所有坐標在東京站 [139.767, 35.681] 但名稱不是「東京」的節點，直接刪除！
  // 這些都是之前 L4 遷移失敗產生的殘留
  const TOKYO_STATION_COORDS = [139.767, 35.681];
  const threshold = 0.001; 

  const { data: ghosts } = await supabase
    .from('nodes')
    .select('id, name, coordinates')
    .not('name->>ja', 'ilike', '%東京%');

  const nodesToDelete = ghosts.filter(n => {
    if (!n.coordinates || !n.coordinates.coordinates) return false;
    const [lon, lat] = n.coordinates.coordinates;
    return Math.abs(lon - TOKYO_STATION_COORDS[0]) < threshold && 
           Math.abs(lat - TOKYO_STATION_COORDS[1]) < threshold;
  });

  if (nodesToDelete.length > 0) {
    console.log(`發現 ${nodesToDelete.length} 個幽靈節點堆疊在東京站，準備刪除...`);
    const deleteIds = nodesToDelete.map(n => n.id);
    const { error } = await supabase.from('nodes').delete().in('id', deleteIds);
    if (error) console.error('刪除失敗:', error);
    else console.log('刪除成功。');
  } else {
    console.log('未發現東京站位置的幽靈節點。');
  }

  // 2. 處理池袋重複問題
  // 檢查是否有同名的池袋節點但 ID 不同
  const { data: ikebukuros } = await supabase
    .from('nodes')
    .select('id, name, ward_id, is_hub')
    .or('name->>ja.eq.池袋,id.ilike.%Ikebukuro%');

  console.log(`\n池袋節點總數: ${ikebukuros?.length || 0}`);
  // 我們只保留 ID 為 'odpt:Station:JR-East.Ikebukuro' 且是 Hub 的那個，其他的如果坐標不對或行政區不對就清理
  
  // 3. 強制刷新所有 Hub 的 ward_id
  console.log('\n強制同步核心 Hub 的行政區歸屬...');
  await supabase.from('nodes').update({ ward_id: 'ward:toshima' }).eq('id', 'odpt:Station:JR-East.Ikebukuro');
  await supabase.from('nodes').update({ ward_id: 'ward:shibuya' }).eq('id', 'odpt:Station:JR-East.Shibuya');
  await supabase.from('nodes').update({ ward_id: 'ward:chiyoda' }).eq('id', 'odpt:Station:JR-East.Tokyo');
  await supabase.from('nodes').update({ ward_id: 'ward:chiyoda' }).eq('id', 'odpt:Station:JR-East.Akihabara');
  await supabase.from('nodes').update({ ward_id: 'ward:taito' }).eq('id', 'odpt:Station:JR-East.Ueno');

  console.log('清理與同步完成。請手動重新整理網頁並使用「無痕模式」確認。');
}

purgeGhostNodes();
