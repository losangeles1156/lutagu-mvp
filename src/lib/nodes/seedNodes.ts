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
