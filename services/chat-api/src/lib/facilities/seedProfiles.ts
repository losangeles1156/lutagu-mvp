import { supabaseAdmin } from '../supabase';
import { generateLocalizedVibeTags, calculateProfileStats } from '../nodes/facilityProfileCalculator';

const SEED_PROFILES = [
    {
        node_id: 'odpt:Station:TokyoMetro.Ueno',
        category_counts: {
            shopping: 23, dining: 18, medical: 5, education: 2, leisure: 8, finance: 3,
            accommodation: 4, nature: 5, religious: 3, business: 12
        }
    },
    {
        node_id: 'odpt:Station:JR-East.Akihabara',
        category_counts: {
            shopping: 45, dining: 20, medical: 2, education: 1, leisure: 30, finance: 2,
            accommodation: 2, nature: 1, religious: 1, business: 35
        }
    }
];

export async function seedL1Profiles() {
    console.log('Seeding L1 Profiles into Nodes (v3.0)...');

    for (const profile of SEED_PROFILES) {
        const vibeTags = generateLocalizedVibeTags(profile.category_counts as any);
        const { dominant } = calculateProfileStats(profile.category_counts as any);

        const { error } = await supabaseAdmin
            .from('nodes')
            .update({
                facility_profile: {
                    radius_meters: 200,
                    category_counts: profile.category_counts,
                    dominant_category: dominant,
                    calculated_at: new Date().toISOString()
                },
                vibe_tags: vibeTags
            })
            .eq('id', profile.node_id);

        if (error) {
            console.error(`Error updating node ${profile.node_id}:`, error);
        } else {
            console.log(`Updated ${profile.node_id} with multi-lingual vibe tags.`);
        }
    }
}
