
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

for (const k in envConfig) {
    process.env[k] = envConfig[k];
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyL2() {
    const nodeId = 'odpt:Station:TokyoMetro.Ueno'; // Test Ueno
    console.log(`Checking L2 data for: ${nodeId}...`);

    const { data, error } = await supabase
        .from('transit_dynamic_snapshot')
        .select('*')
        .eq('node_id', nodeId)
        .single();

    if (error) {
        console.error('Supabase Query Error:', error.message);
        return;
    }

    if (!data) {
        console.error('No L2 data found for this node.');
        return;
    }

    console.log('✅ L2 Data Found!');
    console.log('Updated At:', data.updated_at);

    // Check status_json structure
    if (data.status_json) {
        console.log('Status JSON Preview:', JSON.stringify(data.status_json).substring(0, 200) + '...');
        if (data.status_json.lines) {
            console.log(`✅ Contains ${data.status_json.lines.length} lines.`);
        } else {
            console.warn('⚠️ status_json is missing "lines" property.');
        }
    } else {
        console.warn('⚠️ status_json is null.');
    }
}

verifyL2();
