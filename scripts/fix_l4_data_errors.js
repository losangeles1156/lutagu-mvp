const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function fixGhostNodesAndWards() {
  console.log('--- 開始修正 Hub 節點坐標錯誤 ---');
  
  const hubsToFix = [
    { id: 'odpt:Station:JR-East.Ikebukuro', pattern: 'odpt.Station%Ikebukuro%' },
    { id: 'odpt:Station:JR-East.Shibuya', pattern: 'odpt.Station%Shibuya%' },
    { id: 'odpt:Station:JR-East.Akihabara', pattern: 'odpt.Station%Akihabara%' },
    { id: 'odpt:Station:JR-East.Ueno', pattern: 'odpt.Station%Ueno%' }
  ];

  for (const hub of hubsToFix) {
    // 獲取該 Hub 旗下子節點的正確坐標
    const { data: children } = await supabase
      .from('nodes')
      .select('coordinates')
      .like('id', hub.pattern)
      .neq('id', hub.id)
      .not('coordinates', 'is', null)
      .limit(1);

    if (children && children.length > 0 && children[0].coordinates) {
      const correctCoords = children[0].coordinates;
      console.log(`修正 ${hub.id} 坐標為: ${JSON.stringify(correctCoords.coordinates)}`);
      
      const { error } = await supabase
        .from('nodes')
        .update({ coordinates: correctCoords })
        .eq('id', hub.id);
      
      if (error) console.error(`更新 ${hub.id} 失敗:`, error);
    } else {
      console.warn(`找不到 ${hub.id} 的子節點坐標`);
    }
  }

  console.log('\n--- 開始修正行政區歸屬錯誤 ---');

  // 1. 確保板橋區 (ward:itabashi) 存在
  const itabashiWard = {
    id: 'ward:itabashi',
    name_i18n: { ja: '板橋区', en: 'Itabashi', zh: '板橋區', 'zh-TW': '板橋區' },
    prefecture: 'Tokyo',
    ward_code: 'Itabashi',
    is_active: true,
    priority_order: 20
  };
  
  await supabase.from('wards').upsert(itabashiWard);
  console.log('已確保板橋區配置存在');

  // 2. 修正被誤劃分到豊島區的板橋車站
  const { data: misassigned } = await supabase
    .from('nodes')
    .select('id, name')
    .eq('ward_id', 'ward:toshima')
    .or('name->>ja.ilike.%板橋%,id.ilike.%Itabashi%');

  if (misassigned && misassigned.length > 0) {
    const idsToMove = misassigned.map(n => n.id);
    const { error: moveError } = await supabase
      .from('nodes')
      .update({ ward_id: 'ward:itabashi' })
      .in('id', idsToMove);
    
    if (moveError) {
      console.error('移轉行政區失敗:', moveError);
    } else {
      console.log(`成功將 ${idsToMove.length} 個車站從豊島區移轉至板橋區`);
      misassigned.forEach(n => console.log(` - 移轉: ${n.name.ja || n.id}`));
    }
  }

  console.log('\n--- 清理重複的舊節點 ---');
  // 刪除那些 ID 格式不正確（例如帶點號但應該是冒號）且坐標在東京站的節點
  // 但為了安全，我們先只修正坐標。
  
  console.log('修復完成。請重啟前端或清除快取 (v4) 查看效果。');
}

fixGhostNodesAndWards();
