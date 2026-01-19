
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
  const targetNodes = [
    'odpt:Station:JR-East.Ueno',
    'odpt:Station:JR-East.Shibuya',
    'odpt:Station:JR-East.Ikebukuro',
    'odpt:Station:JR-East.Akihabara'
  ];

  console.log('--- Diagnosing Core Hubs ---');
  const { data: nodes, error } = await supabase
    .from('nodes')
    .select('id, name, is_hub, parent_hub_id, location')
    .in('id', targetNodes);

  if (error) {
    console.error('Error fetching nodes:', error);
  } else {
    console.log('Hubs found:', JSON.stringify(nodes, null, 2));
  }

  console.log('\n--- Checking for potential child nodes (searching by name) ---');
  const searchNames = ['上野', '池袋', '秋葉原', '渋谷'];
  for (const name of searchNames) {
    const { data: children, error: cError } = await supabase
      .from('nodes')
      .select('id, name, is_hub, parent_hub_id')
      .or(`name->>ja.eq.${name},name->>zh-TW.eq.${name}`)
      .limit(10);

    if (cError) {
      console.error(`Error searching children for ${name}:`, cError);
    } else {
      console.log(`Potential children/duplicates for ${name}:`, JSON.stringify(children, null, 2));
    }
  }
}

diagnose();
