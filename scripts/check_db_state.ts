
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('--- Checking Facilities (L3) ---');
  const { count: facilityCount, error: fError } = await supabase.from('facilities').select('*', { count: 'exact', head: true });
  if (fError) console.error('Error counting facilities:', fError);
  else console.log(`Total Facilities: ${facilityCount}`);

  console.log('\n--- Checking Ueno Zoo (L1) ---');
  // Try 'places' table first
  const { data: places, error: pError } = await supabase
    .from('l1_places')
    .select('*')
    .or('name_i18n->>en.ilike.%Zoo%,name_i18n->>ja.ilike.%動物園%')
    .limit(5);

  if (pError) {
      console.error('Error searching places:', pError);
      // Fallback to check if table exists or other tables
  } else {
      console.log('Found Places:', places);
  }
}

check();
