import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

const MASS_STATIONS_DATA = [
    {
        name_ja: '三ノ輪',
        tags: ['Retro Shitamachi', 'Arakawa Tram', 'Yoshiwara History'],
        tips: {
            en: "Walking distance to Jokanji (Throw-away Temple). Historic atmosphere with narrow alleys and traditional shops.",
            ja: "「投げ込み寺」として知られる浄閑寺へは徒歩圏内。路地裏に昭和の雰囲気が残る下町です。",
            zh: "步行可達以「拋投寺」聞名的淨閑寺。巷弄中仍保留著昭和時代濃厚下町氛圍的地區。"
        }
    },
    {
        name_ja: '蔵前',
        tags: ['Brooklyn of Tokyo', 'Coffee', 'Stationery', 'Artisans'],
        tips: {
            en: "Oedo and Asakusa line station buildings are geographically separate (about 5-10 mins walk). Famous for curated stationery and specialty coffee.",
            ja: "都営大江戸線と浅草線の駅は地上を5〜10分ほど歩く必要があります。文房具やカフェ巡りに最適。",
            zh: "都營大江戶線與淺草線的站體是分開的，轉乘需在地面步行5至10分鐘。以原創設計文具與精品咖啡聞名。"
        }
    },
    {
        name_ja: '人形町',
        tags: ['Edo Atmosphere', 'Traditional Sweets', 'Dolls'],
        tips: {
            en: "Catch the mechanical puppet clocks at 11am-7pm on the hour. Famous for Amazake Yokocho and traditional snacks.",
            ja: "11時から19時の正午に動く、からくり時計が名物。甘酒横丁での食べ歩きがおすすめです。",
            zh: "上午11點至晚上7點的整點可以觀賞機關鐘表演。甘酒橫丁的人氣美食與傳統點心不容錯過。"
        }
    },
    {
        name_ja: '大手町',
        tags: ['Underground Maze', 'Business Hub', 'Imperial Palace'],
        tips: {
            en: "Massive complex. Allow 15+ mins for transfers between Mita line and others. Directly connected to Tokyo Station via underground passage.",
            ja: "日本最大の地下鉄駅。三田線と他の路線の乗り換えは非常に時間がかかるので注意。東京駅へは地下通路で直結しています。",
            zh: "全日本最大的地鐵站。三田線與其他路線的轉乘距離非常遠，請預留15分鐘以上。可經由地下連通道直達東京站。"
        }
    },
    {
        name_ja: '九段下',
        tags: ['Budokan', 'Yasukuni Shrine', 'Cherry Blossoms'],
        tips: {
            en: "Best view of Chidorigafuchi blossoms is a 5-min walk south. Hub for Chiyoda, Tozai, and Shinjuku lines.",
            ja: "千鳥ヶ淵の桜の名所へは徒歩5分。日本武道館でのイベント時は非常に混雑します。",
            zh: "距離千鳥之淵的櫻花名所步行約5分鐘。日本武道館舉辦活動時車站會非常擁擠。"
        }
    },
    {
        name_ja: '永田町',
        tags: ['Political Center', 'Complex Transfer', 'Hie Shrine'],
        tips: {
            en: "Secret underground passage to Akasaka-mitsuke (same-fare zone). The political heart of Japan with heavy security.",
            ja: "赤坂見附駅とは地下通路でつながっています。国会議事堂が近く、非常に警備が厳重なエリアです。",
            zh: "與赤坂見附站經由地下通道相連。這裡是日本的政治中樞，周邊警備維安非常嚴密。"
        }
    },
    {
        name_ja: '表参道',
        tags: ['High Fashion', 'Architecture', 'Tree-lined Avenue'],
        tips: {
            en: "Cross-platform transfer is possible between Ginza and Hanzomon lines in the same direction.",
            ja: "銀座線と半蔵門線は同じ方向であれば同じホームで乗り換えが可能です。",
            zh: "銀座線與半藏門線如果是相同方向，可以在同一個月台進行轉乘，非常方便。"
        }
    },
    {
        name_ja: '月島',
        tags: ['Monjayaki Street', 'Shitamachi Retro', 'Canals'],
        tips: {
            en: "Exit 7 leads directly to the 80+ monja restaurant street. A blend of modern high-rises and old alleys.",
            ja: "7番出口を出るとすぐに80軒以上の「もんじゃ焼き」店が並ぶ通りです。路地裏散策も魅力。",
            zh: "7號出口出來即是擁有80多間文字燒餐廳的街道。巷弄深處仍保有江戶時代的風情。"
        }
    },
    {
        name_ja: '勝どき',
        tags: ['Modern Bay View', 'Tower Mansions', 'River Walk'],
        tips: {
            en: "Iconic Kachidoki Bridge offers 360-degree city/river views. Modern residential towers with plenty of space.",
            ja: "勝どき橋からの隅田川の眺めは絶景。近年タワーマンションが急増しているモダンなベイエリアです。",
            zh: "勝鬨橋是欣賞隅田川美景的絕佳地點。這裡是近年高樓住宅林立，極具現代感的港灣區。"
        }
    },
    {
        name_ja: '赤坂見附',
        tags: ['Nightlife', 'Business Hub', 'Same-platform Transfer'],
        tips: {
            en: "Golden transfer point for Ginza/Marunouchi lines. Vibrant nightlife with many international-friendly bars.",
            ja: "銀座線と丸ノ内線の対面乗り換えができる重要拠点。駅周辺は飲食店やバーが多く、夜も賑やかです。",
            zh: "銀座線與丸之內線可在此進行同月台對面轉乘。車站周邊餐廳與酒吧林立，是充滿活力的商務與娛樂區。"
        }
    },
    {
        name_ja: '水天宮前',
        tags: ['Birth Shrine', 'T-CAT (Airport Bus)', 'Finance'],
        tips: {
            en: "Use Exit 1a for direct underground T-CAT access to Haneda/Narita airport buses. Famous birth shrine nearby.",
            ja: "東京シティエアターミナル（T-CAT）直結。羽田・成田空港へのリムジンバス利用に便利です。",
            zh: "直通東京城市航空總站（T-CAT），搭乘前往羽田、成田機場的利木津巴士非常方便。"
        }
    },
    {
        name_ja: '茅場町',
        tags: ['Tokyo Stock Exchange', 'Finance', 'History'],
        tips: {
            en: "Connecting tunnel to Nihonbashi can feel very long. Heart of Japan's securities and banking history.",
            ja: "証券街として知られるエリア。日本橋駅までの地下通路は意外と距離があるので注意してください。",
            zh: "著名證券街。與日本橋站之間的地下連通道距離較長，步行需花費一些時間。"
        }
    },
    {
        name_ja: '八丁堀',
        tags: ['Canal City', 'Keiyo Line', 'Disney Gateway'],
        tips: {
            en: "Best transfer point for JR Keiyo line to Tokyo Disney Resort. A quiet business/residential crossover.",
            ja: "JR京葉線への乗り換え駅。東京ディズニーリゾートへ向かう際の重要な拠点です。",
            zh: "轉乘JR京葉線的主要站點，是前往東京迪士尼度假區的必經轉運站。"
        }
    },
    {
        name_ja: '広尾',
        tags: ['International', 'Embassies', 'Upscale Lifestyle'],
        tips: {
            en: "Arisugawa Park is the best quiet retreat in the center. Very expat-friendly with many international supermarkets.",
            ja: "有栖川宮記念公園が近く、都内でも有数の国際的な高級住宅街。外国人向けのスーパーも充実。",
            zh: "鄰近有栖川宮紀念公園，是東京極具代表性的國際化高級住宅區。區內有多間專為外國人服務的超市。"
        }
    },
    {
        name_ja: '三越前',
        tags: ['Luxury', 'Oldest Dept Store', 'Zero Mile'],
        tips: {
            en: "Original Lion statues at Mitsukoshi are a famous meeting spot. Historic Nihonbashi area with many high-end craft shops.",
            ja: "日本橋三越本店に直結。ライオン像は定番の待ち合わせ場所。老舗の専門店が多く並ぶエリアです。",
            zh: "直通日本橋三越總店。門口的獅子像是著名的集合地點。周邊有許多江戶時代流傳至今的老舖。"
        }
    },
    {
        name_ja: '稲荷町',
        tags: ['Temples', 'Old Railway History', 'Quiet Shitamachi'],
        tips: {
            en: "Home to Shitaya Shrine, Tokyo's oldest Inari shrine. One of the quietest stops on the busy Ginza line.",
            ja: "都内最古の下谷神社があります。銀座線でも比較的静かで、仏壇店が立ち並ぶ独特な雰囲気の街です。",
            zh: "擁有都內最古老的神社「下谷神社」。銀座線上相對安靜的一站，周邊佛具店林立，氛圍獨特。"
        }
    },
    {
        name_ja: '浅草橋',
        tags: ['Doll Wholesale', 'Beads', 'Riverside Izakaya'],
        tips: {
            en: "Riverside yakatabune cruises depart from near the station. Famous for wholesale doll shops and craft materials.",
            ja: "人形やビーズの問屋街。神田川沿いからは屋形船も出ており、夜は風情ある景色が楽しめます。",
            zh: "著名的人形與珠飾批發街。鄰近神田川，可以搭乘屋形船，夜晚的河岸景色非常有情調。"
        }
    }
];

