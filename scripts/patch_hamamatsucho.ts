import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

async function patch() {
    const id = 'odpt:Station:JR-East.Hamamatsucho';
    const tags = ['Haneda Monorail', 'Tokyo Tower View', 'Zojo-ji', 'Garden'];
    const tips = {
        en: "Easiest transfer to Haneda Airport Monorail. Walkable to Tokyo Tower and Zojo-ji Temple.",
        ja: "羽田空港モノレールへの乗り換えが最もスムーズ。東京タワーや増上寺へも徒歩圏内。",
        zh: "轉乘羽田機場單軌電車最方便的一站。步行可達東京鐵塔與增上寺。"
    };

    // Get current profile first
    const { data, error } = await supabase.from('nodes').select('facility_profile').eq('id', id).single();
    if (error) { console.error(error); return; }

    const newProfile = { ...data.facility_profile, transit_tips: tips };

    const { error: updateError } = await supabase
        .from('nodes')
        .update({ vibe_tags: tags, facility_profile: newProfile })
        .eq('id', id);

    if (updateError) console.error(updateError);
    else console.log(`✅ Patched ${id}`);
}

patch();
