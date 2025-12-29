import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

const STATIONS_DATA = [
    {
        name_ja: '東京',
        tags: ['Red Brick Station', 'Zero Mile', 'Bullet Train Hub', 'Imperial Palace'],
        tips: {
            en: "The central hub. Use Marunouchi signage for the historic red brick side and Imperial Palace. Use Yaesu side for Shinkansen and Highway Buses.",
            ja: "日本の交通の中心。丸の内口は赤レンガ駅舎と皇居側、八重洲口は新幹線と高速バス乗り場側です。",
            zh: "東京的中央樞紐。丸之內口通往歷史悠久的紅磚站舍與皇居，八重洲口則連接著新幹線月台與高速巴士站。"
        }
    },
    {
        name_ja: '上野',
        tags: ['Museums', 'Pandas', 'Ameyoko Market', 'Park Life'],
        tips: {
            en: "Use 'Park Gate' for Ueno Zoo and Museums (hilltop). Use 'Central Gate' or 'Shinobazu' for Ameyoko market (street level). Note: Keisei Ueno (Skyliner) is a separate building nearby.",
            ja: "動物園・美術館は「公園口」へ。アメ横は「中央改札」か「不忍口」が便利。京成上野駅（スカイライナー）は少し離れた別建物です。",
            zh: "前往動物園與美術館請走「公園口」（山上）。阿美橫丁請走「中央改札」或「不忍口」（平地）。注意：京成上野站（搭乘Skyliner）是獨立的建築物。"
        }
    },
    {
        name_ja: '秋葉原',
        name_en: 'Akihabara',
        tags: ['Anime Capital', 'Gadgets', 'Maid Cafes', 'Electric Town'],
        tips: {
            en: "Electric Town Exit for anime shops/maid cafes. Central Gate for Yodobashi Camera. Transfers between JR and Tsukuba Express can take time.",
            ja: "電気街口はアニメ・メイドカフェ方面。中央改札はヨドバシカメラ直結。つくばエクスプレスへの乗り換えは少し歩きます。",
            zh: "電器街口通往動漫店與女僕咖啡廳。中央改札口直達Yodobashi Camera。JR轉乘筑波快線需要步行一段距離。"
        }
    },
    {
        name_ja: '浅草',
        name_en: 'Asakusa',
        tags: ['Senso-ji Temple', 'Kaminarimon', 'Old Tokyo', 'Rickshaws'],
        tips: {
            en: "Complex of 4 different stations! For Kaminarimon/Senso-ji, Ginza Line Exit 1 is closest. Tobu Asakusa is in the department store.",
            ja: "4つの「浅草駅」があります！雷門・浅草寺へは銀座線1番出口が最短。東武浅草駅はデパート直結です。",
            zh: "這裡有四個不同的「浅草站」！前往雷門與浅草寺，銀座線1號出口最近。東武浅草站位於百貨公司內。"
        }
    },
    {
        name_ja: '新橋',
        name_en: 'Shimbashi',
        tags: ['Salaryman Hub', 'Izakaya', 'Yurikamome', 'Steam Train'],
        tips: {
            en: "Gateway to Odaiba via Yurikamome Line. The 'SL Plaza' (steam train) is a famous meeting spot. Packed with casual izakayas under the tracks.",
            ja: "お台場への玄関口（ゆりかもめ）。SL広場は有名な待ち合わせ場所。ガード下にはサラリーマン憩いの居酒屋が多数。",
            zh: "前往台場（百合海鷗號）的轉乘點。SL廣場（蒸氣火車）是著名的集合點。高架橋下充滿了上班族喜愛的居酒屋。"
        }
    },
    {
        name_ja: '浜松町',
        name_en: 'Hamamatsucho',
        tags: ['Haneda Monorail', 'Tokyo Tower View', 'Zojo-ji', 'Garden'],
        tips: {
            en: "Easiest transfer to Haneda Airport Monorail. Walkable to Tokyo Tower and Zojo-ji Temple.",
            ja: "羽田空港モノレールへの乗り換えが最もスムーズ。東京タワーや増上寺へも徒歩圏内。",
            zh: "轉乘羽田機場單軌電車最方便的一站。步行可達東京鐵塔與增上寺。"
        }
    },
    {
        name_ja: '銀座',
        tags: ['Luxury Shopping', 'High Fashion', 'Art Galleries', 'Kabuki'],
        tips: {
            en: "A maze connecting Ginza, Marunouchi, and Hibiya lines. Chuo-dori street becomes a pedestrian paradise on weekends (no cars).",
            ja: "銀座・丸ノ内・日比谷線が交差する地下迷宮。週末の中央通りは歩行者天国になります。",
            zh: "連接銀座、丸之內、日比谷線的地下迷宮。週末時中央通會封路成為步行者天國。"
        }
    },
    {
        name_ja: '築地',
        tags: ['Outer Market', 'Sushi Breakfast', 'Seafood', 'Temple'],
        tips: {
            en: "The wholesale market moved, but the 'Outer Market' is alive and buzzing with food stalls! Best visited in the morning for fresh sushi.",
            ja: "市場機能は豊洲へ移転しましたが「場外市場」は健在！新鮮な寿司や食べ歩きを楽しむなら朝がおすすめ。",
            zh: "雖然批發市場已移至豐洲，但「場外市場」依然熱鬧非凡！想吃新鮮壽司或街頭美食，建議早上前往。"
        }
    },
    {
        name_ja: '六本木',
        tags: ['Art Triangle', 'Nightlife', 'Roppongi Hills', 'International'],
        tips: {
            en: "Oedo Line platform is extremely deep underground. Home to major museums (Mori Art, National Art Center) and vibrant nightlife.",
            ja: "大江戸線のホームは地下深くにあるので注意。森美術館や国立新美術館などアート拠点と、ナイトライフの中心地。",
            zh: "大江戶線月台位於極深地下，請預留時間。這裡是森美術館、國立新美術館等藝術據點與夜生活的中心。"
        }
    },
    {
        name_ja: '霞ケ関',
        tags: ['Government District', 'Ministries', 'Hibiya Park', 'Power Center'],
        tips: {
            en: "The bureaucratic heart of Japan. Very quiet on weekends. Key transfer hub for Chiyoda, Hibiya, and Marunouchi lines.",
            ja: "日本の官公庁街の中心。週末は非常に静かです。千代田・日比谷・丸ノ内線の主要な乗り換えハブ。",
            zh: "日本行政中樞，週末非常安靜。是千代田、日比谷、丸之內線的重要轉乘樞紐。"
        }
    },
    {
        name_ja: '日本橋',
        tags: ['Road Origin', 'Financial District', 'Department Stores', 'History'],
        tips: {
            en: "Home to the 'Zero Mile Marker' of Japan's roads. A historic financial district featuring the Bank of Japan and classic department stores like Mitsukoshi.",
            ja: "日本の道路網の始点「日本国道路元標」があります。日銀本店や三越など、歴史ある金融・商業の街。",
            zh: "日本道路網的起點「道路元標」所在地。擁有日本銀行總行與三越百貨等歷史悠久的金融與商業地標。"
        }
    },
    {
        name_ja: '御茶ノ水',
        name_en: 'Ochanomizu',
        tags: ['Musical Instruments', 'Universities', 'Kanda Myojin', 'Hospitals'],
        tips: {
            en: "Famous for 'Guitar Street' and many universities. Easy cross-platform transfer between Chuo (Rapid) and Sobu (Local) lines. Closest to Kanda Myojin Shrine.",
            ja: "楽器店街と学生街として有名。「ソラシティ」などの再開発も。中央線と総武線の対面乗り換えが便利です。神田明神への最寄り駅。",
            zh: "以「樂器街」與學生街聞名。中央線快速與總武線各停可在此同月台輕鬆轉乘。距離神田明神最近的車站。"
        }
    },
    {
        name_ja: '神保町',
        tags: ['Book Town', 'Curry Capital', 'Ski Goods', 'Old Books'],
        tips: {
            en: "World's largest secondhand book district. Also famous for curry restaurants. Exit A7 is charmingly retro.",
            ja: "世界最大級の古書店街。カレーの激戦区としても有名。A7出口周辺のレトロな雰囲気が魅力。",
            zh: "世界最大規模的舊書街。同時也是著名的「咖哩激戰區」。A7出口周邊充滿復古氛圍。"
        }
    },
    {
        name_ja: '飯田橋',
        name_en: 'Iidabashi',
        tags: ['Canal Cafe', 'Kagurazaka', '5 Line Hub', 'Ramen'],
        tips: {
            en: "Junction of 5 lines. West Exit leads to the sloping, stylish streets of Kagurazaka (Little Paris). Great canal-side cafes nearby.",
            ja: "5路線が乗り入れる要衝。西口を出ると「神楽坂」の風情ある坂道が続きます。お堀沿いのカフェも人気。",
            zh: "五條路線交會的交通要衝。西口通往充滿風情的「神樂坂」（小巴黎）。護城河畔的咖啡廳非常受歡迎。"
        }
    },
    {
        name_ja: '神田',
        tags: ['Izakaya Hub', 'Salaryman Vibe', 'Craft Beer', 'Old Tokyo'],
        tips: {
            en: "Just one stop from Tokyo Station. A labyrinth of affordable izakayas and bars under the train tracks. Retains a Showa-era business vibe.",
            ja: "東京駅からわずか1駅。ガード下には安くて美味しい居酒屋がひしめき合っています。昭和のサラリーマン文化が色濃く残る街。",
            zh: "距離東京站僅一站。高架橋下聚集了無數美味且平價的居酒屋，保留著濃厚的昭和上班族文化。"
        }
    },
    {
        name_ja: '東日本橋',
        tags: ['Wholesale District', 'Textiles', 'Askusa Line Hub', 'Quiet'],
        tips: {
            en: "Historic wholesale district for clothes. Connects directly to Bakuro-yokoyama (Shinjuku Line) via underground passage.",
            ja: "歴史ある繊維問屋街。地下通路で都営新宿線の馬喰横山駅とつながっています。",
            zh: "歷史悠久的纖維批發街。可經由地下連通道前往都營新宿線的馬喰橫山站轉乘。"
        }
    }
];

