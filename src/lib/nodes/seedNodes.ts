import { supabaseAdmin } from '../supabase';

const SEED_NODES = [
    {
        id: 'odpt:Station:TokyoMetro.Ueno',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '上野', 'ja': '上野', 'en': 'Ueno' },
        type: 'station',
        location: 'POINT(139.7774 35.7141)', // Lon Lat
        geohash: 'xn77k', // Dummy or approx
        is_hub: true,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'busy'
    },
    {
        id: 'odpt:Station:JR-East.Akihabara',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '秋葉原', 'ja': '秋葉原', 'en': 'Akihabara' },
        type: 'station',
        location: 'POINT(139.7742 35.6986)',
        geohash: 'xn77k',
        is_hub: true,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'electric'
    },
    {
        id: 'odpt:Station:JR-East.Tokyo',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '東京', 'ja': '東京', 'en': 'Tokyo' },
        type: 'station',
        location: 'POINT(139.7671 35.6812)',
        geohash: 'xn76u',
        is_hub: true,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'historic'
    },
    // Chuo & Ginza Core
    {
        id: 'odpt:Station:TokyoMetro.Ginza',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '銀座', 'ja': '銀座', 'en': 'Ginza' },
        type: 'station',
        location: 'POINT(139.7665 35.6712)',
        geohash: 'xn76u',
        is_hub: true,
        zone: 'core',
        source_dataset: 'odpt_seed'
    },
    {
        id: 'odpt:Station:TokyoMetro.Kyobashi',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '京橋', 'ja': '京橋', 'en': 'Kyobashi' },
        type: 'station',
        location: 'POINT(139.7702 35.6766)',
        geohash: 'xn76u',
        is_hub: false,
        zone: 'core',
        source_dataset: 'odpt_seed'
    },
    {
        id: 'odpt:Station:TokyoMetro.Mitsukoshimae',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '三越前', 'ja': '三越前', 'en': 'Mitsukoshimae' },
        type: 'station',
        location: 'POINT(139.7738 35.6856)',
        geohash: 'xn76u',
        is_hub: false,
        zone: 'core',
        source_dataset: 'odpt_seed'
    },
    {
        id: 'odpt:Station:JR-East.Kanda',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '神田', 'ja': '神田', 'en': 'Kanda' },
        type: 'station',
        location: 'POINT(139.7707 35.6917)',
        geohash: 'xn77k',
        is_hub: true,
        zone: 'core',
        source_dataset: 'odpt_seed'
    },
    // Asakusa Line - Chuo
    {
        id: 'odpt:Station:Toei.HigashiGinza',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '東銀座', 'ja': '東銀座', 'en': 'Higashi-ginza' },
        type: 'station',
        location: 'POINT(139.7675 35.6694)',
        geohash: 'xn76u',
        is_hub: false,
        zone: 'core',
        source_dataset: 'odpt_seed'
    },
    {
        id: 'odpt:Station:Toei.Nihombashi',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '日本橋', 'ja': '日本橋', 'en': 'Nihombashi' },
        type: 'station',
        location: 'POINT(139.7745 35.6812)',
        geohash: 'xn76u',
        is_hub: true,
        zone: 'core',
        source_dataset: 'odpt_seed'
    },
    {
        id: 'odpt:Station:Toei.Ningyocho',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '人形町', 'ja': '人形町', 'en': 'Ningyocho' },
        type: 'station',
        location: 'POINT(139.7821 35.6865)',
        geohash: 'xn77k',
        is_hub: false,
        zone: 'core',
        source_dataset: 'odpt_seed'
    },
    {
        id: 'odpt:Station:Toei.HigashiNihombashi',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '東日本橋', 'ja': '東日本橋', 'en': 'Higashi-nihombashi' },
        type: 'station',
        location: 'POINT(139.7853 35.6922)',
        geohash: 'xn77k',
        is_hub: false,
        zone: 'core',
        source_dataset: 'odpt_seed'
    },
    // Taito Ward
    {
        id: 'odpt:Station:TokyoMetro.Asakusa',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '淺草', 'ja': '浅草', 'en': 'Asakusa' },
        type: 'station',
        location: 'POINT(139.7967 35.7106)',
        geohash: 'xn77k',
        is_hub: true,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'traditional_hub'
    },
    {
        id: 'odpt:Station:Toei.Kuramae',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '藏前', 'ja': '蔵前', 'en': 'Kuramae' },
        type: 'station',
        location: 'POINT(139.7905 35.7050)',
        geohash: 'xn77k',
        is_hub: false,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'coffee_craft'
    },
    {
        id: 'odpt:Station:JR-East.Okachimachi',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '御徒町', 'ja': '御徒町', 'en': 'Okachimachi' },
        type: 'station',
        location: 'POINT(139.7752 35.7075)',
        geohash: 'xn77k',
        is_hub: false,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'market_busy'
    },
    {
        id: 'odpt:Station:JR-East.Uguisudani',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '鶯谷', 'ja': '鶯谷', 'en': 'Uguisudani' },
        type: 'station',
        location: 'POINT(139.7788 35.7225)',
        geohash: 'xn77k',
        is_hub: false,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'retro_hotel'
    },
    {
        id: 'odpt:Station:Toei.Asakusabashi',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '淺草橋', 'ja': '浅草橋', 'en': 'Asakusabashi' },
        type: 'station',
        location: 'POINT(139.7865 35.6974)',
        geohash: 'xn77k',
        is_hub: false,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'craft_wholesale'
    },
    {
        id: 'odpt:Station:TokyoMetro.Tawaramachi',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '田原町', 'ja': '田原町', 'en': 'Tawaramachi' },
        type: 'station',
        location: 'POINT(139.7892 35.7107)',
        geohash: 'xn77k',
        is_hub: false,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'kitchenware'
    },
    {
        id: 'odpt:Station:TokyoMetro.Iriya',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '入谷', 'ja': '入谷', 'en': 'Iriya' },
        type: 'station',
        location: 'POINT(139.7850 35.7208)',
        geohash: 'xn77k',
        is_hub: false,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'shitamachi_market'
    },
    {
        id: 'odpt:Station:TokyoMetro.Inaricho',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '稻荷町', 'ja': '稲荷町', 'en': 'Inaricho' },
        type: 'station',
        location: 'POINT(139.7825 35.7115)',
        geohash: 'xn77k',
        is_hub: false,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'quiet_temple'
    },
    {
        id: 'odpt:Station:TokyoMetro.Minowa',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '三之輪', 'ja': '三ノ輪', 'en': 'Minowa' },
        type: 'station',
        location: 'POINT(139.7914 35.7296)',
        geohash: 'xn77k',
        is_hub: false,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'retro_tram'
    },
    {
        id: 'odpt:Station:Toei.ShinOkachimachi',
        city_id: 'tokyo_core',
        name: { 'zh-TW': '新御徒町', 'ja': '新御徒町', 'en': 'Shin-Okachimachi' },
        type: 'station',
        location: 'POINT(139.7868 35.7071)',
        geohash: 'xn77k',
        is_hub: true,
        zone: 'core',
        source_dataset: 'odpt_seed',
        vibe: 'retro_arcade'
    }
];

export async function seedNodes() {
    console.log('Seeding Nodes...');

    for (const node of SEED_NODES) {
        const { error } = await supabaseAdmin
            .from('nodes')
            .upsert({
                ...node,
                updated_at: new Date().toISOString()
            });

        if (error) {
            console.error(`Error seeding node ${node.id}:`, error);
        } else {
            console.log(`Seeded node ${node.id}`);
        }
    }
}
