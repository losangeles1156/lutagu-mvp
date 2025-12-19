export interface StationTrap {
    type: 'depth' | 'transfer' | 'exit' | 'crowd';
    title: string;
    content: string;
    advice: string;
    severity: 'medium' | 'high' | 'critical';
}

export interface StationWisdomData {
    traps: StationTrap[];
    hacks?: string[];
}

export const STATION_WISDOM: Record<string, StationWisdomData> = {
    // Ueno Station (Target for verification)
    'odpt:Station:TokyoMetro.Ueno': {
        traps: [
            {
                type: 'depth',
                title: '🚄 新幹線搭乘警示 (High Depth)',
                content: '上野站的新幹線月臺位於地下四層，非常深！從上野公園/不忍口進站後，需連續搭乘 **四段長扶梯** 才能抵達。',
                advice: '⚠️ 心理建設：請務必預留 **至少 15 分鐘** 的進站緩衝時間。絕對不要在發車前 5 分鐘才抵達驗票口，你會趕不上。',
                severity: 'critical'
            }
        ],
        hacks: [
            '🏛️ **文化天橋 (Panda Bridge)**：從公園口出站後，可直接走天橋（官方稱熊貓橋）通往國立科學博物館與上野大廳，避開 1F 的擁擠人潮。',
            '🛍️ **阿美橫町切入點**：想去阿美橫町？不要走「中央改札」，改走「不忍改札」過馬路就是入口，省下 5 分鐘迷路時間。'
        ]
    },

    // Tokyo Station (Reference)
    'odpt:Station:TokyoMetro.Tokyo': {
        traps: [
            {
                type: 'transfer',
                title: '🏃 京葉線轉乘陷阱 (Far Transfer)',
                content: '京葉線（去迪士尼的路線）月臺距離山手線非常遠，實際上接近「有樂町站」。',
                advice: '⚠️ 心理建設：轉乘通道長達 800 公尺，步行需 15-20 分鐘。請把它當作是「走到下一站」的距離感。',
                severity: 'high'
            }
        ]
    },

    // Toei Asakusa Line Wisdom
    'odpt:Station:Toei.Asakusa.Oshiage': {
        traps: [
            {
                type: 'crowd',
                title: '🗼 晴空塔人潮 (Skytree Crowds)',
                content: '押上站是前往晴空塔的主要車站，假日與連假期間人潮非常洶湧。',
                advice: '💡 建議：若要前往晴空塔，請預留出站時間。回程若遇人潮管制，可考慮步行至鄰近車站搭乘。',
                severity: 'medium'
            }
        ],
        hacks: [
            '✈️ **直通成田**：此站直通京成線往成田機場，是個非常方便的轉運點。'
        ]
    },
    'odpt:Station:Toei.Asakusa.Asakusa': {
        traps: [
            {
                type: 'exit',
                title: '🧳 電梯陷阱 (Elevator Trap)',
                content: '淺草站出口雖多，但直通地面的電梯 **只有一座**！',
                advice: '⚠️ 行動建議：攜帶大型行李的旅客，請務必尋找「駒形橋方面」的 **A2b 出口**，这是唯一的直達電梯出口。',
                severity: 'high'
            }
        ]
    },
    'odpt:Station:Toei.Asakusa.Kuramae': {
        traps: [
            {
                type: 'transfer',
                title: '🚅 列車過站不停警示 (Skip Stop)',
                content: '注意！都營淺草線的「Airport快特 (Airport Kaitoku)」列車 **不會停靠** 藏前站。',
                advice: '🛑 能夠搭乘的車種：除了 Airport 快特以外的車種（普通、快速、特急等）皆可搭乘。若誤搭快特，請在下一站換車折返。',
                severity: 'high'
            },
            {
                type: 'transfer',
                title: '🔄 大江戶線轉乘陷阱 (Street Transfer)',
                content: '淺草線藏前站與大江戶線藏前站 **在站外轉乘**，需出站走一般道路約 300 公尺。',
                advice: '⚠️ 心理建設：這不是站內轉乘，請做好要走出戶外過馬路的準備。轉乘時間需抓 10-15 分鐘。',
                severity: 'medium'
            }
        ]
    },
    'odpt:Station:Toei.Asakusa.Asakusabashi': {
        traps: [
            {
                type: 'transfer',
                title: '🪜 轉乘陷阱 (Stair Master)',
                content: '雖然淺草橋站有 JR 總武線和都營淺草線，但兩者轉乘 **需要出站並走一段樓梯**，且電梯位置隱密。',
                advice: '⚠️ 心理建設：攜帶大件行李者，請務必尋找 A3 出口（有電梯），否則將面臨長長的樓梯挑戰。',
                severity: 'medium'
            }
        ],
        hacks: [
            '🧵 **手作天堂**：出站即是「江戶通」，滿街都是飾品材料、皮革、珠寶的批發店，價格甚至是市價的一半！',
            '🎎 **人形老舖**：此地也是著名的「久月」等人形娃娃專賣區。'
        ]
    },
    'odpt:Station:TokyoMetro.Tawaramachi': {
        traps: [
            {
                type: 'exit',
                title: '🍳 合羽橋道具街陷阱 (Kitchen Street)',
                content: '想去合羽橋道具街？最近的出口是 3 號，但 **只有樓梯**。',
                advice: '⚠️ 行動建議：若有重物，請改走 2 號出口（有電梯），雖然要多過一個馬路，但省力很多。',
                severity: 'medium'
            }
        ],
        hacks: [
            '🍞 **知名麵包店**：著名的「Pelican」麵包店就在附近，需預約才買得到！'
        ]
    },
    'odpt:Station:JR-East.Uguisudani': {
        traps: [
            {
                type: 'exit',
                title: '🎭 南北出口大不同 (North vs South)',
                content: '鶯谷站的北口與南口氛圍截然不同！北口是著名的「摩鐵街 (Love Hotel Hill)」，南口則是通往上野公園與博物館的文教區。',
                advice: '💡 若要去東京國立博物館，請務必走 **南口**，北口走出來會讓你懷疑人生（或非常尷尬）。',
                severity: 'high'
            }
        ]
    },
    'odpt:Station:JR-East.Okachimachi': {
        traps: [],
        hacks: [
            '🐟 **阿美橫町尾端**：這裡是阿美橫町的另一端，相較於上野站的擁擠，從御徒町進入通常人潮稍少一點，且海鮮丼名店多集中在此側。',
            '💎 **珠寶批發**：車站周邊是日本最大的珠寶飾品批發區。'
        ]
    },
    'odpt:Station:TokyoMetro.Iriya': {
        traps: [],
        hacks: [
            '👻 **鬼子母神**：每年七月的「朝顏市（牽牛花市）」非常熱鬧。',
            '🍲 **老舖天丼**：附近有許多百年老店，價格比淺草親民許多。'
        ]
    },
    'odpt:Station:Toei.Asakusa.Ningyocho': {
        traps: [
            {
                type: 'transfer',
                title: '🚅 列車過站不停警示 (Skip Stop)',
                content: '注意！都營淺草線的「Airport快特 (Airport Kaitoku)」列車 **不會停靠** 人形町站。',
                advice: '🛑 能夠搭乘的車種：請搭乘普通或各站停車的班次。',
                severity: 'medium'
            }
        ],
        hacks: [
            '⛩️ **洗錢神社**：步行可達著名的小網神社（求財運），是近年熱門景點。'
        ]
    },
    'odpt:Station:Toei.Asakusa.Higashiginza': {
        traps: [
            {
                type: 'transfer',
                title: '🚅 列車過站不停警示 (Skip Stop)',
                content: '注意！都營淺草線的「Airport快特 (Airport Kaitoku)」列車 **不會停靠** 東銀座站。',
                advice: '🛑 能夠搭乘的車種：請搭乘普通或各站停車的班次。',
                severity: 'medium'
            }
        ]
    },
    'odpt:Station:Toei.Asakusa.Sengakuji': {
        traps: [
            {
                type: 'transfer',
                title: '🔀 命運的分歧點 (Destination Trap)',
                content: '泉岳寺站是淺草線往「西馬込」與「京急線（羽田機場）」的分歧點。',
                advice: '⚠️ 轉乘攻略：若要往五反田、西馬込方向，無論何種列車都可先上車，只需在 **泉岳寺站** 下車換乘往西馬込的列車即可，無需在月台苦等直達車。',
                severity: 'high'
            }
        ]
    }
};
