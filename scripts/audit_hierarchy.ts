
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkHierarchy() {
    console.log('--- Database Hierarchy Audit ---');

    const { count: totalHierarchy, error: countError } = await supabase
        .from('node_hierarchy')
        .select('*', { count: 'exact', head: true });

    if (countError) {
        console.error('Error counting node_hierarchy:', countError);
        return;
    }
    console.log('Total entries in node_hierarchy:', totalHierarchy);

    const { count: activeHierarchy, error: activeError } = await supabase
        .from('node_hierarchy')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

    console.log('Active entries in node_hierarchy:', activeHierarchy);

    const { data: sampleHierarchy, error: sampleError } = await supabase
        .from('node_hierarchy')
        .select('*')
        .limit(5);

    console.log('Sample hierarchy:', JSON.stringify(sampleHierarchy, null, 2));

    // Check if some major stations are missing from node_hierarchy or inactive
    const majorStations = [
        'odpt.Station:JR-East.Yamanote.Shinjuku',
        'odpt.Station:JR-East.Yamanote.Shibuya',
        'odpt.Station:JR-East.Yamanote.Tokyo',
        'odpt.Station:JR-East.Yamanote.Ueno'
    ];

    const { data: majorData, error: majorError } = await supabase
        .from('node_hierarchy')
        .select('node_id, is_active')
        .in('node_id', majorStations);

    console.log('Major stations status in hierarchy:', majorData);
}

checkHierarchy();
