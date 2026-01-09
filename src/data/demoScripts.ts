
export interface DemoScript {
    id: string;
    userMessage: {
        ja: string;
        en: string;
        'zh-TW': string;
        zh: string;
    };
    assistantResponse: {
        ja: string;
        en: string;
        'zh-TW': string;
        zh: string;
    };
    actions: Array<{
        type: 'discovery' | 'navigate' | 'details' | 'process';
        label: {
            ja: string;
            en: string;
            'zh-TW': string;
            zh: string;
        };
        target: string;
        metadata?: any;
    }>;
    node: string;
}

export const demoScripts: Record<string, DemoScript> = {
    overtourism: {
        id: 'overtourism',
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
