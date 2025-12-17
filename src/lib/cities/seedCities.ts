import { supabaseAdmin } from '../supabase';

const SEED_CITIES = [
    {
        id: 'tokyo_core',
        name: { "zh-TW": "東京都心", "ja": "東京都心", "en": "Central Tokyo" },
        zone_type: 'core',
        config: {
            features: { hasSubway: true, hasSharedMobility: true, hasTaxiIntegration: true }
        }
    },
    {
        id: 'tokyo_buffer',
        name: { "zh-TW": "東京周邊", "ja": "東京周辺", "en": "Greater Tokyo" },
        zone_type: 'buffer',
        parent_city_id: 'tokyo_core',
        config: {
            features: { hasSubway: true, hasSharedMobility: false, hasTaxiIntegration: false }
        }
    }
];

export async function seedCities() {
    console.log('Seeding Cities...');

    for (const city of SEED_CITIES) {
        const { error } = await supabaseAdmin
            .from('cities')
            .upsert(city);

        if (error) {
            console.error(`Error seeding city ${city.id}:`, error);
        } else {
            console.log(`Seeded city ${city.id}`);
        }
    }
}
