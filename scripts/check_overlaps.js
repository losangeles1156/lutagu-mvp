
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOverlaps() {
  const stations = ['Ueno', 'Ikebukuro', 'Akihabara', 'Shibuya'];

  for (const name of stations) {
    console.log(`\n--- Checking overlaps for ${name} ---`);
    // Search by English name in the JSON or as string
    const { data: nodes, error } = await supabase
      .from('nodes')
      .select('id, name, is_hub, parent_hub_id, coordinates')
      .or(`name->>en.ilike.%${name}%,name->>ja.ilike.%${name}%`);

    if (error) {
      console.error(error);
      continue;
    }

    const orphans = nodes.filter(n => n.parent_hub_id === null);
    console.log(`Nodes with parent_hub_id IS NULL: ${orphans.length}`);
    orphans.forEach(n => {
      console.log(`  ID: ${n.id}, Name: ${JSON.stringify(n.name)}, is_hub: ${n.is_hub}`);
    });
  }
}

checkOverlaps();
