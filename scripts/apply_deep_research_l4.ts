
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const stationData: Record<string, any> = {
    "odpt:Station:JR-East.Tokyo": {
        traps: [
            {
                icon: "🚶",
                title: { ja: "京葉線は「別の駅」", zh: "京葉線是「另一個車站」", en: "Keiyo Line is far" },
                description: {
                    ja: "他のJR線・新幹線ホームから京葉線ホームまでは徒歩15〜20分かかります。",
                    zh: "從其他 JR 線或新幹線月台步行至京葉線月台需 15-20 分鐘。",
                    en: "Walking to the Keiyo Line platform from other JR or Shinkansen lines takes 15-20 minutes."
                },
                advice: {
                    ja: "「南のりかえ口」を目指し、動く歩道「ベイロード」を活用してください。",
                    zh: "請往「南轉乘口」方向走，並利用「Bay Road」電動步道。",
                    en: "Head toward the 'South Transfer Gate' and use the 'Bay Road' moving walkways."
                }
            },
            {
                icon: "🧭",
                title: { ja: "丸の内 vs 八重洲", zh: "丸之內 vs 八重洲", en: "Marunouchi vs Yaesu" },
                description: {
                    ja: "丸の内側（西側）と八重洲側（東側）を間違えると、移動にかなりの時間がかかります。",
                    zh: "若混淆了西側（丸之內）與東側（八重洲），跨越車站將花費大量時間。",
                    en: "Mistaking the West (Marunouchi) and East (Yaesu) sides can waste a lot of time."
                },
                advice: {
                    ja: "新幹線は八重洲側、地下鉄丸ノ内線は丸の内側にあります。",
                    zh: "新幹線多位於八重洲側，地下鐵丸之內線則在丸之內側。",
                    en: "Shinkansen platforms are on the Yaesu side; the Marunouchi subway is on the Marunouchi side."
                }
            }
        ],
        hacks: [
            {
                icon: "㊙️",
                title: { ja: "有楽町駅乗り換えの裏技", zh: "有樂町站轉乘秘技", en: "Yurakucho Transfer Hack" },
                description: {
                    ja: "京葉線から山手線（品川方面）へは、東京駅の京葉地下丸の内口を出て有楽町駅の京橋口へ歩く方が早いです。",
                    zh: "從京葉線轉乘山手線（往品川方向），從東京站「京葉地下丸之內口」出站後步行至有樂町站「京橋口」更快。",
                    en: "To transfer from Keiyo Line to Yamanote (toward Shinagawa), exit via Keiyo Marunouchi gate and walk to Yurakucho Station's Kyobashi gate."
                },
                advice: {
                    ja: "改札で駅員に「有楽町駅への乗り換え」と伝えて証明書をもらってください。",
                    zh: "請務必告知改札站員要「轉乘至有樂町站」以取得轉乘證明（Suica 亦適用）。",
                    en: "Inform the gate staff you are transferring to Yurakucho to get a transfer slip (also works with IC cards)."
                }
            },
            {
                icon: "🚇",
                title: { ja: "日比谷線ユーザーは八丁堀で", zh: "日比谷線乘客請在八丁堀轉乘", en: "Use Hatchobori for Hibiya Line" },
                description: {
                    ja: "日比谷線から京葉線へ行くなら、東京駅まで行かずに八丁堀駅で乗り換えるのが正解です。",
                    zh: "若要從日比谷線轉乘京葉線，建議在八丁堀站轉乘，可避開東京站內漫長的步行。",
                    en: "If using the Hibiya Line, transfer to the Keiyo Line at Hatchobori instead of navigating Tokyo Station."
                }
            }
        ],
        facilities: [
            { icon: "🔔", title: { ja: "銀の鈴広場", zh: "銀之鈴廣場", en: "Silver Bell" }, description: { ja: "東京駅定番の待ち合わせ場所。B1F改札内にあります。", zh: "東京站經典的相約地點。位於 B1F 改札內。", en: "Classic meeting spot in Tokyo Station. Located in B1F inside gates." } }
        ]
    },
    "odpt:Station:JR-East.Ueno": {
        traps: [
            {
                icon: "🎫",
                title: { ja: "地下鉄乗り換えは一度改札を出る", zh: "地下鐵轉乘需出改札", en: "Subway transfer requires exit" },
                description: {
                    ja: "銀座線と日比谷線上野駅の間は、同じメトロでも一度改札を出て歩く必要があります。",
                    zh: "銀座線與日比谷線上野站之間轉乘，雖然同屬東京 Metro，仍需先出改札口再步行一段距離。",
                    en: "Transferring between Ginza and Hibiya Lines at Ueno requires exiting and re-entering ticket gates."
                }
            }
        ],
        hacks: [
            {
                icon: "🥈",
                title: { ja: "日比谷線のベスト乗車位置", zh: "日比谷線最佳車廂", en: "Best car for Hibiya Line" },
                description: {
                    ja: "日比谷線からJRへの乗り換えは、中目黒方面なら2号車後方が「昭和通り北方面改札」に近くて便利です。",
                    zh: "往中目黑方向的日比谷線，乘客選擇第 2 節車廂後方下車最靠近「昭和通北改札」。",
                    en: "For Hibiya Line (toward Nakameguro), car 2 rear is closest to the Showa-dori North gate for JR transfers."
                }
            }
        ]
    },
    "odpt:Station:JR-East.Ikebukuro": {
        traps: [
            {
                icon: "🔄",
                title: { ja: "西武は東、東武は西", zh: "西武在東，東武在西", en: "Seibu is East, Tobu is West" },
                description: {
                    ja: "西武百貨店は「東口」、東武百貨店は「西口」にあります。逆に行かないよう注意！",
                    zh: "西武百貨位於「東口」，東武百貨則位於「西口」。這是池袋最經典的迷路陷阱。",
                    en: "Seibu Department store is at the East exit, and Tobu is at the West exit. Don't mix them up!"
                }
            }
        ],
        hacks: [
            {
                icon: "🚶",
                title: { ja: "中央通路が万能", zh: "中央通路最萬能", en: "Central passage is best" },
                description: {
                    ja: "JRから丸ノ内線・副都心線への乗り換えは「中央通路」を使うのが最短ルートです。",
                    zh: "從 JR 轉乘丸之內線或副都心線，走「中央通路」是最短路徑。",
                    en: "Use the 'Central Passage' for the shortest route between JR and Marunouchi/Fukutoshin lines."
                }
            }
        ]
    },
    "odpt:Station:JR-East.Shinjuku": {
        traps: [
            {
                icon: "⚠️",
                title: { ja: "南口と新南口の間違い", zh: "南口與新南口的區別", en: "South vs New South Gate" },
                description: {
                    ja: "「南口」と「新南口」は甲州街道を挟んで反対側です。間違えると信号を渡る必要があります。",
                    zh: "「南口」與「新南口」隔著甲州街道，若出口選錯，需過長綠燈馬路才能回到另一側。",
                    en: "South and New South gates are on opposite sides of Koshu-kaido. Picking the wrong one requires a long detour."
                }
            }
        ],
        hacks: [
            {
                icon: "🚇",
                title: { ja: "大江戸線へは「京王新線」を目指せ", zh: "往大江戶線請找「京王新線」", en: "Follow 'Keio New Line' for Oedo" },
                description: {
                    ja: "都營大江戸線は地下深く、場所も離れています。「京王新線」の案内表示に従うと辿り着けます。",
                    zh: "都營大江戶線新宿站位置極深且偏遠。跟隨「京王新線」的指標走是找到它的最快方法。",
                    en: "The Oedo Line is deep and far. Following the 'Keio New Line' signs is the most reliable way to reach it."
                }
            }
        ]
    },
    "odpt:Station:TokyoMetro.Asakusa": {
        traps: [
            {
                icon: "🚶",
                title: { ja: "つくばエクスプレス浅草駅は遠い", zh: "筑波快線淺草站非常遠", en: "TX Asakusa is far" },
                description: {
                    ja: "銀座線・都営浅草線の浅草駅から、つくばエクスプレス(TX)の浅草駅までは徒歩約10分(800m)離れています。",
                    zh: "從銀座線或都營淺草線的出入口步行至「筑波快線 (TX)」的淺草站約需 10 分鐘（800公尺）。",
                    en: "TX Asakusa station is about 800m (10 min walk) away from the Tokyo Metro/Toei Asakusa stations."
                },
                advice: {
                    ja: "TXを利用する場合は、TX浅草駅に近い『田原町駅』から歩くのも一つの手です。",
                    zh: "若要前往 TX 淺草站周邊，考慮從鄰近的『田原町站』步行有時甚至更方便。",
                    en: "Consider walking from Tawaramachi station if your destination is near TX Asakusa."
                }
            }
        ],
        hacks: [
            {
                icon: "🏘️",
                title: { ja: "雨の日は新仲見世通りを", zh: "雨天請走新仲見世通", en: "Use Shin-Nakamise Arcade on rainy days" },
                description: {
                    ja: "銀座線側からTX側へ歩く際、新仲見世通りのアーケードを通れば雨を避けて移動できます。",
                    zh: "從銀座線側移動至 TX 側時，穿過「新仲見世通」商店街可以全程避雨。",
                    en: "Use the Shin-Nakamise covered arcade to stay dry when walking between the two Asakusa station areas."
                }
            }
        ]
    }
};