async function updateFeatures() {
    console.log(`Starting Feature Injection (Enhanced) for stations...`);

    // Fetch all stations first to map names to IDs
    const { data: nodes, error } = await supabase
        .from('nodes')
        .select('id, name, facility_profile')
        .eq('node_type', 'station');

    if (error) {
        console.error('Fetch error:', error);
        return;
    }

    // Helper to normalize names for loose matching
    const norm = (s: string) => s ? s.toLowerCase().replace(/[\s-]/g, '') : '';

    for (const item of STATIONS_DATA) {
        // strict match for name_ja inside the JSON OR match english name
        const targets = nodes.filter(n => {
            if (!n.name) return false;
            if (n.name.ja === item.name_ja) return true;
            // Add English check if available
            if ('name_en' in item && item.name_en && n.name.en) {
                return norm(n.name.en) === norm(item.name_en);
            }
            return false;
        });

        if (targets.length === 0) {
            console.warn(`⚠️ Station not found: ${item.name_ja} / ${'name_en' in item ? item.name_en : ''}`);
            continue;
        }

        console.log(`Updating ${item.name_ja} (${targets.length} nodes found)...`);

        for (const target of targets) {
            // Merge new tips into existing profile
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

            if (updateError) console.error(`  ❌ Error updating ${target.id}:`, updateError);
            else console.log(`  ✅ Updated ${target.id}`);
        }
    }
}

updateFeatures();
