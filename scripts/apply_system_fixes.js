const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyFixes() {
  console.log('--- Applying Ward Fixes ---');
  
  const wardsToUpdate = [
    { 
      id: 'ward:toshima', 
      name_i18n: { ja: '豊島区', en: 'Toshima', zh: '豊島區', 'zh-TW': '豊島區' },
      prefecture: 'Tokyo',
      ward_code: 'Toshima',
      is_active: true,
      priority_order: 12
    },
    { 
      id: 'ward:shibuya', 
      name_i18n: { ja: '渋谷区', en: 'Shibuya', zh: '澀谷區', 'zh-TW': '澀谷區' },
      prefecture: 'Tokyo',
      ward_code: 'Shibuya',
      is_active: true,
      priority_order: 13
    },
    { 
      id: 'ward:bunkyo', 
      name_i18n: { ja: '文京区', en: 'Bunkyo', zh: '文京區', 'zh-TW': '文京區' },
      prefecture: 'Tokyo',
      ward_code: 'Bunkyo',
      is_active: true,
      priority_order: 6
    },
    { 
      id: 'ward:airport', 
      name_i18n: { ja: '空港エリア', en: 'Airport Area', zh: '機場區域', 'zh-TW': '機場區域' },
      prefecture: 'Tokyo',
      ward_code: 'Airport',
      is_active: true,
      priority_order: 99
    }
  ];

  for (const ward of wardsToUpdate) {
    const { error } = await supabase
      .from('wards')
      .upsert(ward);
    
    if (error) {
      console.error(`Error updating ward ${ward.id}:`, error);
    } else {
      console.log(`Successfully updated ward ${ward.id}`);
    }
  }

  console.log('\n--- Fixing Node Overlaps (Hub vs Child) ---');
  // For hubs like Ikebukuro, Shibuya, Akihabara, Ueno
  // We want to make sure children have correct parent_hub_id and are not marked as hubs themselves
  
  const hubIds = [
    'odpt:Station:JR-East.Ikebukuro',
    'odpt:Station:JR-East.Shibuya',
    'odpt:Station:JR-East.Akihabara',
    'odpt:Station:JR-East.Ueno'
  ];

  for (const hubId of hubIds) {
    // 1. Ensure Hub is correctly marked
    await supabase.from('nodes').update({ is_hub: true, parent_hub_id: null }).eq('id', hubId);
    
    // 2. Find nodes that should be children but might be orphans or incorrectly marked
    const baseName = hubId.split('.').pop();
    const { data: children } = await supabase
      .from('nodes')
      .select('id')
      .like('id', `odpt.Station%${baseName}%`)
      .neq('id', hubId);
    
    if (children && children.length > 0) {
      const childIds = children.map(c => c.id);
      await supabase.from('nodes')
        .update({ is_hub: false, parent_hub_id: hubId })
        .in('id', childIds);
      console.log(`Updated ${childIds.length} children for hub ${hubId}`);
    }
  }
}

applyFixes();
