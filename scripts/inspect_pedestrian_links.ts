
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectTable() {
    console.log('Inspecting pedestrian_links table...');

    // Fetch one row to see the structure
    const { data, error } = await supabase
        .from('pedestrian_links')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching data:', error);
        return;
    }

    if (data && data.length > 0) {
        const row = data[0];
        console.log('Sample Row Keys:', Object.keys(row));
        console.log('Sample Row Data:', row);

        // Check types of specific columns
        console.log('Type of distance_meters:', typeof row.distance_meters);
    } else {
        console.log('Table is empty.');
    }
}

inspectTable();
