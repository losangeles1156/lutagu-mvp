
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

/**
 * Lutagu Top Stations Seeding Script
 * 
 * 目的：為東京核心樞紐站注入高品質的 L1 DNA 資料（景點、設施、氛圍）。
 * 這些資料是 L4 AI Agent 提供智慧建議（如避開擁擠、推薦置物櫃、規劃周邊行程）的基礎。
 */

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const TOP_STATIONS_DNA = [
    {
        id: 'odpt:Station:JR-East.Shinjuku',
        name: { 'zh-TW': '新宿', 'ja': '新宿', 'en': 'Shinjuku' },
        is_hub: true,
        vibe: 'metropolis',
        facilityTags: [
            { mainCategory: 'transport', subCategory: 'hub', name: 'JR Shinjuku West Exit', direction: 'West' },
            { mainCategory: 'shopping', subCategory: 'department', name: 'Isetan', distanceMeters: 300, direction: 'East' },
            { mainCategory: 'leisure', subCategory: 'nature', name: 'Shinjuku Gyoen', distanceMeters: 600, direction: 'South-East' },
            { mainCategory: 'transit_tip', subCategory: 'congestion', name: 'Avoid East Exit at Peak', detail: 'Extremely crowded, use South Exit for smoother flow' }
        ]
    },
    {
        id: 'odpt:Station:JR-East.Shibuya',
        name: { 'zh-TW': '澀谷', 'ja': '渋谷', 'en': 'Shibuya' },
        is_hub: true,
        vibe: 'youth_culture',
        facilityTags: [
            { mainCategory: 'leisure', subCategory: 'landmark', name: 'Scramble Crossing', distanceMeters: 20, direction: 'Hachiko Exit' },
            { mainCategory: 'shopping', subCategory: 'department', name: 'Shibuya Scramble Square', distanceMeters: 50, direction: 'East' },
            { mainCategory: 'transit_tip', subCategory: 'navigation', name: 'Ginza Line Transfer', detail: 'Located on 3F, follow yellow signs' }
        ]
    }
];

async function seedTopStations() {
    console.log('🚀 Starting Lutagu Top Stations DNA Seeding...');
    
    for (const station of TOP_STATIONS_DNA) {
        console.log(`Processing ${station.name['zh-TW']}...`);
        
        const { error } = await supabase
            .from('odpt_stations')
            .update({
                vibe: station.vibe,
                facility_tags: station.facilityTags,
                is_hub: station.is_hub,
                updated_at: new Date().toISOString()
            })
            .eq('id', station.id);

        if (error) {
            console.error(`❌ Error updating ${station.id}:`, error.message);
        } else {
            console.log(`✅ Successfully updated ${station.name['zh-TW']}`);
        }
    }

    console.log('✨ Seeding Completed.');
}

seedTopStations().catch(err => {
    console.error('💥 Fatal Error:', err);
    process.exit(1);
});
