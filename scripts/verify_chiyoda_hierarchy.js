const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function verifyChiyodaHierarchy() {
  console.log('--- 驗證千代田區車站父子關係 ---');

  const targetIds = [
    'odpt:Station:JR-East.Tokyo',
    'odpt.Station:TokyoMetro.Chiyoda.Otemachi',
    'odpt.Station:TokyoMetro.Tozai.Otemachi',
    'odpt.Station:Toei.Mita.Otemachi',
    'odpt.Station:TokyoMetro.Marunouchi.Tokyo'
  ];

  const { data: nodes, error } = await supabase
    .from('nodes')
    .select('id, name, is_hub, parent_hub_id, ward_id')
    .in('id', targetIds);

  if (error) {
    console.error('查詢失敗:', error);
    return;
  }

  console.log('\n千代田區關鍵站點狀態：');
  nodes.forEach(n => {
    console.log(`- ID: ${n.id}, Name: ${n.name.ja}, Hub: ${n.is_hub}, Parent: ${n.parent_hub_id || 'NULL'}`);
  });

  const tokyoHub = nodes.find(n => n.id === 'odpt:Station:JR-East.Tokyo');
  if (tokyoHub && tokyoHub.is_hub) {
    console.log('\n[確認] 東京站已正確設置為 Hub。');
  } else {
    console.error('\n[錯誤] 東京站未被設置為 Hub！');
  }

  const otemachiNodes = nodes.filter(n => n.id.includes('Otemachi'));
  const allLinked = otemachiNodes.every(n => n.parent_hub_id === 'odpt:Station:JR-East.Tokyo');
  if (allLinked) {
    console.log('[確認] 大手町站點已正確關聯至東京站。');
  } else {
    console.warn('[警告] 部分大手町站點未正確關聯。');
  }
}

verifyChiyodaHierarchy();
