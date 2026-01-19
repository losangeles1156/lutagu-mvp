
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const googleKey = process.env.GOOGLE_API_KEY;

console.log('--- Environment Check ---');
console.log(`Supabase URL: ${supabaseUrl}`);
console.log(`Supabase Key: ${supabaseKey ? 'Set' : 'Missing'}`);
console.log(`Google Key: ${googleKey}`);

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase credentials missing.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConnection() {
    try {
        console.log('Testing Supabase connection...');
        const { data, error } = await supabase.from('odpt_stations').select('count', { count: 'exact', head: true });

        if (error) {
            console.error('❌ Supabase connection failed:', error.message);
        } else {
            console.log('✅ Supabase connection successful.');
        }
    } catch (e) {
        console.error('❌ Supabase connection error:', e);
    }
}

checkConnection();