async function massUpdate() {
    console.log(`Starting Mass Identity Injection for ${MASS_STATIONS_DATA.length} stations...`);

    // Fetch all station nodes
    const { data: nodes, error } = await supabase
        .from('nodes')
        .select('id, name, facility_profile')
        .eq('node_type', 'station');

    if (error) {
        console.error('Fetch error:', error);
        return;
    }

    for (const item of MASS_STATIONS_DATA) {
        // Exact match on Japanese name
        const targets = nodes.filter(n => n.name && n.name.ja === item.name_ja);

        if (targets.length === 0) {
            console.warn(`⚠️ Station not found: ${item.name_ja}`);
            continue;
        }

        console.log(`Updating ${item.name_ja} (${targets.length} nodes found)...`);

        for (const target of targets) {
            const currentProfile = target.facility_profile || {};
            const newProfile = {
                ...currentProfile,
                transit_tips: item.tips
            };

            const { error: updateError } = await supabase
                .from('nodes')
                .update({
                    vibe_tags: item.tags,
                    facility_profile: newProfile
                })
                .eq('id', target.id);

            if (updateError) {
                console.error(`  ❌ Error updating ${target.id}:`, updateError);
            } else {
                console.log(`  ✅ Updated ${target.id}`);
            }
        }
    }

    console.log('Mass Injection Complete.');
}

massUpdate();
