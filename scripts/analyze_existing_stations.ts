/**
 * Analyze existing stations in the database
 * Run: npx tsx scripts/analyze_existing_stations.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function analyzeStations() {
    if (!supabaseUrl || !supabaseKey) {
        console.log('❌ Missing Supabase credentials');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('='.repeat(60));
    console.log('Existing Stations Analysis');
    console.log('='.repeat(60));

    // Count total by operator prefix
    console.log('\nStation count by operator prefix:');
    console.log('-'.repeat(40));

    const operators = ['JR-East', 'TokyoMetro', 'Toei', 'Tokyu', 'Keio', 'Odakyu', 'Seibu', 'Tobu', 'Keisei', 'Yurikomo', 'TWR', 'Mitsubishi', 'Keikyu', 'Keisei'];

    for (const op of operators) {
        const { count } = await supabase
            .from('nodes')
            .select('*', { count: 'exact', head: true })
            .like('id', `odpt.Station:${op}.%`)
            .eq('is_active', true);

        if (count && count > 0) {
            console.log(`${op.padEnd(15)}: ${count} stations`);
        }
    }

    // Check total
    const { count: total } = await supabase
        .from('nodes')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

    console.log('-'.repeat(40));
    console.log(`Total active stations: ${total}`);

    // List all stations in a specific area for reference
    console.log('\n' + '='.repeat(60));
    console.log('Sample station IDs (first 20):');
    console.log('='.repeat(60));

    const { data: samples } = await supabase
        .from('nodes')
        .select('id')
        .eq('is_active', true)
        .limit(20);

    for (const s of samples || []) {
        console.log(s.id);
    }
}

analyzeStations().catch(console.error);
