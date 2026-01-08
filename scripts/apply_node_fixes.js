
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function applyFixes() {
  const fixes = [
    {
      id: 'odpt:Station:JR-East.Ikebukuro',
      name: { en: 'Ikebukuro', ja: '池袋', 'zh-TW': '池袋', 'zh-CN': '池袋' },
      is_hub: true,
      parent_hub_id: null,
      childrenPattern: ['odpt.Station%Ikebukuro', 'odpt:Station%Ikebukuro']
    },
    {
      id: 'odpt:Station:JR-East.Shibuya',
      name: { en: 'Shibuya', ja: '渋谷', 'zh-TW': '澀谷', 'zh-CN': '涩谷' },
      is_hub: true,
      parent_hub_id: null,
      childrenPattern: ['odpt.Station%Shibuya', 'odpt:Station%Shibuya']
    },
    {
      id: 'odpt:Station:JR-East.Akihabara',
      name: { en: 'Akihabara', ja: '秋葉原', 'zh-TW': '秋葉原', 'zh-CN': '秋葉原' },
      is_hub: true,
      parent_hub_id: null,
      childrenPattern: ['odpt.Station%Akihabara', 'odpt:Station%Akihabara']
    },
    {
      id: 'odpt:Station:JR-East.Ueno',
      name: { en: 'Ueno', ja: '上野', 'zh-TW': '上野', 'zh-CN': '上野' },
      is_hub: true,
      parent_hub_id: null,
      childrenPattern: ['odpt.Station%Ueno', 'odpt:Station%Ueno'],
      excludeChildren: ['odpt:Station:JR-East.Ueno', 'odpt.Station:TokyoMetro.Ginza.UenoHirokoji', 'odpt.Station:Toei.Oedo.UenoOkachimachi']
    }
  ];

  for (const fix of fixes) {
    console.log(`Applying fix for ${fix.id}...`);
    
    // 1. Update Hub
    const { error: hubError } = await supabase
      .from('nodes')
      .update({
        name: fix.name,
        is_hub: fix.is_hub,
        parent_hub_id: fix.parent_hub_id
      })
      .eq('id', fix.id);
    
    if (hubError) console.error(`Error updating hub ${fix.id}:`, hubError);

    // 2. Update Children by pattern
    for (const pattern of fix.childrenPattern) {
      let query = supabase
        .from('nodes')
        .update({
          is_hub: false,
          parent_hub_id: fix.id
        })
        .like('id', pattern)
        .neq('id', fix.id);
      
      if (fix.excludeChildren) {
        query = query.not('id', 'in', `(${fix.excludeChildren.join(',')})`);
      }

      const { error: childError } = await query;
      if (childError) console.error(`Error updating children for ${fix.id} with pattern ${pattern}:`, childError);
    }
  }

  // 3. Coordinate-based cleanup (simplified approach)
  console.log('Running coordinate-based cleanup...');
  const { data: hubs } = await supabase.from('nodes').select('id, coordinates').eq('is_hub', true);
  
  if (hubs) {
    for (const hub of hubs) {
      // Find nodes with same coordinates but not this hub
      const { error: cleanupError } = await supabase
        .from('nodes')
        .update({ is_hub: false, parent_hub_id: hub.id })
        .eq('coordinates', hub.coordinates)
        .neq('id', hub.id)
        .is('parent_hub_id', null);
      
      if (cleanupError) {
        // This might fail if coordinates is not directly comparable this way, 
        // but it's a good secondary attempt.
        console.warn(`Coordinate cleanup for ${hub.id} might have skipped some nodes.`);
      }
    }
  }

  console.log('All fixes applied.');
}

applyFixes();