async function apply() {
    for (const [id, knowledge] of Object.entries(stationData)) {
        console.log(`Processing entry for ${id}...`);

        // 1. Get the station name from the reference node
        const { data: refNode } = await supabase
            .from('nodes')
            .select('name')
            .eq('id', id)
            .single();

        if (refNode?.name?.ja) {
            console.log(`   - Found ja name: ${refNode.name.ja}. Updating all matching nodes via SQL...`);
            // Use RPC or raw SQL via Supabase (since we don't have a direct raw SQL method in JS client, we use filter with correct syntax)
            // The syntax name->>ja is correct for postgres, but JS client might need different approach.
            // Let's try .contains if name is JSONB
            // const { error, count } = await supabase.from('nodes').update({ riding_knowledge: knowledge }).contains('name', { ja: refNode.name.ja });

            // Actually, let's use a simpler approach: update by name string if name was a string, but it's JSON.
            // Using rpc is also an option. But I'll stick to a more standard filter that usually works:
            const { error, count } = await supabase
                .from('nodes')
                .update({ riding_knowledge: knowledge })
                .eq('name->ja', refNode.name.ja);

            if (error) {
                console.error(`❌ Failed to update name ${refNode.name.ja}:`, error.message);
            } else {
                console.log(`   ✅ Updated ${count || 0} nodes with name ${refNode.name.ja}`);
            }
        } else {
            // Fallback to strict ID if name not found
            const { error } = await supabase
                .from('nodes')
                .update({ riding_knowledge: knowledge })
                .eq('id', id);
            if (error) console.error(`❌ Failed to update ID ${id}:`, error.message);
        }
    }
    console.log("Done!");
}

apply();
