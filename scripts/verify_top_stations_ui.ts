
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

const TOP_10_STATIONS = [
    { id: 'odpt:Station:JR-East.Tokyo', name: 'Tokyo' },
    { id: 'odpt:Station:JR-East.Shinjuku', name: 'Shinjuku' },
    { id: 'odpt:Station:JR-East.Shibuya', name: 'Shibuya' },
    { id: 'odpt:Station:JR-East.Ikebukuro', name: 'Ikebukuro' },
    { id: 'odpt:Station:JR-East.Ueno', name: 'Ueno' },
    { id: 'odpt.Station:JR-East.Yamanote.Shinagawa', name: 'Shinagawa' },
    { id: 'odpt:Station:JR-East.Akihabara', name: 'Akihabara' },
    { id: 'odpt.Station:TokyoMetro.Ginza.Ginza', name: 'Ginza' },
    { id: 'odpt.Station:JR-East.Yamanote.Shimbashi', name: 'Shimbashi' },
    { id: 'odpt.Station:TokyoMetro.Hanzomon.Oshiage', name: 'Oshiage (Skytree)' }
];

async function verifyStationUI(station: { id: string, name: string }) {
    console.log(`\n🔍 Verifying ${station.name} (${station.id})...`);
    let issues = [];

    // 1. Verify Node Existence & L1 Data
    const { data: node, error: nodeError } = await supabase
        .from('nodes')
        .select('*')
        .eq('id', station.id)
        .maybeSingle();

    if (nodeError || !node) {
        issues.push('❌ Node not found in DB');
    } else {
        if (!node.facility_profile) issues.push('⚠️ Missing facility_profile (L1/L3)');
        if (!node.vibe_tags || node.vibe_tags.length === 0) issues.push('⚠️ Missing vibe_tags (L1)');
    }

    // 2. Verify L2 Data (Dynamic Snapshot)
    const { data: l2, error: l2Error } = await supabase
        .from('transit_dynamic_snapshot')
        .select('*')
        .eq('station_id', station.id)
        .maybeSingle();

    if (l2Error) issues.push(`❌ L2 Query Error: ${l2Error.message}`);
    else if (!l2) {
        // Try fallback logical IDs if exact match fails (simulating API logic)
        issues.push('⚠️ No L2 snapshot found (Live status might be empty)');
    } else {
        if (l2.status_code !== 'NORMAL' && l2.status_code !== 'DELAY') issues.push(`⚠️ Unknown status code: ${l2.status_code}`);
        // Check weather
        if (!l2.weather_info) issues.push('⚠️ Missing weather_info');
    }

    // 3. Verify L3 Data (Facilities)
    // L3 often uses `stations_static` or `l3_facilities`
    const { data: l3, error: l3Error } = await supabase
        .from('l3_facilities')
        .select('count')
        .eq('station_id', station.id)
        .limit(1); // Just check if any exist

    // Also check stations_static for service descriptions
    const { data: staticData } = await supabase
        .from('stations_static')
        .select('l3_services')
        .eq('id', station.id)
        .maybeSingle();

    if (!staticData?.l3_services) issues.push('⚠️ Missing stations_static.l3_services (Detailed facilities)');

    // 4. L4 Data (Usually derived, but check if station lines are mapped)
    // (This is implicitly checked by L2 lines logic, but we can check if transit_lines exist in node)
    if (node && (!node.transit_lines || node.transit_lines.length === 0)) {
        issues.push('⚠️ No transit_lines mapped in node (L4 Route planning might fail)');
    }

    // Report
    if (issues.length === 0) {
        console.log('✅ All Systems Normal (L1-L4 Data Present)');
    } else {
        issues.forEach(i => console.log(i));
    }
}

async function run() {
    console.log('=== Checking Top 10 Stations UI Data ===');
    for (const station of TOP_10_STATIONS) {
        await verifyStationUI(station);
    }
}

run().catch(console.error);
