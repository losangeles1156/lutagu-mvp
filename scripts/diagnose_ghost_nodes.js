const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function diagnoseOverlaps() {
  console.log('--- 診斷東京站位置的重疊節點 ---');

  // 東京站大約坐標 [139.767, 35.681]
  // 查詢所有在該範圍內但名稱不是「東京」的節點
  const { data: nodes, error } = await supabase
    .from('nodes')
    .select('id, name, coordinates, ward_id, is_hub, parent_hub_id')
    .filter('name->>ja', 'not.ilike', '%東京%');

  if (error) {
    console.error('查詢失敗:', error);
    return;
  }

  // 找出坐標極其接近東京站中心點的非東京節點
  const TOKYO_STATION_COORDS = [139.767, 35.681];
  const threshold = 0.005; // 範圍閾值

  const ghostNodes = nodes.filter(n => {
    if (!n.coordinates || !n.coordinates.coordinates) return false;
    const [lon, lat] = n.coordinates.coordinates;
    return Math.abs(lon - TOKYO_STATION_COORDS[0]) < threshold &&
           Math.abs(lat - TOKYO_STATION_COORDS[1]) < threshold;
  });

  console.log(`發現 ${ghostNodes.length} 個疑似幽靈節點堆疊在東京站：`);
  ghostNodes.forEach(n => {
    console.log(`- ID: ${n.id}, Name: ${JSON.stringify(n.name)}, Ward: ${n.ward_id}, Coords: ${JSON.stringify(n.coordinates.coordinates)}`);
  });

  console.log('\n--- 診斷豊島區(Toshima)與板橋區(Itabashi)的混淆 ---');
  const { data: itabashiInToshima } = await supabase
    .from('nodes')
    .select('id, name, ward_id')
    .eq('ward_id', 'ward:toshima')
    .or('name->>ja.ilike.%板橋%,id.ilike.%Itabashi%');

  console.log(`在豊島區中發現 ${itabashiInToshima?.length || 0} 個板橋相關節點：`);
  itabashiInToshima?.forEach(n => {
    console.log(`- ID: ${n.id}, Name: ${n.name.ja}, Ward: ${n.ward_id}`);
  });
}

diagnoseOverlaps();
