const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function verifyWardAssignments() {
  console.log('--- 驗證豐島區與板橋區的車站歸屬 ---');
  
  // 檢查池袋相關站點
  const { data: ikebukuroNodes } = await supabase
    .from('nodes')
    .select('id, name, ward_id, is_hub, parent_hub_id')
    .or('name->>ja.ilike.%池袋%,id.ilike.%Ikebukuro%');

  console.log('\n池袋相關站點歸屬：');
  ikebukuroNodes.forEach(n => {
    console.log(`- ID: ${n.id}, Name: ${n.name.ja}, Ward: ${n.ward_id}, Hub: ${n.is_hub}`);
  });

  // 檢查板橋相關站點
  const { data: itabashiNodes } = await supabase
    .from('nodes')
    .select('id, name, ward_id, is_hub, parent_hub_id')
    .or('name->>ja.ilike.%板橋%,id.ilike.%Itabashi%');

  console.log('\n板橋相關站點歸屬：');
  itabashiNodes.forEach(n => {
    console.log(`- ID: ${n.id}, Name: ${n.name.ja || n.id}, Ward: ${n.ward_id}, Hub: ${n.is_hub}`);
  });

  // 檢查是否有站點同時被標記在多個行政區（這在目前的 schema 中理論上不會，但要看資料內容）
  const wardConflict = ikebukuroNodes.filter(n => n.ward_id === 'ward:itabashi');
  if (wardConflict.length > 0) {
    console.error(`\n[警告] 發現池袋站點被錯誤標記在板橋區: ${wardConflict.map(n => n.id).join(', ')}`);
  } else {
    console.log('\n[確認] 池袋站點歸屬正確，未出現在板橋區。');
  }
}

verifyWardAssignments();
