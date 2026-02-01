
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkYahooData() {
  console.log('Checking for Yahoo Japan data in Supabase...');

  const { data, error } = await supabase
    .from('transit_alerts')
    .select('*')
    .like('id', 'yahoo:%')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching data:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('No Yahoo data found in transit_alerts table.');

  const { data: snapData, error: snapErr } = await supabase
    .from('transit_dynamic_snapshot')
    .select('station_id, updated_at, status_code')
    .order('updated_at', { ascending: false })
    .limit(10);

  if (snapErr) {
    console.error('Error accessing transit_dynamic_snapshot:', snapErr);
  } else {
    console.log('Recent records in transit_dynamic_snapshot:', snapData);
  }
    return;
  }

  console.log(`Found ${data.length} Yahoo records:`);
  data.forEach(record => {
    console.log(`- [${record.id}] Status: ${record.status}, Message: ${record.text_ja}, Updated: ${record.updated_at}`);
  });
}

checkYahooData();
