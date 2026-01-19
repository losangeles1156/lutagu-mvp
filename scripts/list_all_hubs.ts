/**
 * List all hubs in the database with their coordinates
 * Run: npx tsx scripts/list_all_hubs.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function listAllHubs() {
    if (!supabaseUrl || !supabaseKey) {
        console.log('❌ Missing Supabase credentials');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('='.repeat(60));
    console.log('All Hubs in Database');
    console.log('='.repeat(60));

    // Get all hubs
    const { data: hubs, error } = await supabase
        .from('nodes')
        .select('id, name, is_hub, parent_hub_id, ward_id, coordinates')
        .eq('is_hub', true)
        .eq('is_active', true)
        .order('name');

    if (error) {
        console.log('❌ Error fetching hubs:', error.message);
        return;
    }

    console.log(`\nTotal hubs: ${hubs?.length || 0}\n`);

    for (const hub of hubs || []) {
        const name = typeof hub.name === 'object'
            ? (hub.name['zh-TW'] || hub.name['ja'] || hub.name['en'] || hub.id)
            : (hub.name || hub.id);

        // Parse coordinates
        let coords = 'N/A';
        if (hub.coordinates) {
            if (hub.coordinates.coordinates) {
                coords = `${hub.coordinates.coordinates[1].toFixed(4)}, ${hub.coordinates.coordinates[0].toFixed(4)}`;
            } else if (Array.isArray(hub.coordinates)) {
                coords = `${hub.coordinates[1].toFixed(4)}, ${hub.coordinates[0].toFixed(4)}`;
            }
        }

        console.log(`• ${name}`);
        console.log(`  ID: ${hub.id}`);
        console.log(`  Coords: ${coords}`);
        console.log(`  Ward: ${hub.ward_id || 'Not assigned'}`);
        console.log('');
    }

    // List expected major hubs that are NOT in the database
    console.log('='.repeat(60));
    console.log('Expected Major Hubs (NOT in database as is_hub=true)');
    console.log('='.repeat(60));

    const expectedHubs = [
        'odpt.Station:JR-East.Shibuya',       // 渋谷
        'odpt.Station:JR-East.Shinagawa',     // 品川
        'odpt.Station:JR-East.Ebisu',         // 恵比寿
        'odpt.Station:JR-East.Meguro',        // 目黒
        'odpt.Station:JR-East.Osaki',         // 大崎
        'odpt.Station:JR-East.Gotanda',       // 五反田
        'odpt.Station:JR-East.Tamachi',       // 田町
        'odpt.Station:JR-East.Hamamatsucho',  // 浜町
        'odpt.Station:JR-East.Shinbashi',     // 新橋
        'odpt.Station:TokyoMetro.Ginza',      // 銀座
        'odpt.Station:TokyoMetro.Nihombashi', // 日本橋
        'odpt.Station:TokyoMetro.Kayabacho',  // 茅場町
        'odpt.Station:TokyoMetro.Hibiya',     // 日比谷
        'odpt.Station:Toei.Mita.Shimbashi',   // 三田
    ];

    for (const hubId of expectedHubs) {
        const { data } = await supabase
            .from('nodes')
            .select('id, name, is_hub')
            .eq('id', hubId)
            .single();

        if (data && !data.is_hub) {
            const name = typeof data.name === 'object'
                ? (data.name['zh-TW'] || data.name['ja'] || data.name['en'] || data.id)
                : (data.name || data.id);
            console.log(`⚠️ ${name} (${data.id})`);
            console.log(`   is_hub: ${data.is_hub}`);
        }
    }
}

listAllHubs().catch(console.error);
