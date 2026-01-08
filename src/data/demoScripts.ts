
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
            ja: '浅草の喧騒を離れたいなら、**今戸神社**や**待乳山聖天**がおすすめです。\n\n隅田川沿いを少し歩くと、静かで落ち着いた下町の雰囲気を感じられますよ。特に今戸神社は「招き猫発祥の地」としても知られ、縁結びのパワースポットです。\n\nまた、川沿いのカフェで一休みするのも良いでしょう。',
            en: 'If you want to escape the crowds of Asakusa, I recommend **Imado Shrine** or **Matsuchiyama Shoden**.\n\nA short walk along the Sumida River offers a quiet and calm "Shitamachi" (downtown) atmosphere. Imado Shrine is particularly famous as the birthplace of the "Maneki Neko" (beckoning cat) and is a power spot for matchmaking.\n\nTaking a break at a riverside cafe is also a great idea.',
            'zh-TW': '如果您想避開淺草的人潮，我非常推薦**今戶神社**或**待乳山聖天**。\n\n沿著隅田川稍微走一段路，就能感受到寧靜且充滿「下町」風情的氛圍。特別是今戶神社，被認為是「招財貓的發源地」，也是求姻緣的能量景點。\n\n或者，在河邊的咖啡廳休息一下也是個不錯的選擇。',
            zh: '如果您想避开浅草的人潮，我非常推荐**今户神社**或**待乳山圣天**。\n\n沿著隅田川稍微走一段路，就能感受到宁静且充满「下町」风情的氛围。特别是今户神社，被认为是「招财猫的发源地」，也是求姻缘的能量景点。\n\n或者，在河边的咖啡厅休息一下也是个不错的选择。'
        },
        actions: [
            {
                type: 'navigate',
                label: { ja: '今戸神社へ行く', en: 'Go to Imado Shrine', 'zh-TW': '導航至今戶神社', zh: '导航至今户神社' },
                target: 'imado_shrine',
                metadata: { coordinates: [35.7185, 139.8028] } // Approx coords
            },
            {
                type: 'discovery',
                label: { ja: '川沿いのカフェを探す', en: 'Find riverside cafes', 'zh-TW': '尋找河邊咖啡廳', zh: '寻找河边咖啡厅' },
                target: 'chat:尋找隅田川附近的咖啡廳'
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
            ja: 'あわてないでください。中央線が遅れている場合、**東京メトロ丸ノ内線**が最適な代替ルートです。\n\n東京駅から「荻窪・新宿方面」行きに乗れば、乗り換えなしで**西新宿駅**まで行けます。そこから都庁までは地下道で直結しており、雨の日でも濡れずに移動できますよ。\n\n所要時間は約20分です。',
            en: 'Don\'t panic. If the Chuo Line is delayed, the **Tokyo Metro Marunouchi Line** is your best alternative.\n\nTake the train bound for Ogikubo/Shinjuku from Tokyo Station, and you can get to **Nishi-Shinjuku Station** without transferring. From there, an underground passage connects directly to the Metropolitan Government Building, so you stay dry even if it rains.\n\nIt takes about 20 minutes.',
            'zh-TW': '別擔心。如果中央線發生延誤，**東京地鐵丸之內線**是您的最佳替代方案。\n\n從東京車站搭乘往「荻窪・新宿方向」的列車，無需轉乘即可直達**西新宿站**。從那裡有地下通道直通都廳，即使下雨也不用擔心。\n\n車程大約 20 分鐘，且班次很頻繁。',
            zh: '别担心。如果中央线发生延误，**东京地铁丸之内线**是您的最佳替代方案。\n\n从东京车站搭乘往「荻窪・新宿方向」的列车，无需转乘即可直达**西新宿站**。从那里有地下通道直通都厅，即使下雨也不用担心。\n\n车程大约 20 分钟，且班次很频繁。'
        },
        actions: [
            {
                type: 'process',
                label: { ja: '丸ノ内線のルートを見る', en: 'View Marunouchi Route', 'zh-TW': '查看丸之內線路線', zh: '查看丸之内线路线' },
                target: 'route:tokyo_to_tocho'
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
