/**
 * Seed stations for Ota and Setagaya wards
 * This script assigns existing ODPT stations to the new wards based on their coordinates
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Ward boundaries (approximate)
const WARD_BOUNDS: Record<string, { minLat: number; maxLat: number; minLng: number; maxLng: number }> = {
    'ward:ota': {
        minLat: 35.520,
        maxLat: 35.600,
        minLng: 139.680,
        maxLng: 139.780,
    },
    'ward:setagaya': {
        minLat: 35.600,
        maxLat: 35.680,
        minLng: 139.590,
        maxLng: 139.680,
    },
};

// Key stations to seed for each ward (manually selected for coverage)
const WARD_STATIONS: Record<string, Array<{ id: string; name: { ja: string; en: string; 'zh-TW': string }; lat: number; lng: number }>> = {
    'ward:ota': [
        // JR
        { id: 'odpt.Station:JR-East.Keihin-Tohoku.Kamata', name: { ja: '蒲田', en: 'Kamata', 'zh-TW': '蒲田' }, lat: 35.5625, lng: 139.7161 },
        { id: 'odpt.Station:JR-East.Keihin-Tohoku.Omori', name: { ja: '大森', en: 'Omori', 'zh-TW': '大森' }, lat: 35.5870, lng: 139.7288 },
        // Tokyu
        { id: 'odpt.Station:Tokyu.Tamagawa.Kamata', name: { ja: '蒲田', en: 'Kamata', 'zh-TW': '蒲田' }, lat: 35.5625, lng: 139.7161 },
        { id: 'odpt.Station:Tokyu.Meguro.Ookayama', name: { ja: '大岡山', en: 'Ookayama', 'zh-TW': '大岡山' }, lat: 35.6074, lng: 139.6855 },
        { id: 'odpt.Station:Tokyu.Ikegami.Ikegami', name: { ja: '池上', en: 'Ikegami', 'zh-TW': '池上' }, lat: 35.5761, lng: 139.7042 },
        // Keikyu
        { id: 'odpt.Station:Keikyu.Main.Kamata', name: { ja: '京急蒲田', en: 'Keikyu Kamata', 'zh-TW': '京急蒲田' }, lat: 35.5614, lng: 139.7222 },
        { id: 'odpt.Station:Keikyu.Airport.Haneda-Airport-Terminal-1-2', name: { ja: '羽田空港第１・第２ターミナル', en: 'Haneda T1/T2', 'zh-TW': '羽田機場T1/T2' }, lat: 35.5481, lng: 139.7780 },
        { id: 'odpt.Station:Keikyu.Airport.Haneda-Airport-Terminal-3', name: { ja: '羽田空港第３ターミナル', en: 'Haneda T3 (International)', 'zh-TW': '羽田機場國際線' }, lat: 35.5441, lng: 139.7677 },
        // Tokyo Monorail
        { id: 'odpt.Station:TokyoMonorail.HanedaAirportLine.Haneda-Airport-Terminal-2', name: { ja: '羽田空港第２ターミナル', en: 'Haneda T2', 'zh-TW': '羽田機場T2' }, lat: 35.5485, lng: 139.7759 },
    ],
    'ward:setagaya': [
        // Tokyu
        { id: 'odpt.Station:Tokyu.DenEnToshi.Futako-Tamagawa', name: { ja: '二子玉川', en: 'Futako-tamagawa', 'zh-TW': '二子玉川' }, lat: 35.6114, lng: 139.6269 },
        { id: 'odpt.Station:Tokyu.DenEnToshi.Sangenjaya', name: { ja: '三軒茶屋', en: 'Sangenjaya', 'zh-TW': '三軒茶屋' }, lat: 35.6437, lng: 139.6700 },
        { id: 'odpt.Station:Tokyu.Toyoko.Jiyugaoka', name: { ja: '自由が丘', en: 'Jiyugaoka', 'zh-TW': '自由之丘' }, lat: 35.6075, lng: 139.6685 },
        { id: 'odpt.Station:Tokyu.Setagaya.Setagaya', name: { ja: '世田谷', en: 'Setagaya', 'zh-TW': '世田谷' }, lat: 35.6445, lng: 139.6474 },
        { id: 'odpt.Station:Tokyu.Oimachi.Futako-Shinchi', name: { ja: '二子新地', en: 'Futako-Shinchi', 'zh-TW': '二子新地' }, lat: 35.6096, lng: 139.6217 },
        // Odakyu
        { id: 'odpt.Station:Odakyu.Odawara.ShimokitaZawa', name: { ja: '下北沢', en: 'Shimokitazawa', 'zh-TW': '下北澤' }, lat: 35.6618, lng: 139.6673 },
        { id: 'odpt.Station:Odakyu.Odawara.SeijoGakuenmae', name: { ja: '成城学園前', en: 'Seijo-Gakuenmae', 'zh-TW': '成城學園前' }, lat: 35.6410, lng: 139.5987 },
        // Keio
        { id: 'odpt.Station:Keio.Inokashira.ShimokitaZawa', name: { ja: '下北沢', en: 'Shimokitazawa', 'zh-TW': '下北澤' }, lat: 35.6618, lng: 139.6673 },
        // Toei
        { id: 'odpt.Station:Toei.Setagaya.Sangenjaya', name: { ja: '三軒茶屋', en: 'Sangenjaya', 'zh-TW': '三軒茶屋' }, lat: 35.6437, lng: 139.6700 },
    ],
};

async function main() {
    console.log('=== Seeding stations for Ota and Setagaya wards ===\n');

    for (const [wardId, stations] of Object.entries(WARD_STATIONS)) {
        console.log(`\n📍 Seeding ${stations.length} stations for ${wardId}...`);

        for (const station of stations) {
            // Upsert node
            const { error } = await supabase
                .from('nodes')
                .upsert({
                    id: station.id,
                    name: station.name,
                    city_id: 'tokyo_core',
                    coordinates: `SRID=4326;POINT(${station.lng} ${station.lat})`,
                    ward_id: wardId,
                    node_type: 'station',
                    is_active: true,
                    parent_hub_id: null,
                }, { onConflict: 'id' });

            if (error) {
                console.error(`  ❌ Failed to upsert ${station.id}:`, error.message);
            } else {
                console.log(`  ✅ ${station.name.ja} (${station.name.en})`);
            }
        }
    }

    // Update ward node counts
    console.log('\n📊 Updating ward node counts...');
    for (const wardId of Object.keys(WARD_STATIONS)) {
        const { count } = await supabase
            .from('nodes')
            .select('*', { count: 'exact', head: true })
            .eq('ward_id', wardId);

        await supabase
            .from('wards')
            .update({ node_count: count || 0 })
            .eq('id', wardId);

        console.log(`  ${wardId}: ${count} nodes`);
    }

    console.log('\n=== Done! ===');
}

main().catch(console.error);
