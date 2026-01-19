import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
const supabase = createClient(envConfig.NEXT_PUBLIC_SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY || envConfig.SUPABASE_SERVICE_KEY);

async function inspect() {
    console.log('Fetching stations_static...');

    // Check main static table
    const { data: stations, error } = await supabase
        .from('stations_static')
        .select('*'); // Select all to see structures

    if (error) {
        console.error('Error fetching stations_static:', error);
        return;
    }

    console.log(`\n=== Found ${stations.length} records in stations_static ===`);
    if (stations.length > 0) {
        console.log('Sample Record:', JSON.stringify(stations[0], null, 2));
    }
    stations.forEach(s => {
        // Handle potential multilingual name structure or flat string
        const name = s.station_name_en || s.name || 'Unknown';
        console.log(`[${s.station_id || s.id}] ${name}`);
    });

    if (stations.length > 0) {
        console.log('Keys available:', Object.keys(stations[0]).join(', '));
    }

    console.log(`\n=== List of ${stations.length} Stations in DB ===`);
    stations.forEach(s => {
        // Try to find a human readable name
        // Based on previous JSON, we have l1_identity_tag, etc.
        // Let's print ID and maybe any other useful field we see in keys later.
        // For now just ID is safest.
        console.log(`- ${s.station_id}`);
    });
}

inspect();
