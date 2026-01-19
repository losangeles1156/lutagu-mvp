
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

async function verifyL3Ueno() {
    console.log('--- Verifying L3 Ueno Data ---');

    const { data: facilities, error } = await supabase
        .from('l3_facilities')
        .select('*')
        .or('station_id.eq.Hub:Ueno,station_id.eq.odpt:Station:JR-East.Ueno');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${facilities?.length} facilities.`);

    if (facilities && facilities.length > 0) {
        // Group by type
        const counts = facilities.reduce((acc, f) => {
            acc[f.type] = (acc[f.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        console.log('Counts by Type:', counts);

        // Show a few examples
        console.log('Examples:');
        facilities.slice(0, 3).forEach(f => {
            console.log(`- [${f.type}] ${JSON.stringify(f.attributes)} @ ${JSON.stringify(f.location_coords)}`);
        });
    } else {
        console.log('No facilities found!');
    }
}

verifyL3Ueno();
