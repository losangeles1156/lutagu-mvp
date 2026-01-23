#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function findUenoCoords() {
  // 找出上野站的座標
  const { data: allStations } = await supabase
    .from('nodes')
    .select('id, name, coordinates, parent_hub_id')
    .eq('node_type', 'station');

  const uenoStations = allStations?.filter(node => {
    const nameStr = JSON.stringify(node.name);
    return (nameStr.includes('上野') || nameStr.includes('Ueno')) &&
           !nameStr.includes('御徒町') &&
           !nameStr.includes('広小路') &&
           !nameStr.includes('毛');
  });

  console.log('找到的上野站：\n');
  uenoStations?.forEach(node => {
    console.log(`${node.name.ja || node.name.en}`);
    console.log(`  ID: ${node.id}`);
    console.log(`  parent_hub_id: ${node.parent_hub_id || 'null'}`);

    if (node.coordinates?.coordinates) {
      const [lon, lat] = node.coordinates.coordinates;
      console.log(`  座標: [${lon}, ${lat}]`);
      console.log(`  API 測試範圍: min_lat=${lat - 0.01}, max_lat=${lat + 0.01}, min_lon=${lon - 0.01}, max_lon=${lon + 0.01}`);
    } else {
      console.log(`  座標: 無`);
    }
    console.log('');
  });

  // 找出所有 parent_hub_id = null 的站點座標範圍
  const hubs = allStations?.filter(n => n.parent_hub_id === null && n.coordinates?.coordinates);
  if (hubs && hubs.length > 0) {
    const lats = hubs.map(h => h.coordinates.coordinates[1]);
    const lons = hubs.map(h => h.coordinates.coordinates[0]);

    console.log('\n所有 parent_hub_id = null 站點的座標範圍：');
    console.log(`  緯度: ${Math.min(...lats).toFixed(4)} ~ ${Math.max(...lats).toFixed(4)}`);
    console.log(`  經度: ${Math.min(...lons).toFixed(4)} ~ ${Math.max(...lons).toFixed(4)}`);

    // 建議一個涵蓋全部的測試範圍
    const minLat = Math.min(...lats) - 0.01;
    const maxLat = Math.max(...lats) + 0.01;
    const minLon = Math.min(...lons) - 0.01;
    const maxLon = Math.max(...lons) + 0.01;

    console.log(`\n建議的 API 測試參數：`);
    console.log(`min_lat=${minLat.toFixed(4)}&max_lat=${maxLat.toFixed(4)}&min_lon=${minLon.toFixed(4)}&max_lon=${maxLon.toFixed(4)}&zoom=13`);
  }
}

findUenoCoords().catch(console.error);
