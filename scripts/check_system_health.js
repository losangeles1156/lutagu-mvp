const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSystem() {
  console.log('--- Checking Wards ---');
  const { data: wards, error: wardError } = await supabase
    .from('wards')
    .select('*')
    .order('priority_order');

  if (wardError) {
    console.error('Error fetching wards:', wardError);
  } else {
    console.log(`Total wards in DB: ${wards.length}`);
    wards.forEach(w => {
      console.log(`- ID: ${w.id}, Name: ${JSON.stringify(w.name_i18n)}, Active: ${w.is_active}`);
    });
  }

  console.log('\n--- Checking Hub Nodes ---');
  const hubNames = ['Ikebukuro', 'Shibuya', 'Akihabara', 'Ueno'];
  for (const name of hubNames) {
    const { data: nodes, error } = await supabase
      .from('nodes')
      .select('id, name, is_hub, parent_hub_id, coordinates')
      .or(`name->>en.ilike.%${name}%,name->>ja.ilike.%${name}%`);

    if (error) {
      console.error(`Error checking ${name}:`, error);
      continue;
    }

    console.log(`\nResults for "${name}":`);
    nodes.forEach(n => {
      console.log(`- ID: ${n.id}, Hub: ${n.is_hub}, Parent: ${n.parent_hub_id}, Name: ${JSON.stringify(n.name)}`);
    });
  }

  console.log('\n--- Checking Airport Nodes ---');
  const airportPatterns = ['%Haneda%', '%Narita%'];
  for (const pattern of airportPatterns) {
    const { data: nodes, error } = await supabase
      .from('nodes')
      .select('id, name, is_hub, parent_hub_id, coordinates')
      .or(`name->>en.ilike.${pattern},name->>ja.ilike.${pattern}`);

    if (error) {
      console.error(`Error checking airport pattern ${pattern}:`, error);
      continue;
    }

    console.log(`\nResults for pattern "${pattern}":`);
    nodes.forEach(n => {
      console.log(`- ID: ${n.id}, Hub: ${n.is_hub}, Parent: ${n.parent_hub_id}, Name: ${JSON.stringify(n.name)}`);
    });
  }
}

checkSystem();
