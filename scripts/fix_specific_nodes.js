const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function fixSpecificNodes() {
  console.log('--- 修正特定節點座標與歸屬 ---');

  // 1. 修正押上 (Oshiage)
  // 正確座標約為 [139.813, 35.710]
  const oshiageCoords = { type: 'Point', coordinates: [139.813, 35.710] };
  await supabase.from('nodes')
    .update({ 
      coordinates: oshiageCoords,
      ward_id: 'ward:sumida',
      is_active: true
    })
    .ilike('id', '%Oshiage%');
  
  console.log('已更新押上站座標與歸屬。');

  // 2. 確保豐島區不再含有「大山」等板橋區車站
  await supabase.from('nodes')
    .update({ ward_id: 'ward:itabashi' })
    .ilike('id', '%Oyama%');
  
  console.log('已將大山站移至板橋區。');
}

fixSpecificNodes();
