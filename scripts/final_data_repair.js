const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function finalDataRepair() {
  console.log('--- 執行最終資料修復 ---');

  // 1. 強制修正東京站 Hub
  const TOKYO_HUB_ID = 'odpt:Station:JR-East.Tokyo';
  
  console.log('修正東京站 Hub 狀態...');
  await supabase.from('nodes').update({ 
    is_hub: true, 
    parent_hub_id: null,
    ward_id: 'ward:chiyoda'
  }).eq('id', TOKYO_HUB_ID);

  // 2. 修正大手町與東京站子站
  const tokyoChildren = [
    'odpt.Station:TokyoMetro.Chiyoda.Otemachi',
    'odpt.Station:TokyoMetro.Tozai.Otemachi',
    'odpt.Station:TokyoMetro.Hanzomon.Otemachi',
    'odpt.Station:TokyoMetro.Marunouchi.Otemachi',
    'odpt.Station:Toei.Mita.Otemachi',
    'odpt.Station:TokyoMetro.Marunouchi.Tokyo',
    'odpt.Station:JR-East.Yamanote.Tokyo',
    'odpt.Station:JR-East.Chuo.Tokyo'
  ];

  console.log('建立父子關聯...');
  const { error: childError } = await supabase.from('nodes')
    .update({ 
      parent_hub_id: TOKYO_HUB_ID,
      is_hub: false,
      ward_id: 'ward:chiyoda'
    })
    .in('id', tokyoChildren);
  
  if (childError) console.error('修復子站失敗:', childError);

  // 3. 處理 ID 格式不一致導致的漏網之魚
  // 使用名稱模糊匹配來修正剩餘的大手町/東京站點
  const { data: orphans } = await supabase
    .from('nodes')
    .select('id')
    .or('name->>ja.ilike.%大手町%,name->>ja.eq.東京')
    .neq('id', TOKYO_HUB_ID);

  if (orphans && orphans.length > 0) {
    const orphanIds = orphans.map(o => o.id);
    await supabase.from('nodes')
      .update({ parent_hub_id: TOKYO_HUB_ID, is_hub: false })
      .in('id', orphanIds);
    console.log(`修正了 ${orphanIds.length} 個孤立站點。`);
  }

  console.log('修復完成。');
}

finalDataRepair();
