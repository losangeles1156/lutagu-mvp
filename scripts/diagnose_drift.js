const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function diagnoseWardNodes() {
  console.log('--- 正在診斷行政區節點數據異常 ---');

  // 1. 檢查豐島區 (Toshima) 的節點
  const { data: toshimaNodes } = await supabase
    .from('nodes')
    .select('id, name->>ja, coordinates, ward_id')
    .eq('ward_id', 'ward:toshima')
    .limit(10);

  console.log('\n[豐島區樣點]:');
  toshimaNodes?.forEach(n => {
    console.log(`${n.ja} (${n.id}): ${JSON.stringify(n.coordinates?.coordinates)}`);
  });

  // 2. 檢查墨田區 (Sumida) 的節點
  const { data: sumidaNodes } = await supabase
    .from('nodes')
    .select('id, name->>ja, coordinates, ward_id')
    .eq('ward_id', 'ward:sumida')
    .limit(10);

  console.log('\n[墨田區樣點]:');
  sumidaNodes?.forEach(n => {
    console.log(`${n.ja} (${n.id}): ${JSON.stringify(n.coordinates?.coordinates)}`);
  });

  // 3. 檢查座標在皇居附近的節點 (約 139.75, 35.68)
  const { data: palaceNodes } = await supabase
    .from('nodes')
    .select('id, name->>ja, ward_id, coordinates')
    .limit(20);

  const drifted = palaceNodes?.filter(n => {
    const coords = n.coordinates?.coordinates;
    if (!coords) return false;
    // 檢查是否異常靠近皇居/東京站中心點
    return Math.abs(coords[0] - 139.75) < 0.05 && Math.abs(coords[1] - 35.68) < 0.05;
  });

  console.log('\n[座標異常靠近市中心的節點 (疑似漂移)]:');
  drifted?.forEach(n => {
    console.log(`${n.ja} (${n.id}) - 歸屬: ${n.ward_id}`);
  });
}

diagnoseWardNodes();
