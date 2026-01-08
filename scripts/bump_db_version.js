const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function bumpDatabaseVersion() {
  console.log('--- 提升資料庫節點版本號至 v5 ---');
  
  // 更新所有 Hub 節點的版本號，確保前端 dedupeNodesById 會接受它們
  const { error } = await supabase
    .from('nodes')
    .update({ 
      version: 5,
      updated_at: new Date().toISOString()
    })
    .or('is_hub.eq.true,parent_hub_id.is.null');

  if (error) {
    console.error('更新版本號失敗:', error);
  } else {
    console.log('成功將所有核心節點版本提升至 v5。');
  }
}

bumpDatabaseVersion();
