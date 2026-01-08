const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkWards() {
  console.log('--- Checking Wards Table ---');
  const { data: wards, error } = await supabase
    .from('wards')
    .select('*')
    .order('priority_order');

  if (error) {
    console.error('Error fetching wards:', error);
    return;
  }

  console.log(`Total wards in DB: ${wards.length}`);
  wards.forEach(w => {
    console.log(`- ID: ${w.id}, Name: ${JSON.stringify(w.name_i18n)}, Active: ${w.is_active}, Priority: ${w.priority_order}`);
  });
}

checkWards();
