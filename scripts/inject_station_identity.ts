import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

const STATIONS = [
    {
        name_en: 'Akihabara',
        vibe_tags: ['Anime Capital', 'Gadgets', 'Maid Cafes', 'Electric Town'],
        description: {
            en: "The world's center for anime, manga, and electronics. A neon-lit district buzzing with energy.",
            ja: "世界的に有名な電気街であり、アニメ、マンガ、ゲームの聖地。メイドカフェやサブカルチャー店舗が密集するエネルギー溢れる街。",
            zh: "全球動漫與電器迷的聖地。霓虹燈閃爍的街道上充滿了最新的電子產品、同人誌與女僕咖啡廳，是東京次文化的能量中心。"
        },
        color: '#00B345' // JR Green
    },
    {
        name_en: 'Ueno',
        vibe_tags: ['Pandas', 'Museums', 'Ameyoko Market', 'Park Life'],
        description: {
            en: "A cultural hub featuring a massive park, zoo, and museums, bordered by a vibrant street market.",
            ja: "広大な公園、動物園、多数の美術館が集まる文化の街。高架下には活気あるアメ横商店街が広がる。",
            zh: "文化與庶民生活的交匯點。擁有著名的上野公園、熊貓動物園與眾多美術館，旁邊則是充滿昭和風情、熱鬧非凡的阿美橫丁市場。"
        },
        color: '#FF5800' // Ginza Orange
    },
    {
        name_en: 'Tokyo',
        vibe_tags: ['Bullet Train Hub', 'Imperial Palace', 'Historic Brick', 'Business'],
        description: {
            en: "The historic gateway to Japan. A marvel of red-brick architecture and the center of the rail network.",
            ja: "日本の玄関口。美しい赤レンガ駅舎と近代的なオフィス街が融合し、皇居にも隣接する交通の要衝。",
            zh: "日本的中央玄關。以復古紅磚站舍聞名，周邊是現代化的丸之內商業區與莊嚴的皇居，是歷史與現代的完美融合。"
        },
        color: '#E60012' // Marunouchi Red
    }
];

async function updateIdentity() {
    console.log('Starting Identity Injection...');

    for (const station of STATIONS) {
        console.log(`Updating ${station.name_en}...`);

        // Update logic: Find nodes where name->>en is the station name
        // We update 'vibe_tags', 'description' (if column exists? Schema showed 'facility_profile' etc, let's assume 'description' or I need to put in 'facility_profile'?)
        // Wait, Schema output earlier: "facility_profile": null, "vibe_tags": null.
        // Did checking schema show 'description'?
        // "name": {...}, "node_type":... "transit_lines":...
        // Schema dump did NOT show 'description' at top level.
        // It showed "facility_profile".

        // Let's assume description goes into `facility_profile` or `vibe_tags` or maybe I missed it in the log output?
        // Let me re-read the log output from step 1575.
        // Log: "id", "parent_hub_id", "city_id", "name", "name_short", "coordinates", "node_type", "facility_profile", "vibe_tags", "persona_prompt", "commercial_rules", "transit_lines", "is_active"...
        // No "description" column!
        // But `debug_nodes.ts` previously tried to log `node.description`. That was my assumption.

        // So where does description go?
        // Likely inside `facility_profile` (JSON) or `vibe_tags` (JSON).
        // Or maybe I should add a `description` column?
        // For now, I will put description inside `facility_profile` -> `description`.
        // And `visual_style` doesn't exist?
        // Wait, log: "vibe_tags": null, "persona_prompt": null.
        // Re-reading log output...
        // Ah, I don't see `visual_style` in the log output either!
        // Step 1548 code had `console.log('Description:', node.description...)`
        // Step 1553 failed with TS error.
        // Step 1557 failed with column error.
        // Step 1575 payload output showed NO `description` and NO `visual_style`.

        // CRITICAL: The Schema doesn't have `description` or `visual_style`.
        // I must put them in `facility_profile` (JSONB) or create columns.
        // Modifying schema in "Execution" phase is risky but maybe necessary.
        // OR, I check if `facility_profile` is the intended place.
        // Given the user wants "L1 Visual", I probably need to store color somewhere.

        // Let's verify if `facility_profile` is used for this.
        // Or maybe the frontend expects `visual_style` but the DB doesn't have it?
        // If frontend expects it, fetching `*` should have returned it if it existed.
        // It didn't.
        // So Frontend L1 Map probably uses `transit_lines` to infer color.

        // FIX: I will put the data into `facility_profile` and ensure `vibe_tags` is populated.
        // { "description": {en, ja, zh}, "visual": { "color": "..." } }

        const profile = {
            description: station.description,
            visual: { color: station.color }
        };

        const { error } = await supabase
            .from('nodes')
            .update({
                vibe_tags: station.vibe_tags,
                facility_profile: profile
            })
            .eq('name->>en', station.name_en); // JSON filter syntax might vary in JS client

        // .eq('name->>en', ...) is not supported directly in supabase-js usually.
        // We use .filter('name->>en', 'eq', station.name_en)

        const { error: matchError } = await supabase
            .from('nodes')
            .update({
                vibe_tags: station.vibe_tags,
                facility_profile: profile
            })
            .filter('name->>en', 'eq', station.name_en);

        if (matchError) console.error(`Error updating ${station.name_en}:`, matchError);
        else console.log(`Updated ${station.name_en}`);
    }
}

updateIdentity();
