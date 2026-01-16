
type DemoLang = 'ja' | 'en' | 'zh-TW' | 'zh';

export interface MultiRoundDemoScriptRound {
    roundNumber: 1 | 2 | 3;
    userMessage: Record<DemoLang, string>;
    assistantResponse: Record<DemoLang, string>;
    actions?: Array<{
        type: 'discovery' | 'navigate' | 'details' | 'process';
        label: Record<DemoLang, string>;
        target: string;
        metadata?: any;
    }>;
    pauseAfterMs?: number;
}

export interface MultiRoundDemoScript {
    id: string;
    rounds: MultiRoundDemoScriptRound[];
    mockContext: {
        time: Record<DemoLang, string>;
        weather: Record<DemoLang, string>;
    };
    userMessage: Record<DemoLang, string>;
    assistantResponse: Record<DemoLang, string>;
    actions: Array<{
        type: 'discovery' | 'navigate' | 'details' | 'process';
        label: Record<DemoLang, string>;
        target: string;
        metadata?: any;
    }>;
    node: string;
}

export const demoScripts: Record<string, MultiRoundDemoScript> = {
    overtourism: {
        id: 'overtourism',
        mockContext: {
            time: {
                ja: '土曜 15:40',
                en: 'Sat 3:40 PM',
                'zh-TW': '週六 15:40',
                zh: '周六 15:40'
            },
            weather: {
                ja: '晴れ 29°C',
                en: 'Sunny 29°C',
                'zh-TW': '晴 29°C',
                zh: '晴 29°C'
            }
        },
        rounds: [
            {
                roundNumber: 1,
                userMessage: {
                    ja: '浅草寺は人が多すぎて少し疲れます。近くで人が少なめだけど、江戸の風情を感じられる場所はありますか？',
                    en: 'Senso-ji is too crowded and overwhelming. Is there a quieter place nearby where I can still feel the Edo atmosphere?',
                    'zh-TW': '淺草寺這裡人潮多到有點不舒服，附近有沒有人少一點，但也能感受江戶風情的地方？',
                    zh: '浅草寺这里人潮多到有点不舒服，附近有没有人少一点，但也能感受江户风情的地方？'
                },
                assistantResponse: {
                    ja: '混雑を避けつつ「江戸の風情」を感じたいなら、AIが雰囲気を分析して選んだ **根津神社** がおすすめです。\n\n千本鳥居があり、浅草より落ち着いて歩けます。',
                    en: 'If you want to avoid the crowds while keeping an “Edo vibe”, I recommend **Nezu Shrine**.\n\nIt has a calm atmosphere and a beautiful torii path—much quieter than Asakusa.',
                    'zh-TW': '想避開人潮、又保留「江戶風情」的氛圍，我推薦您去 **根津神社**。\n\n這裡有紅色千本鳥居，整體更安靜、走起來也舒服很多。',
                    zh: '想避开人潮、又保留「江户风情」的氛围，我推荐你去 **根津神社**。\n\n这里有红色千本鸟居，整体更安静、走起来也舒服很多。'
                },
                pauseAfterMs: 700
            },
            {
                roundNumber: 2,
                userMessage: {
                    ja: '今の天気だと歩きやすいですか？できれば暑さを避けたいです。',
                    en: 'Is it walkable with the current weather? I’d like to avoid the heat if possible.',
                    'zh-TW': '以現在的天氣走路舒服嗎？我想盡量避開太熱。',
                    zh: '以现在的天气走路舒服吗？我想尽量避开太热。'
                },
                assistantResponse: {
                    ja: '（デモ設定）現在は **{{weather}} / {{time}}** です。暑さが気になる時間帯なので、地上の徒歩は「短め＋日陰」を優先しましょう。\n\nおすすめは、駅間だけサクッと移動してから境内でゆっくり。水分補給できる場所も合わせて提案します。',
                    en: '(Demo context) It’s **{{weather}} / {{time}}**. Since it’s warm, keep outdoor walking short and prioritize shade.\n\nI suggest a quick station-to-station hop, then a slower pace inside the shrine area. I can also line up nearby hydration stops.',
                    'zh-TW': '（Demo 情境）目前是 **{{weather}} / {{time}}**。因為偏熱，建議把戶外步行控制在「短距離＋陰影路段」，先快速移動到點位，再慢慢逛。\n\n我也可以順便把附近補水/休息點一起安排。',
                    zh: '（Demo 情境）目前是 **{{weather}} / {{time}}**。因为偏热，建议把户外步行控制在「短距离＋阴影路段」，先快速移动到点位，再慢慢逛。\n\n我也可以顺便把附近补水/休息点一起安排。'
                },
                pauseAfterMs: 800
            },
            {
                roundNumber: 3,
                userMessage: {
                    ja: '根津神社のあと、静かなカフェも寄りたいです。混む時間も避けたい。',
                    en: 'After Nezu Shrine, I’d like a quiet cafe too—and I want to avoid peak crowds.',
                    'zh-TW': '去完根津神社後我想再找安靜的咖啡廳，也想避開尖峰人潮。',
                    zh: '去完根津神社后我想再找安静的咖啡厅，也想避开尖峰人潮。'
                },
                assistantResponse: {
                    ja: '了解です。（デモ設定）今は **{{time}}** なので、混み始める前に神社→谷根千エリアへ流れるのが良いです。\n\n静かめの古民家系カフェを2つ、席の取りやすさも含めて提案します。',
                    en: 'Got it. (Demo context) Since it’s **{{time}}**, the smooth move is: shrine first, then flow into the Yanesen area before it gets busier.\n\nI’ll suggest two quieter, old-house style cafes and prioritize ones with easier seating.',
                    'zh-TW': '了解。（Demo 情境）目前是 **{{time}}**，建議先逛神社、再順勢往谷根千移動，能避開稍後更密集的人潮。\n\n我會推薦 2 間偏安靜的老宅咖啡廳，並把比較容易有位子的放前面。',
                    zh: '了解。（Demo 情境）目前是 **{{time}}**，建议先逛神社、再顺势往谷根千移动，能避开稍后更密集的人潮。\n\n我会推荐 2 间偏安静的老宅咖啡厅，并把比较容易有位子的放前面。'
                },
                actions: [
                    {
                        type: 'navigate',
                        label: { ja: '根津神社へ行く', en: 'Go to Nezu Shrine', 'zh-TW': '導航至根津神社', zh: '导航至根津神社' },
                        target: 'nezu_shrine',
                        metadata: { coordinates: [35.7202, 139.7593] }
                    },
                    {
                        type: 'discovery',
                        label: { ja: '静かなカフェ候補を見る', en: 'See quiet cafe picks', 'zh-TW': '查看安靜咖啡廳推薦', zh: '查看安静咖啡厅推荐' },
                        target: 'chat:尋找根津附近的古民家咖啡'
                    }
                ]
            }
        ],
        userMessage: {
            ja: '浅草寺は人が多すぎて少し疲れます。近くで人が少なめだけど、江戸の風情を感じられる場所はありますか？',
            en: 'Senso-ji is too crowded and overwhelming. Is there a quieter place nearby where I can still feel the Edo atmosphere?',
            'zh-TW': '淺草寺這裡人潮多到有點不舒服，附近有沒有人少一點，但也能感受江戶風情的地方？',
            zh: '浅草寺这里人潮多到有点不舒服，附近有没有人少一点，但也能感受江户风情的地方？'
        },
        assistantResponse: {
            ja: '浅草の混雑を避けたいなら、AIが雰囲気を分析して選んだ**根津神社**がおすすめです。\n\n「東京の伏見稲荷」とも呼ばれる千本鳥居があり、静かで歴史ある江戸の風情を色濃く残しています。\n\n**アクセス**：銀座線で上野広小路駅まで行き、そこからバスまたは徒歩で約15分です。浅草よりずっと静かですよ。',
            en: 'If you want to avoid the crowds, matching the "Edo Vibe", I suggest **Nezu Shrine**.\n\nIt features a stunning path of "Senbon Torii" (thousand gates) similar to Kyoto\'s Fushimi Inari, offering a serene and historic atmosphere.\n\n**Access**: Take the Ginza Line to Ueno-hirokoji Station, then it\'s a short bus ride or 15-min walk.',
            'zh-TW': '根據您對「江戶風情」與「避開人潮」的需求，我為您檢索到了最佳替代景點：**根津神社**。\n\n這裡擁有壯觀的紅色千本鳥居，被譽為「東京的伏見稻荷」，完整保留了江戶時代的靜謐與歷史感，遊客密度遠低於淺草。\n\n**交通方式**：建議從淺草站搭乘銀座線至**上野廣小路站**，再轉乘巴士或是散步約 15 分鐘即可抵達。',
            zh: '根据您对「江户风情」与「避开人潮」的需求，我为您检索到了最佳替代景点：**根津神社**。\n\n这里拥有壮观的红色千本鸟居，被誉为「东京的伏见稻荷」，完整保留了江户时代的静谧与历史感，游客密度远低于浅草。\n\n**交通方式**：建议从浅草站搭乘银座线至**上野广小路站**，再转乘巴士或是散步约 15 分钟即可抵达。'
        },
        actions: [
            {
                type: 'navigate',
                label: { ja: '根津神社へ行く', en: 'Go to Nezu Shrine', 'zh-TW': '導航至根津神社', zh: '导航至根津神社' },
                target: 'nezu_shrine',
                metadata: { coordinates: [35.7202, 139.7593] }
            },
            {
                type: 'discovery',
                label: { ja: '近くのカフェを探す', en: 'Find nearby cafes', 'zh-TW': '尋找谷根千咖啡廳', zh: '寻找谷根千咖啡厅' },
                target: 'chat:尋找根津附近的古民家咖啡'
            }
        ],
        node: 'odpt.Station:TokyoMetro.Ginza.Asakusa'
    },
    disruption: {
        id: 'disruption',
        mockContext: {
            time: {
                ja: '平日 19:10',
                en: 'Weekday 7:10 PM',
                'zh-TW': '平日 19:10',
                zh: '平日 19:10'
            },
            weather: {
                ja: '雨 6°C',
                en: 'Rain 6°C',
                'zh-TW': '雨 6°C',
                zh: '雨 6°C'
            }
        },
        rounds: [
            {
                roundNumber: 1,
                userMessage: {
                    ja: '東京駅から東京都庁へ夜景を見に行きたいのですが、中央線が大幅に遅れていると聞きました。どうすればいいですか？',
                    en: 'I want to go from Tokyo Station to the Tokyo Metropolitan Government Building for the night view, but I heard the Chuo Line is heavily delayed. What should I do?',
                    'zh-TW': '我要從東京車站去東京都廳看夜景，但聽說中央線現在大誤點，該怎麼辦？',
                    zh: '我要从东京车站去东京都厅看夜景，但听说中央线现在大误点，该怎么办？'
                },
                assistantResponse: {
                    ja: '遅延時は振替もありますが、混雑度と乗換のしんどさ（TPI）を考えると、**東京メトロ丸ノ内線**が安定です。\n\n東京→西新宿まで一本で行けて、新宿駅の乗換迷宮を避けられます。',
                    en: 'When there are major delays, the fastest route is not always the easiest. Considering congestion and **Transfer Pain Index (TPI)**, the **Marunouchi Line** is the most stable option.\n\nTokyo → Nishi-Shinjuku is a single line, avoiding Shinjuku’s transfer maze.',
                    'zh-TW': '遇到大誤點時，最重要的是「穩定＋少轉乘」。考量擁擠與 **轉乘辛苦指標 (TPI)**，我建議改走 **東京地鐵丸之內線**。\n\n東京站一路到西新宿，能避開新宿站的大迷宮。',
                    zh: '遇到大误点时，最重要的是「稳定＋少转乘」。考虑拥挤与 **转乘辛苦指标 (TPI)**，我建议改走 **东京地铁丸之内线**。\n\n东京站一路到西新宿，能避开新宿站的大迷宫。'
                },
                pauseAfterMs: 650
            },
            {
                roundNumber: 2,
                userMessage: {
                    ja: '雨の日で荷物もあります。できるだけ濡れずに行けますか？',
                    en: 'It’s raining and I have luggage. Can I get there with minimal exposure?',
                    'zh-TW': '現在下雨、我又帶行李，能不能盡量少淋雨、少走路？',
                    zh: '现在下雨、我又带行李，能不能尽量少淋雨、少走路？'
                },
                assistantResponse: {
                    ja: '（デモ設定）現在は **{{weather}} / {{time}}** です。雨＋荷物なら「地下通路優先」が正解です。\n\n丸ノ内線→西新宿→地下通路で都庁へ、で地上移動を最小化できます。',
                    en: '(Demo context) It’s **{{weather}} / {{time}}**. With rain + luggage, prioritize underground passages.\n\nMarunouchi Line → Nishi-Shinjuku → underground walkway to the Gov Building keeps outdoor walking minimal.',
                    'zh-TW': '（Demo 情境）目前是 **{{weather}} / {{time}}**。雨天＋行李，最佳策略是「地下通路優先」。\n\n走丸之內線到西新宿後，再用地下通路銜接到都廳，可以把地面步行壓到最低。',
                    zh: '（Demo 情境）目前是 **{{weather}} / {{time}}**。雨天＋行李，最佳策略是「地下通路优先」。\n\n走丸之内线到西新宿后，再用地下通路衔接到都厅，可以把地面步行压到最低。'
                },
                pauseAfterMs: 750
            },
            {
                roundNumber: 3,
                userMessage: {
                    ja: 'もしこのあと更に遅延したら、次のプランも用意したいです。',
                    en: 'If delays get worse, I want a backup plan too.',
                    'zh-TW': '如果接下來又更嚴重延誤，我想要備案。',
                    zh: '如果接下来又更严重延误，我想要备案。'
                },
                assistantResponse: {
                    ja: '備案を2つ用意します。\n\n(1) 都庁の展望室が混雑/天候不良なら、屋内で景色を楽しめる代替スポットへ。\n(2) 移動が厳しいなら、今いるエリアで「夜景＋食事」の完結プランへ切替。',
                    en: 'Here are two fallbacks: \n\n(1) If the observatory is crowded or visibility is bad, switch to an indoor alternative with skyline views.\n(2) If travel gets messy, pivot to a complete “night view + dinner” plan near your current area.',
                    'zh-TW': '我幫您準備兩個備案：\n\n(1) 若都廳展望室排隊太久/視野不佳，改去室內也能看景的替代點。\n(2) 若移動變得不穩定，直接在目前區域切換成「夜景＋晚餐」的一站式方案。',
                    zh: '我帮你准备两个备案：\n\n(1) 若都厅展望室排队太久/视野不佳，改去室内也能看景的替代点。\n(2) 若移动变得不稳定，直接在目前区域切换成「夜景＋晚餐」的一站式方案。'
                },
                actions: [
                    {
                        type: 'process',
                        label: { ja: '丸ノ内線のルート', en: 'Marunouchi Route', 'zh-TW': '查看丸之內線路線', zh: '查看丸之内线路线' },
                        target: 'route:tokyo_to_tocho_marunouchi'
                    },
                    {
                        type: 'discovery',
                        label: { ja: '都庁の展望室情報', en: 'Observatory Info', 'zh-TW': '都廳展望室資訊', zh: '都厅展望室资讯' },
                        target: 'http://www.yokoso.metro.tokyo.jp/tenbou/'
                    }
                ]
            }
        ],
        userMessage: {
            ja: '東京駅から東京都庁へ夜景を見に行きたいのですが、中央線が大幅に遅れていると聞きました。どうすればいいですか？',
            en: 'I want to go from Tokyo Station to the Tokyo Metropolitan Government Building for the night view, but I heard the Chuo Line is heavily delayed. What should I do?',
            'zh-TW': '我要從東京車站去東京都廳看夜景，但聽說中央線現在大誤點，該怎麼辦？',
            zh: '我要从东京车站去东京都厅看夜景，但听说中央线现在大误点，该怎么办？'
        },
        assistantResponse: {
            ja: '中央線が遅延している場合、山手線への振替輸送も考えられますが、混雑度と乗換の快適性（TPI指標）を考慮すると、**東京メトロ丸ノ内線**がベストです。\n\n時間は少しかかりますが、**西新宿駅**まで一本で行けて、新宿駅の複雑な乗り換えを回避できます。地下通路で都庁直結なので快適です。',
            en: 'While you could take the Yamanote Line, considering the **Transfer Pain Index (TPI)** and current congestion, I recommend the **Marunouchi Line** instead.\n\nTake it towards Ogikubo to **Nishi-Shinjuku Station**. It avoids the complex transfer maze at Shinjuku Station and connects directly to the Gov Building via underground passage.',
            'zh-TW': '別擔心。原本搭乘中央線最快，但既然發生誤點，我為您評估了替代路線。\n\n考慮到**轉乘辛苦指標 (TPI)** 與新宿站目前的擁擠程度，我不建議改搭山手線，而是推薦您改搭 **東京地鐵丸之內線**。\n\n雖然會多花幾分鐘，但您可以直達 **西新宿站**，既能避開新宿站的大迷宮，出站後還有地下道直通都廳。這是目前最輕鬆穩定的選擇。',
            zh: '别担心。原本搭乘中央线最快，但既然发生误点，我为您评估了替代路线。\n\n考虑到**转乘辛苦指标 (TPI)** 与新宿站目前的拥挤程度，我不建议改搭山手线，而是推荐您改搭 **东京地铁丸之内线**。\n\n虽然会多花几分钟，但这您可以直达 **西新宿站**，既能避开新宿站的大迷宫，出站后还有地下道直通都厅。这是目前最轻松稳定的选择。'
        },
        actions: [
            {
                type: 'process',
                label: { ja: '丸ノ内線のルート', en: 'Marunouchi Route', 'zh-TW': '查看丸之內線路線', zh: '查看丸之内线路线' },
                target: 'route:tokyo_to_tocho_marunouchi'
            },
            {
                type: 'discovery',
                label: { ja: '都庁の展望室情報', en: 'Observatory Info', 'zh-TW': '都廳展望室資訊', zh: '都厅展望室资讯' },
                target: 'http://www.yokoso.metro.tokyo.jp/tenbou/'
            }
        ],
        node: 'odpt.Station:TokyoMetro.Marunouchi.Tokyo'
    },
    handsfree: {
        id: 'handsfree',
        mockContext: {
            time: {
                ja: '平日 13:20',
                en: 'Weekday 1:20 PM',
                'zh-TW': '平日 13:20',
                zh: '平日 13:20'
            },
            weather: {
                ja: 'くもり 18°C',
                en: 'Cloudy 18°C',
                'zh-TW': '多雲 18°C',
                zh: '多云 18°C'
            }
        },
        rounds: [
            {
                roundNumber: 1,
                userMessage: {
                    ja: '成田空港から浅草に着いたばかりですが、ホテルのチェックインまで時間があります。浅草駅のコインロッカーは空いていますか？',
                    en: 'I just arrived in Asakusa from Narita Airport, but I can\'t check in to my hotel yet. Are there any available coin lockers at Asakusa Station?',
                    'zh-TW': '我剛從成田機場到淺草，但飯店下午才能進房，淺草站的置物櫃還有位子嗎？',
                    zh: '我刚从成田机场到浅草，但饭店下午才能进房，浅草站的置物柜还有位子吗？'
                },
                assistantResponse: {
                    ja: '浅草駅は観光客が多く、ロッカーは埋まりがちです。\n\n満杯なら **Ecbo Cloak** のような荷物預かりサービスを使うと、探し回らずに済みます。',
                    en: 'Asakusa Station is busy, so lockers fill up quickly.\n\nIf they’re full, a service like **Ecbo Cloak** lets you store luggage at nearby shops without hunting for lockers.',
                    'zh-TW': '淺草站遊客很多，置物櫃很容易客滿。\n\n如果找不到空位，建議改用 **Ecbo Cloak** 這類寄放服務，就不用拖著行李一直找櫃子。',
                    zh: '浅草站游客很多，置物柜很容易客满。\n\n如果找不到空位，建议改用 **Ecbo Cloak** 这类寄放服务，就不用拖着行李一直找柜子。'
                },
                pauseAfterMs: 650
            },
            {
                roundNumber: 2,
                userMessage: {
                    ja: '今の時間だと空きやすい場所はありますか？',
                    en: 'At this time, where is most likely to have availability?',
                    'zh-TW': '以現在時間來說，哪裡比較可能有空位？',
                    zh: '以现在时间来说，哪里比较可能有空位？'
                },
                assistantResponse: {
                    ja: '（デモ設定）現在は **{{time}} / {{weather}}** です。昼過ぎは駅ロッカーが埋まりやすいので、確度を上げるなら「予約できる預かり」へ寄せるのが安全です。\n\nまずEcboで近場を検索→空きがなければ観光センターの手荷物預かりへ、の順で行きましょう。',
                    en: '(Demo context) It’s **{{time}} / {{weather}}**. Early afternoon is when lockers tend to be full, so the safest path is a reservable luggage storage option.\n\nCheck Ecbo nearby first → if none, go to the tourist info baggage counter.',
                    'zh-TW': '（Demo 情境）目前是 **{{time}} / {{weather}}**。下午時段置物櫃通常更容易滿，想提高成功率，建議優先走「可預約的寄放」。\n\n先用 Ecbo 搜附近→若沒空位再去觀光中心手荷物寄放櫃台。',
                    zh: '（Demo 情境）目前是 **{{time}} / {{weather}}**。下午时段置物柜通常更容易满，想提高成功率，建议优先走「可预约的寄放」。\n\n先用 Ecbo 搜附近→若没空位再去观光中心手荷物寄放柜台。'
                },
                pauseAfterMs: 700
            },
            {
                roundNumber: 3,
                userMessage: {
                    ja: 'じゃあ予約して、身軽に雷門あたりを散歩したいです。',
                    en: 'Okay, I’ll book it and walk around Kaminarimon hands-free.',
                    'zh-TW': '好，那我先預約寄放，想輕鬆去雷門附近逛逛。',
                    zh: '好，那我先预约寄放，想轻松去雷门附近逛逛。'
                },
                assistantResponse: {
                    ja: 'いいですね。予約が取れたら、雷門周辺は人が密になりやすいので「広めの通り→裏道」の順で歩くと楽です。\n\n必要なら、ベビーカー/大きい荷物でも通りやすいルートに調整します。',
                    en: 'Great. After booking, the Kaminarimon area can get dense—walking “main wide street → quieter backstreets” usually feels easiest.\n\nIf needed, I can tune the route for big luggage or strollers too.',
                    'zh-TW': '很棒。預約完成後，雷門周邊人潮容易變密，建議用「大路先走、再轉小巷」的方式，體感會輕鬆很多。\n\n需要的話我也能把路線調成推行李/推車更好走的版本。',
                    zh: '很棒。预约完成后，雷门周边人潮容易变密，建议用「大路先走、再转小巷」的方式，体感会轻松很多。\n\n需要的话我也能把路线调成推行李/推车更好走的版本。'
                },
                actions: [
                    {
                        type: 'discovery',
                        label: { ja: 'Ecbo Cloakで予約', en: 'Book Ecbo Cloak', 'zh-TW': '預約 Ecbo Cloak', zh: '预约 Ecbo Cloak' },
                        target: 'https://cloak.ecbo.io/'
                    },
                    {
                        type: 'navigate',
                        label: { ja: '観光センターへ行く', en: 'Go to Info Center', 'zh-TW': '導航至觀光中心', zh: '导航至观光中心' },
                        target: 'asakusa_tic',
                        metadata: { coordinates: [35.7106, 139.7966] }
                    }
                ]
            }
        ],
        userMessage: {
            ja: '成田空港から浅草に着いたばかりですが、ホテルのチェックインまで時間があります。浅草駅のコインロッカーは空いていますか？',
            en: 'I just arrived in Asakusa from Narita Airport, but I can\'t check in to my hotel yet. Are there any available coin lockers at Asakusa Station?',
            'zh-TW': '我剛從成田機場到淺草，但飯店下午才能進房，淺草站的置物櫃還有位子嗎？',
            zh: '我刚从成田机场到浅草，但饭店下午才能进房，浅草站的置物柜还有位子吗？'
        },
        assistantResponse: {
            ja: '浅草駅は観光客が多く、駅のロッカーは埋まりがちです。\n\nもし駅のロッカーがいっぱいなら、**「Ecbo Cloak」** という荷物預かりサービスを使うのが賢い選択です。近くのカフェや着物レンタル店で荷物を預かってもらえます。\n\nまたは、浅草文化観光センター（雷門の向かい）にも手荷物預かり所がありますよ。',
            en: 'Asakusa Station is very busy, and lockers fill up quickly.\n\nIf the station lockers are full, using a luggage storage service like **"Ecbo Cloak"** is a smart choice. You can leave your bags at nearby cafes or kimono rental shops.\n\nAlternatively, the Asakusa Culture Tourist Information Center (opposite Kaminarimon) also has a baggage storage counter.',
            'zh-TW': '淺草站遊客非常多，車站的置物櫃經常客滿。\n\n若是找不到空位，建議您使用 **「Ecbo Cloak」** 這種行李寄放預約服務，由於可以寄放在附近的咖啡廳或商店，就不用在大車站裡拖著行李找櫃子了。\n\n另外，雷門對面的「淺草文化觀光中心」也有提供手荷物寄放服務喔！',
            zh: '浅草站游客非常多，车站的置物柜经常客满。\n\n若是找不到空位，建议您使用 **「Ecbo Cloak」** 这种行李寄放预约服务，由于可以寄放在附近的咖啡厅或商店，就不用在大车站里拖著行李找柜子了。\n\n另外，雷门对面的「浅草文化观光中心」也有提供手荷物寄放服务喔！'
        },
        actions: [
            {
                type: 'discovery',
                label: { ja: 'Ecbo Cloakで予約', en: 'Book Ecbo Cloak', 'zh-TW': '預約 Ecbo Cloak', zh: '预约 Ecbo Cloak' },
                target: 'https://cloak.ecbo.io/'
            },
            {
                type: 'navigate',
                label: { ja: '観光センターへ行く', en: 'Go to Info Center', 'zh-TW': '導航至觀光中心', zh: '导航至观光中心' },
                target: 'asakusa_tic',
                metadata: { coordinates: [35.7106, 139.7966] }
            }
        ],
        node: 'odpt.Station:TokyoMetro.Ginza.Asakusa'
    },
    accessibility: {
        id: 'accessibility',
        mockContext: {
            time: {
                ja: '日曜 10:05',
                en: 'Sun 10:05 AM',
                'zh-TW': '週日 10:05',
                zh: '周日 10:05'
            },
            weather: {
                ja: '小雨 9°C',
                en: 'Light rain 9°C',
                'zh-TW': '小雨 9°C',
                zh: '小雨 9°C'
            }
        },
        rounds: [
            {
                roundNumber: 1,
                userMessage: {
                    ja: 'ベビーカーを押して上野動物園に行きます。上野駅のどの出口から出るのが一番便利ですか？',
                    en: 'I\'m taking a stroller to Ueno Zoo. Which exit at Ueno Station is the most convenient?',
                    'zh-TW': '我推著嬰兒車要去上野動物園，請問搭到上野站要從哪個出口出來最方便？',
                    zh: '我推着婴儿车要去上野动物园，请问搭到上野站要从哪个出口出来最方便？'
                },
                assistantResponse: {
                    ja: 'ベビーカーなら **公園口（Park Exit）** が一番ラクです。\n\n段差が少なく、上野公園へフラットに出られます。',
                    en: 'With a stroller, **Park Exit** is the easiest.\n\nIt’s designed for step-free access toward Ueno Park and the zoo.',
                    'zh-TW': '推嬰兒車的話，走 **公園口（Park Exit）** 最省力。\n\n這邊的動線相對平順，出站後就是上野公園方向。',
                    zh: '推婴儿车的话，走 **公园口（Park Exit）** 最省力。\n\n这边的动线相对平顺，出站后就是上野公园方向。'
                },
                pauseAfterMs: 650
            },
            {
                roundNumber: 2,
                userMessage: {
                    ja: '雨だと滑りませんか？ベビーカーで怖いです。',
                    en: 'If it’s raining, is it slippery? I’m worried with a stroller.',
                    'zh-TW': '如果下雨地面會不會滑？推嬰兒車有點擔心。',
                    zh: '如果下雨地面会不会滑？推婴儿车有点担心。'
                },
                assistantResponse: {
                    ja: '（デモ設定）現在は **{{weather}} / {{time}}** です。小雨なら、段差の少ないルート＋屋根のある動線を優先すると安心です。\n\n傘よりレインカバー、そしてスロープ優先で案内します。',
                    en: '(Demo context) It’s **{{weather}} / {{time}}**. With light rain, prioritize step-free routes and covered walkways.\n\nA rain cover for the stroller helps more than an umbrella, and I’ll keep you on ramps over stairs.',
                    'zh-TW': '（Demo 情境）目前是 **{{weather}} / {{time}}**。小雨時建議優先走「少高低差＋有遮雨」的動線，會更安心。\n\n推車雨罩比撐傘更有用，我也會盡量用坡道避開樓梯。',
                    zh: '（Demo 情境）目前是 **{{weather}} / {{time}}**。小雨时建议优先走「少高低差＋有遮雨」的动线，会更安心。\n\n推车雨罩比撑伞更有用，我也会尽量用坡道避开楼梯。'
                },
                pauseAfterMs: 750
            },
            {
                roundNumber: 3,
                userMessage: {
                    ja: '途中で休憩できる場所や、おむつ替えできる所も知りたいです。',
                    en: 'I also want resting spots and places for diaper changes.',
                    'zh-TW': '我也想知道路上哪裡可以休息、或換尿布比較方便。',
                    zh: '我也想知道路上哪里可以休息、或换尿布比较方便。'
                },
                assistantResponse: {
                    ja: '了解です。動物園に入る前に休憩できるベンチ密度の高いエリアと、授乳室/おむつ替えがある施設の候補をまとめます。\n\n必要なら「混雑が少ない入口」まで含めて最適化します。',
                    en: 'Absolutely. I’ll list (1) high-confidence rest spots before the zoo entrance and (2) facilities with nursing/diaper-changing rooms.\n\nIf you want, I can also optimize for the least crowded entrance.',
                    'zh-TW': '沒問題。我會整理：\n\n(1) 入園前比較容易找到座位休息的區域\n(2) 有哺乳室/換尿布空間的設施點\n\n需要的話也能一起規劃「人潮較少的入口」。',
                    zh: '没问题。我会整理：\n\n(1) 入园前比较容易找到座位休息的区域\n(2) 有哺乳室/换尿布空间的设施点\n\n需要的话也能一起规划「人潮较少的入口」。'
                },
                actions: [
                    {
                        type: 'details',
                        label: { ja: '上野駅の構内図', en: 'Ueno Station Map', 'zh-TW': '查看上野站詳情', zh: '查看上野站详情' },
                        target: 'odpt.Station:JR-East.Yamanote.Ueno'
                    },
                    {
                        type: 'discovery',
                        label: { ja: '上野公園バリアフリー情報', en: 'Park Accessibility', 'zh-TW': '上野公園無障礙資訊', zh: '上野公园无障碍资讯' },
                        target: 'https://www.kensetsu.metro.tokyo.lg.jp/jimusho/toubuk/ueno/accessibility.html'
                    }
                ]
            }
        ],
        userMessage: {
            ja: 'ベビーカーを押して上野動物園に行きます。上野駅のどの出口から出るのが一番便利ですか？',
            en: 'I\'m taking a stroller to Ueno Zoo. Which exit at Ueno Station is the most convenient?',
            'zh-TW': '我推著嬰兒車要去上野動物園，請問搭到上野站要從哪個出口出來最方便？',
            zh: '我推著婴儿车要去上野动物园，请问搭到上野站要从哪个出口出来最方便？'
        },
        assistantResponse: {
            ja: 'ベビーカーをご利用なら、**「公園口（Park Exit）」** が断然便利です。\n\n公園口改札はリニューアルされ、上野公園へ段差なしでフラットにアクセスできます。動物園の正門までも舗装された広い遊歩道が続いていて安心です。\n\nもし地下鉄（銀座線・日比谷線）で来る場合は、一度JRの駅ビルエレベーターを使って上の階層へ移動するルートがスムーズです。',
            en: 'If you use a stroller, the **"Park Exit"** is definitely the most convenient.\n\nThe Park Exit gate has been renovated to provide flat, step-free access directly to Ueno Park. There is a wide, paved promenade leading all the way to the zoo\'s main gate.\n\nIf you are arriving by subway (Ginza Line/Hibiya Line), it is smoothest to use the station building elevator to go up to the park level.',
            'zh-TW': '推嬰兒車的話，請務必走 **「公園口 (Park Exit)」**！\n\n上野站公園口經過改建，現在出來就是上野公園，完全沒有高低差，路面也非常平坦好推。沿著寬敞的步道直走就能到動物園正門。\n\n如果您是搭地鐵（銀座線/日比谷線），建議先利用車站大樓的電梯上到地面層，再往公園口方向移動會比較輕鬆。',
            zh: '推婴儿车的话，请务必走 **「公园口 (Park Exit)」**！\n\n上野站公园口经过改建，现在出来就是上野公园，完全没有高低差，路面也非常平坦好推。沿着宽敞的步道直走就能到动物园正门。\n\n如果您是搭地铁（银座线/日比谷线），建议先利用车站大楼的电梯上到地面层，再往公园口方向移动会比较轻松。'
        },
        actions: [
            {
                type: 'details',
                label: { ja: '上野駅の構内図', en: 'Ueno Station Map', 'zh-TW': '查看上野站詳情', zh: '查看上野站详情' },
                target: 'odpt.Station:JR-East.Yamanote.Ueno'
            },
            {
                type: 'discovery',
                label: { ja: '上野公園バリアフリー情報', en: 'Park Accessibility', 'zh-TW': '上野公園無障礙資訊', zh: '上野公园无障碍资讯' },
                target: 'https://www.kensetsu.metro.tokyo.lg.jp/jimusho/toubuk/ueno/accessibility.html'
            }
        ],
        node: 'odpt.Station:JR-East.Yamanote.Ueno'
    }
};
