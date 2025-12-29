import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

const OMOTESANDO_DATA = {
    id: 'odpt:Station:TokyoMetro.Omotesando',
    city_id: 'tokyo_core',
    name: { 'zh-TW': '表參道', 'ja': '表参道', 'en': 'Omotesando' },
    node_type: 'station',
    coordinates: 'POINT(139.7126 35.6653)', // PostGIS geography
    parent_hub_id: null,
    transit_lines: ['TokyoMetro.Ginza', 'TokyoMetro.Chiyoda', 'TokyoMetro.Hanzomon'],
    is_active: true
};

const IDENTITY_DATA = {
    name_ja: '表参道',
    tags: ['High Fashion', 'Architecture', 'Tree-lined Avenue'],
    tips: {
        en: "Cross-platform transfer is possible between Ginza and Hanzomon lines in the same direction.",
        ja: "銀座線と半蔵門線は同じ方向であれば同じホームで乗り換えが可能です。",
        zh: "銀座線與半藏門線如果是相同方向，可以在同一個月台進行轉乘，非常方便。"
    }
};

async function fixOmotesando() {
    console.log('Checking for Omotesando in nodes table...');

    const { data: existing, error: checkError } = await supabase
        .from('nodes')
        .select('id')
        .eq('id', OMOTESANDO_DATA.id)
        .single();

    if (checkError && checkError.code !== 'PGRST116') {
        console.error('Check error:', checkError);
        return;
    }

    if (existing) {
        console.log('✅ Omotesando already exists in nodes table.');
    } else {
        console.log('❌ Omotesando missing. Attempting to insert...');

        // Ensure city_id exists or map to a known one
        const { data: cityExists } = await supabase
            .from('cities')
            .select('id')
            .eq('id', OMOTESANDO_DATA.city_id)
            .single();

        if (!cityExists) {
            console.warn(`⚠️ City '${OMOTESANDO_DATA.city_id}' not found. Defaulting to 'tokyo_chiyoda'.`);
            OMOTESANDO_DATA.city_id = 'tokyo_chiyoda'; // Fallback
        }

        const { error: insertError } = await supabase
            .from('nodes')
            .insert([{
                id: OMOTESANDO_DATA.id,
                city_id: OMOTESANDO_DATA.city_id,
                name: OMOTESANDO_DATA.name,
                node_type: OMOTESANDO_DATA.node_type,
                coordinates: OMOTESANDO_DATA.coordinates,
                parent_hub_id: OMOTESANDO_DATA.parent_hub_id,
                transit_lines: OMOTESANDO_DATA.transit_lines,
                is_active: OMOTESANDO_DATA.is_active
            }]);

        if (insertError) {
            console.error('❌ Insert error:', insertError);
            return;
        }
        console.log('✅ Omotesando inserted successfully.');
    }

    console.log('Injecting Identity Data...');
    const { error: identityError } = await supabase
        .from('nodes')
        .update({
            vibe_tags: IDENTITY_DATA.tags,
            facility_profile: {
                transit_tips: IDENTITY_DATA.tips
            }
        })
        .eq('id', OMOTESANDO_DATA.id);

    if (identityError) {
        console.error('❌ Identity injection error:', identityError);
    } else {
        console.log('✅ Identity data injected for Omotesando.');
    }
}

fixOmotesando();
