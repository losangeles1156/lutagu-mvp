import { supabaseAdmin } from '../supabase';
import { generateVibeTags } from '../nodes/facilityProfileCalculator';

const SEED_PROFILES = [
    {
        node_id: 'odpt:Station:TokyoMetro.Ueno',
        category_counts: {
            shopping: 23,
            dining: 18,
            medical: 5,
            education: 2,
            leisure: 8,
            finance: 3
        }
    },
    {
        node_id: 'odpt:Station:JR-East.Akihabara',
        category_counts: {
            shopping: 45, // Electronics shops
            dining: 20,
            medical: 2,
            education: 1,
            leisure: 30, // Maid cafes, game centers
            finance: 2
        }
    },
    {
        node_id: 'odpt:Station:JR-East.Tokyo',
        category_counts: {
            shopping: 40,
            dining: 35,
            medical: 5,
            education: 0,
            leisure: 5,
            finance: 15
        }
    }
];

export async function seedL1Profiles() {
    console.log('Seeding L1 Profiles...');

    for (const profile of SEED_PROFILES) {
        const vibeTags = generateVibeTags(profile.category_counts);

        const { error } = await supabaseAdmin
            .from('node_facility_profiles')
            .upsert({
                node_id: profile.node_id,
                radius_meters: 50,
                category_counts: profile.category_counts,
                vibe_tags: vibeTags,
                data_source: 'manual_seed_mvp',
                calculated_at: new Date().toISOString()
            });

        if (error) {
            console.error(`Error seeding ${profile.node_id}:`, error);
        } else {
            console.log(`Seeded ${profile.node_id} with tags: ${vibeTags.join(', ')}`);
        }
    }
}
