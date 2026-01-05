export interface StationPersonality {
    title: { ja: string; en: string; zh: string };
    tagline: { ja: string; en: string; zh: string };
}

export const STATION_PERSONALITY: Record<string, StationPersonality> = {
    // --- Major Hubs ---
    'Tokyo': {
        title: { ja: '日本の表玄関', en: 'The Gateway to Japan', zh: '日本的表玄關' },
        tagline: { ja: '歴史ある赤レンガ駅舎と近代的なビジネス街の融合', en: 'Historic red brick station meets modern business hub', zh: '百年紅磚車站與現代商務中心的完美融合' }
    },
    'Ueno': {
        title: { ja: '文化と活力の門', en: 'Gate of Culture & Vitality', zh: '文化與活力之門' },
        tagline: { ja: '下町の情緒と文化的な活力が交差する場所', en: 'Where Shitamachi nostalgia meets cultural energy', zh: '下町情懷與文化活力的交會點' }
    },
    'Shinjuku': {
        title: { ja: '眠らない巨大都市', en: 'The Sleepless Metropolis', zh: '不夜巨大都市' },
        tagline: { ja: '世界一の乗降客数を誇るビジネスと娯楽の中心', en: 'World\'s busiest hub for business, shopping, and nightlife', zh: '擁有世界最大運量的商務與娛樂中心' }
    },
    'Shibuya': {
        title: { ja: '若者文化の発信地', en: 'Youth Culture Hub', zh: '流行文化發信地' },
        tagline: { ja: 'スクランブル交差点と最新トレンドの街', en: 'Home to the Scramble Crossing and latest trends', zh: '澀谷十字路口與最新潮流的聚集地' }
    },
    'Ikebukuro': {
        title: { ja: 'アートとカルチャーの街', en: 'Art & Culture City', zh: '藝術與文化之城' },
        tagline: { ja: '演劇、アニメ、アートが融合する副都心', en: 'A sub-center fusing theater, anime, and art', zh: '融合戲劇、動漫與藝術的繁華副都心' }
    },
    'Shinagawa': {
        title: { ja: '東京の南の玄関口', en: 'Southern Gateway', zh: '東京的南大門' },
        tagline: { ja: '新幹線が停車する近代的なビジネス拠点', en: 'Bullet train hub and modern business district', zh: '新幹線停靠的現代化商務樞紐' }
    },

    // --- Culture & History ---
    'Asakusa': {
        title: { ja: '江戸への門', en: 'Gateway to Edo', zh: '江戶之門' },
        tagline: { ja: '浅草寺と仲見世通りの魅力が集まる場所', en: 'The charm of Senso-ji Temple and Nakamise Street', zh: '淺草寺與仲見世通的魅力集散地' }
    },
    'Akihabara': {
        title: { ja: '電気とサブカルチャーの聖地', en: 'Electric Town & Pop Culture', zh: '電器與次文化聖地' },
        tagline: { ja: 'アニメ、マンガ、電子機器の世界的な中心地', en: 'Global center for anime, manga, and electronics', zh: '動漫、遊戲與電子產品的全球中心' }
    },
    'Ryogoku': {
        title: { ja: '相撲の街', en: 'Sumo Town', zh: '相撲之街' },
        tagline: { ja: '国技館とちゃんこ鍋で知られる相撲の聖地', en: 'Home to the Kokugikan Sumo Hall and chanko nabe', zh: '以國技館與相撲火鍋聞名的相撲聖地' }
    },
    'Ningyocho': {
        title: { ja: '人形と安産の街', en: 'Historic Doll Town', zh: '人形與安產之街' },
        tagline: { ja: '江戸の伝統と老舗の味が残る下町', en: 'Traditional crafts and sweet delights of Edo', zh: '保留江戶傳統與老舖美味的下町' }
    },
    'Yushima': {
        title: { ja: '学問の街', en: 'Scholar\'s Town', zh: '學問之街' },
        tagline: { ja: '湯島天神と梅の名所として知られる', en: 'Famous for Yushima Tenjin Shrine and plum blossoms', zh: '以湯島天神與梅花名勝聞名' }
    },
    'Nippori': {
        title: { ja: '繊維の街', en: 'Fabric Town', zh: '布料之街' },
        tagline: { ja: '繊維街と谷中銀座のレトロな雰囲気', en: 'Textile district meets Yanaka Ginza nostalgia', zh: '纖維街與谷中銀座的懷舊氛圍' }
    },
    'Uguisudani': {
        title: { ja: '歴史と静寂の街', en: 'Quiet History', zh: '歷史與靜寂之街' },
        tagline: { ja: '寛永寺や博物館に近い隠れた文化的エリア', en: 'Hidden cultural area near Kaneiji and museums', zh: '鄰近寬永寺與博物館的隱秘文化區' }
    },
    'Minowa': {
        title: { ja: '都電の走る下町', en: 'Retro Arakawa', zh: '都電行駛的下町' },
        tagline: { ja: '都電荒川線と古き良き東京の風情', en: 'Toden Arakawa line and old Tokyo vibes', zh: '都電荒川線與古老美好的東京風情' }
    },
    'Itabashi': {
        title: { ja: '中山道の宿場町', en: 'Nakasendo Post Town', zh: '中山道宿場町' },
        tagline: { ja: '歴史ある商店街と親しみやすい雰囲気', en: 'Historic vibes and friendly shopping streets', zh: '充滿歷史感的商店街與親切氛圍' }
    },
    'Kagurazaka': {
        title: { ja: '東京の小さなパリ', en: 'Little Paris', zh: '東京的小巴黎' },
        tagline: { ja: '石畳の路地と洗練されたフレンチレストラン', en: 'Cobblestone alleys and chic French dining', zh: '石板路小巷與精緻法式餐廳' }
    },

    // --- Modern & Fashion ---
    'Ginza': {
        title: { ja: '伝統と革新の街', en: 'Tradition & Innovation', zh: '傳統與革新之街' },
        tagline: { ja: '洗練された大人のショッピングと美食の街', en: 'Sophisticated district for luxury shopping and dining', zh: '匯聚頂級購物與美食的優雅大人街道' }
    },
    'Omotesando': {
        title: { ja: '建築とファッションの街', en: 'Architectural Runway', zh: '建築與時尚之街' },
        tagline: { ja: '世界的ブランドと美しい建築が並ぶ通り', en: 'Luxury brands and stunning architecture', zh: '世界名牌與美麗建築林立的大道' }
    },
    'Harajuku': {
        title: { ja: 'カワイイ文化の聖地', en: 'Kawaii Culture Capital', zh: '可愛文化聖地' },
        tagline: { ja: 'ポップカルチャーと最新ファッションの震源地', en: 'Epicenter of pop culture and teenage fashion', zh: '原宿系時尚與流行文化的發源地' }
    },
    'Roppongi': {
        title: { ja: 'アートとナイトライフ', en: 'Art & Nightlife', zh: '藝術與夜生活' },
        tagline: { ja: '美術館と多国籍な夜が共存する街', en: 'Museums and international nightlife district', zh: '美術館與多國籍夜生活共存的街道' }
    },
    'Ebisu': {
        title: { ja: '大人の洗練された街', en: 'Sophisticated Adult Town', zh: '洗練的大人街道' },
        tagline: { ja: '恵比寿ガーデンプレイスと美食の街', en: 'Yebisu Garden Place and chic dining', zh: '惠比壽花園廣場與美食之街' }
    },
    'Daikanyama': { // Added for context near Ebisu/Nakameguro
        title: { ja: '洗練されたライフスタイル', en: 'Stylish Living', zh: '時尚生活方式' },
        tagline: { ja: 'おしゃれなカフェとブティックが点在', en: 'Trendy cafes and boutiques', zh: '散佈著時髦咖啡廳與精品店' }
    },
    'Nakameguro': {
        title: { ja: '目黒川とカフェの街', en: 'Hipster Riverside', zh: '目黑川與咖啡之街' },
        tagline: { ja: '桜の名所とトレンド発信地', en: 'Trendy cafes and famous cherry blossoms', zh: '賞櫻名所與潮流發信地' }
    },
    'Shirokanedai': {
        title: { ja: 'プラチナ通りの優雅', en: 'Platinum Street', zh: '白金通的優雅' },
        tagline: { ja: '自然教育園と高級ブティック', en: 'Nature park and elegant boutiques', zh: '自然教育園與高級精品店' }
    },
    'Shirokane-takanawa': {
        title: { ja: '静寂と気品', en: 'Quiet Luxury', zh: '靜寂與氣品' },
        tagline: { ja: '落ち着いた住宅街と隠れた名店', en: 'Upscale residential area and hidden gems', zh: '沉穩的高級住宅區與隱藏名店' }
    },
    'Azabu-Juban': {
        title: { ja: '下町情緒と国際色', en: 'Traditional Luxury', zh: '下町情懷與國際色彩' },
        tagline: { ja: '老舗と大使館が共存する商店街', en: 'Old-school shops in an upscale international area', zh: '老舖與大使館共存的商店街' }
    },
    'Hiroo': {
        title: { ja: '国際的な雰囲気', en: 'Expat Enclave', zh: '國際化氛圍' },
        tagline: { ja: '大使館が多く、多国籍なカフェが並ぶ', en: 'International atmosphere with many embassies', zh: '大使館林立，充滿多國籍咖啡廳' }
    },
    'Aoyama-Itchome': { // Context
         title: { ja: '青山の中心', en: 'Heart of Aoyama', zh: '青山中心' },
         tagline: { ja: 'ビジネスとファッションの交差点', en: 'Intersection of business and fashion', zh: '商務與時尚的交差點' }
    },

    // --- Business & Politics ---
    'Shimbashi': {
        title: { ja: 'サラリーマンの聖地', en: 'Salaryman\'s Sanctuary', zh: '上班族的聖地' },
        tagline: { ja: 'ガード下の居酒屋と日本のビジネスマン文化', en: 'Authentic izakayas under the tracks', zh: '高架橋下的居酒屋與日本上班族文化' }
    },
    'Nihonbashi': {
        title: { ja: '日本の道路の起点', en: 'Center of Japan', zh: '日本道路起點' },
        tagline: { ja: '五街道の起点であり、金融と伝統の中心', en: 'Zero mile marker and financial history', zh: '五街道起點，金融與傳統的中心' }
    },
    'Otemachi': { // Context
        title: { ja: 'ビジネスの中枢', en: 'Financial Hub', zh: '金融中樞' },
        tagline: { ja: '日本を代表する大企業が集まる街', en: 'Headquarters of major Japanese corporations', zh: '日本代表性大企業雲集之街' }
    },
    'Marunouchi': { // Context
        title: { ja: '洗練されたオフィス街', en: 'Elite Business District', zh: '洗練辦公街' },
        tagline: { ja: '東京駅前の美しい並木道と高級ブランド', en: 'Beautiful avenues and luxury brands near Tokyo Station', zh: '東京站前的美麗林蔭道與高級名牌' }
    },
    'Kyobashi': {
        title: { ja: 'アートとビジネス', en: 'Art & Business', zh: '藝術與商務' },
        tagline: { ja: '骨董通りと近代的なオフィスビル', en: 'Galleries amidst modern offices', zh: '古董通與現代化辦公大樓' }
    },
    'Kayabacho': {
        title: { ja: '金融の街', en: 'Financial District', zh: '金融之街' },
        tagline: { ja: '東京証券取引所に近い証券の街', en: 'Stock exchange and business history', zh: '鄰近東京證券交易所的證券之街' }
    },
    'Hamamatsucho': {
        title: { ja: '空と海の玄関口', en: 'Gateway to Sky & Sea', zh: '空與海的玄關' },
        tagline: { ja: 'モノレールと東京タワーが見える街', en: 'Monorail hub near Kyu-Shiba Rikyu', zh: '單軌電車樞紐與眺望東京鐵塔之街' }
    },
    'Toranomon': {
        title: { ja: 'ビジネスの未来', en: 'Business Innovation', zh: '商務的未來' },
        tagline: { ja: '再開発で生まれ変わる国際ビジネス拠点', en: 'New landmarks and global business hub', zh: '因再開發而新生的國際商務據點' }
    },
    'Kamiyacho': {
        title: { ja: 'グローバルビジネス', en: 'Global Business Hub', zh: '全球商務' },
        tagline: { ja: '大使館と外資系企業が集まる', en: 'Embassies and Tokyo Tower views', zh: '大使館與外資企業聚集' }
    },
    'Kasumigaseki': {
        title: { ja: '日本の行政中心', en: 'Power Center', zh: '日本行政中心' },
        tagline: { ja: '官公庁が立ち並ぶ日本の心臓部', en: 'Heart of Japanese government', zh: '官廳林立的日本心臟地帶' }
    },
    'Nagatacho': {
        title: { ja: '政治の中心', en: 'Political Heart', zh: '政治中心' },
        tagline: { ja: '国会議事堂がある政治の舞台', en: 'Home to the National Diet Building', zh: '國會議事堂所在的政治舞台' }
    },
    'Akasaka': {
        title: { ja: '大人の夜とビジネス', en: 'Executive Nightlife', zh: '大人夜生活與商務' },
        tagline: { ja: '料亭の伝統とTBSのメディア文化', en: 'High-end dining and media hub', zh: '料亭傳統與TBS媒體文化' }
    },
    'Yotsuya': {
        title: { ja: '文化の交差点', en: 'Crossroad of Culture', zh: '文化交差點' },
        tagline: { ja: '迎賓館と上智大学がある歴史ある街', en: 'Historic Sophia University and Akasaka Palace', zh: '迎賓館與上智大學所在的歷史之街' }
    },
    'Hanzomon': {
        title: { ja: '皇居の眺望', en: 'Imperial Views', zh: '皇居眺望' },
        tagline: { ja: '皇居のお堀と千鳥ヶ淵に近い', en: 'Overlooking the Imperial Palace moat', zh: '鄰近皇居護城河與千鳥之淵' }
    },

    // --- Student & Academic ---
    'Ochanomizu': {
        title: { ja: '学生と音楽の街', en: 'Student & Music Town', zh: '學生與音樂之街' },
        tagline: { ja: '楽器店街と古書店、大学が集まる', en: 'Instruments, books, and academia', zh: '樂器街、古書店與大學聚集' }
    },
    'Jimbocho': {
        title: { ja: '本の街', en: 'City of Books', zh: '書之街' },
        tagline: { ja: '世界最大級の古書店街', en: 'World\'s largest antiquarian book district', zh: '世界最大規模的古書店街' }
    },
    'Todaimae': {
        title: { ja: '日本の最高学府', en: 'Academic Capital', zh: '日本最高學府' },
        tagline: { ja: '東京大学本郷キャンパスの最寄り', en: 'Home to Japan\'s top university', zh: '東京大學本鄉校區所在地' }
    },
    'Takadanobaba': {
        title: { ja: '学生のエネルギー', en: 'Student Town', zh: '學生的能量' },
        tagline: { ja: '早稲田大学の学生で賑わう街', en: 'Affordable eats and Tezuka heritage', zh: '充滿早稻田大學生熱氣的街道' }
    },
    'Waseda': { // Context
        title: { ja: '学問と伝統', en: 'Academic Tradition', zh: '學問與傳統' },
        tagline: { ja: '早稲田大学と大隈庭園', en: 'Waseda University and Okuma Garden', zh: '早稻田大學與大隈庭園' }
    },
    'Suidobashi': {
        title: { ja: 'エンタメと大学', en: 'Dome City', zh: '娛樂與大學' },
        tagline: { ja: '東京ドームと大学キャンパス', en: 'Baseball, concerts, and amusement', zh: '東京巨蛋與大學校園' }
    },
    'Kanda': {
        title: { ja: '古書とカレーの街', en: 'Book Town & Curry', zh: '古書與咖哩之街' },
        tagline: { ja: '多くの古書店とカレーの名店', en: 'Second-hand books and curry paradise', zh: '眾多古書店與咖哩名店' }
    },

    // --- East Tokyo / Shitamachi ---
    'Oshiage': {
        title: { ja: '天空の街', en: 'Town of the Sky Tree', zh: '天空之樹的街道' },
        tagline: { ja: '東京スカイツリーと下町の融合', en: 'Modernity meets tradition under Skytree', zh: '東京晴空塔與下町的融合' }
    },
    'Kinshicho': {
        title: { ja: '東東京の拠点', en: 'East Tokyo Hub', zh: '東東京據點' },
        tagline: { ja: 'ショッピングと公園、夜の賑わい', en: 'Shopping, parks, and nightlife', zh: '購物、公園與熱鬧夜生活' }
    },
    'Kameido': {
        title: { ja: '藤と天神様', en: 'Wisteria & Shrine', zh: '紫藤與天神' },
        tagline: { ja: '亀戸天神と下町グルメ', en: 'Kameido Tenjin and downtown vibes', zh: '龜戶天神與下町美食' }
    },
    'Kameari': {
        title: { ja: 'こち亀の街', en: 'Manga Town', zh: '烏龍派出所之街' },
        tagline: { ja: '漫画「こち亀」の舞台と人情', en: 'KochiKame statues and local charm', zh: '漫畫《烏龍派出所》舞台與人情味' }
    },
    'Kitasenju': {
        title: { ja: '足立のターミナル', en: 'Adachi\'s Major Hub', zh: '足立轉運樞紐' },
        tagline: { ja: '宿場町の歴史と新しい大学の街', en: 'Retro shanties meet modern academic city', zh: '宿場町歷史與新興大學城' }
    },
    'Kuramae': {
        title: { ja: '東京のブルックリン', en: 'Tokyo\'s Brooklyn', zh: '東京的布魯克林' },
        tagline: { ja: '職人の技とリノベーションカフェ', en: 'Craftsmanship and riverside cafes', zh: '職人技藝與老屋新生咖啡廳' }
    },
    'Kiyosumi-shirakawa': {
        title: { ja: 'コーヒーとアート', en: 'Coffee & Art', zh: '咖啡與藝術' },
        tagline: { ja: 'サードウェーブコーヒーと現代美術館', en: 'Third-wave coffee and contemporary art', zh: '第三波咖啡與現代美術館' }
    },
    'Monzen-Nakacho': { // Context
        title: { ja: '深川の情緒', en: 'Fukagawa Vibes', zh: '深川情懷' },
        tagline: { ja: '富岡八幡宮と深川不動堂', en: 'Historic shrines and old Tokyo atmosphere', zh: '富岡八幡宮與深川不動堂' }
    },
    'Tsukiji': {
        title: { ja: '日本の台所', en: 'Japan\'s Kitchen', zh: '日本的廚房' },
        tagline: { ja: '新鮮な魚介と活気ある場外市場', en: 'Fresh seafood and vibrant outer market', zh: '新鮮海產與充滿活力的場外市場' }
    },
    'Okachimachi': {
        title: { ja: '活気ある商店街', en: 'Bustling Market Street', zh: '活力商店街' },
        tagline: { ja: 'アメ横の賑わいと宝石問屋街', en: 'Ameyoko\'s vibrant bargain paradise', zh: '阿美橫町的熱鬧與珠寶批發街' }
    },
    'Bakuro-yokoyama': {
        title: { ja: '問屋街の歴史', en: 'Wholesale District', zh: '批發街的歷史' },
        tagline: { ja: '衣料品問屋と新しいホステル', en: 'Historic textile and clothing hub', zh: '服飾批發與新興青旅' }
    },

    // --- Others ---
    'Korakuen': {
        title: { ja: '庭園とエンタメ', en: 'Entertainment & Garden', zh: '庭園與娛樂' },
        tagline: { ja: '小石川後楽園と東京ドームシティ', en: 'Dome city and historical gardens', zh: '小石川後樂園與東京巨蛋城' }
    },
    'Iidabashi': {
        title: { ja: '水辺の交差点', en: 'Canal-side Junction', zh: '水邊交差點' },
        tagline: { ja: '外堀の桜と神楽坂への入り口', en: 'Historic castle moats and universities', zh: '外堀櫻花與神樂坂入口' }
    },
    'Ichigaya': {
        title: { ja: 'お堀と釣り堀', en: 'Moat-side Campus', zh: '護城河與釣魚場' },
        tagline: { ja: '大学と釣り堀がある穏やかな風景', en: 'Fishing ponds and university life', zh: '大學與釣魚場的寧靜風景' }
    },
    'Hibiya': {
        title: { ja: '劇場と公園', en: 'Theater & Park', zh: '劇場與公園' },
        tagline: { ja: '日比谷公園と映画・演劇の街', en: 'Broadway of Tokyo and green oasis', zh: '日比谷公園與電影戲劇之街' }
    },
    'Yurakucho': {
        title: { ja: '銀座への入り口', en: 'Gateway to Ginza', zh: '銀座入口' },
        tagline: { ja: 'ガード下の赤提灯と映画館', en: 'Retro under-track dining and cinema', zh: '高架橋下的紅燈籠與電影院' }
    },
    'Sugamo': {
        title: { ja: 'おばあちゃんの原宿', en: 'Harajuku for Grannies', zh: '老奶奶的原宿' },
        tagline: { ja: 'とげぬき地蔵と地蔵通り商店街', en: 'Traditional charm and red underwear', zh: '拔刺地藏與地藏通商店街' }
    },
    'Otsuka': {
        title: { ja: 'レトロな都電', en: 'Retro Tokyo Tram', zh: '懷舊都電' },
        tagline: { ja: '星野リゾートと昭和の雰囲気', en: 'Arakawa line and deep local vibes', zh: '星野度假村與昭和氛圍' }
    },
    'Shin-Okubo': {
        title: { ja: '韓流の街', en: 'Korea Town', zh: '韓流之街' },
        tagline: { ja: '韓国料理とK-POPグッズ', en: 'K-pop culture and spicy street food', zh: '韓國料理與K-POP周邊' }
    },
    'Yoyogi': {
        title: { ja: '緑の玄関口', en: 'Green Gateway', zh: '綠色玄關' },
        tagline: { ja: '代々木公園と明治神宮への入り口', en: 'Entrance to Yoyogi Park and Meiji Jingu', zh: '代代木公園與明治神宮入口' }
    },
    'Sendagaya': {
        title: { ja: 'スポーツの聖地', en: 'Sports Hub', zh: '體育聖地' },
        tagline: { ja: '国立競技場と東京体育館', en: 'National Stadium and sports culture', zh: '國立競技場與東京體育館' }
    },
    'Akabanebashi': {
        title: { ja: '東京タワーの麓', en: 'Tokyo Tower\'s Foot', zh: '東京鐵塔腳下' },
        tagline: { ja: '東京タワーが最も美しく見える場所', en: 'Best views of the iconic tower', zh: '欣賞東京鐵塔最美的地方' }
    },
    'Shibakoen': {
        title: { ja: '公園とタワー', en: 'Park & Tower', zh: '公園與鐵塔' },
        tagline: { ja: '緑豊かな公園と増上寺', en: 'Lush greenery with tower views', zh: '綠意盎然的公園與增上寺' }
    },
    'Tamachi': {
        title: { ja: '運河とキャンパス', en: 'Canal City', zh: '運河與校園' },
        tagline: { ja: '慶應義塾大学と芝浦運河', en: 'Waterfront business and education', zh: '慶應義塾大學與芝浦運河' }
    },
    'Gotanda': {
        title: { ja: '五反田バレー', en: 'Tech Valley', zh: '五反田谷' },
        tagline: { ja: 'ITベンチャーと隠れた美食', en: 'Startups and hidden gourmet spots', zh: 'IT新創企業與隱藏美食' }
    },
    'Osaki': {
        title: { ja: '未来的なオフィス街', en: 'Modern Business Park', zh: '未來辦公街' },
        tagline: { ja: '再開発されたビジネス拠点', en: 'Redeveloped oasis of offices', zh: '再開發的商務據點' }
    },
    'Meguro': {
        title: { ja: '桜とインテリア', en: 'Cherry Blossom River', zh: '櫻花與家飾' },
        tagline: { ja: '目黒川の桜並木と家具通り', en: 'Meguro River and interior design street', zh: '目黑川櫻花林蔭道與家具街' }
    },
    'Kamata': {
        title: { ja: '羽根つき餃子の街', en: 'Gyoza Town', zh: '冰花煎餃之街' },
        tagline: { ja: 'レトロな雰囲気と黒湯温泉', en: 'Retro atmosphere and famous dumplings', zh: '懷舊氛圍與黑湯溫泉' }
    },

    // --- Additional Tokyo Metro & Toei Subway ---
    'Gaiemmae': {
        title: { ja: '銀杏並木とスポーツ', en: 'Ginkgo Avenue & Sports', zh: '銀杏並木與體育' },
        tagline: { ja: '神宮外苑の銀杏並木とスタジアム', en: 'Famous ginkgo avenue and Jingu Stadium', zh: '神宮外苑銀杏並木與球場' }
    },
    'Akasaka-mitsuke': {
        title: { ja: '赤坂の玄関口', en: 'Akasaka Gateway', zh: '赤坂玄關' },
        tagline: { ja: 'ホテルと飲食店が並ぶ賑やかな街', en: 'Bustling dining and hotel district', zh: '飯店與餐飲店林立的熱鬧街道' }
    },
    'Kokkai-gijidomae': {
        title: { ja: '日本の政治の中心', en: 'Political Center', zh: '日本政治中心' },
        tagline: { ja: '国会議事堂と首相官邸の最寄り', en: 'National Diet and Prime Minister\'s Office', zh: '鄰近國會議事堂與首相官邸' }
    },
    'Hongo-sanchome': {
        title: { ja: '文豪と東大', en: 'Literary & Academic', zh: '文豪與東大' },
        tagline: { ja: '東京大学赤門と歴史ある旅館', en: 'UTokyo Red Gate and historic inns', zh: '東京大學赤門與歷史旅館' }
    },
    'Myogadani': {
        title: { ja: '文教地区の緑', en: 'Educational District', zh: '文教區的綠意' },
        tagline: { ja: 'お茶の水女子大学と小石川植物園', en: 'Universities and Koishikawa Botanical Garden', zh: '御茶水女子大學與小石川植物園' }
    },
    'Nishi-Nippori': {
        title: { ja: '山手線の高台', en: 'Yamanote Heights', zh: '山手線的高台' },
        tagline: { ja: '諏訪神社と下町の風景', en: 'Suwa Shrine and downtown views', zh: '諏訪神社與下町風景' }
    },
    'Sendagi': {
        title: { ja: '谷根千の散歩道', en: 'Yanesen Stroll', zh: '谷根千散步道' },
        tagline: { ja: 'レトロな商店街と猫の街', en: 'Retro shopping street and cats', zh: '懷舊商店街與貓之街' }
    },
    'Nezu': {
        title: { ja: '根津神社の門前町', en: 'Nezu Shrine Town', zh: '根津神社門前町' },
        tagline: { ja: 'つつじの名所と下町情緒', en: 'Azalea festival and downtown vibe', zh: '杜鵑花名勝與下町情懷' }
    },
    'Machiya': {
        title: { ja: '都電と下町', en: 'Toden & Downtown', zh: '都電與下町' },
        tagline: { ja: '都電荒川線が走る活気ある街', en: 'Lively town on the Toden line', zh: '都電荒川線行駛的活力街道' }
    },
    'Ayase': {
        title: { ja: '公園と住宅街', en: 'Park & Residential', zh: '公園與住宅區' },
        tagline: { ja: '東綾瀬公園と落ち着いた住環境', en: 'Higashi-Ayase Park and quiet living', zh: '東綾瀨公園與寧靜居住環境' }
    },
    'Kudanshita': {
        title: { ja: '歴史と武道', en: 'History & Martial Arts', zh: '歷史與武道' },
        tagline: { ja: '日本武道館と靖国神社の最寄り', en: 'Gateway to Budokan and Yasukuni Shrine', zh: '日本武道館與靖國神社最近車站' }
    },
    'Takebashi': {
        title: { ja: '皇居ランの拠点', en: 'Palace Run Hub', zh: '皇居路跑據點' },
        tagline: { ja: '毎日新聞社と近代美術館', en: 'Mainichi Shimbun and MOMAT', zh: '每日新聞社與近代美術館' }
    },
    'Nijubashimae': {
        title: { ja: '皇居の正門', en: 'Imperial Palace Gate', zh: '皇居正門' },
        tagline: { ja: '皇居二重橋と丸の内のオフィス街', en: 'Nijubashi Bridge and Marunouchi offices', zh: '皇居二重橋與丸之內辦公街' }
    },
    'Kiba': {
        title: { ja: '木材と公園', en: 'Wood & Parks', zh: '木材與公園' },
        tagline: { ja: '広大な木場公園と現代美術館', en: 'Vast Kiba Park and MOT', zh: '廣大木場公園與現代美術館' }
    },
    'Toyocho': {
        title: { ja: '江東区の中心', en: 'Heart of Koto Ward', zh: '江東區中心' },
        tagline: { ja: '区役所とビジネス街', en: 'Ward office and business hub', zh: '區公所與商務區' }
    },
    'Hatchobori': {
        title: { ja: '京葉線の乗換点', en: 'Gateway to Bay Area', zh: '灣區轉乘點' },
        tagline: { ja: 'ディズニーリゾートへのアクセス拠点', en: 'Access point to Disney Resort', zh: '前往迪士尼度假區的據點' }
    },
    'Tsukishima': {
        title: { ja: 'もんじゃストリート', en: 'Monja Street', zh: '文字燒街' },
        tagline: { ja: '下町グルメ「もんじゃ焼き」の聖地', en: 'Famous Monjayaki cuisine district', zh: '下町美食「文字燒」聖地' }
    },
    'Toyosu': {
        title: { ja: '市場とベイエリア', en: 'Market & Bay Area', zh: '市場與灣區' },
        tagline: { ja: '豊洲市場とららぽーと', en: 'Toyosu Market and Lalaport', zh: '豐洲市場與Lalaport商場' }
    },
    'Shin-Kiba': {
        title: { ja: '木の街とイベント', en: 'Timber & Events', zh: '木材與活動' },
        tagline: { ja: '貯木場とライブハウス', en: 'Lumber yards and concert venues', zh: '貯木場與Live House' }
    },
    'Kojimachi': {
        title: { ja: '静かなビジネス街', en: 'Quiet Business Hub', zh: '寧靜商務區' },
        tagline: { ja: '歴史ある屋敷跡とオフィス', en: 'Historic estates and modern offices', zh: '歷史宅邸遺跡與辦公室' }
    },
    'Sakuradamon': {
        title: { ja: '皇居と警視庁', en: 'Imperial Palace & Police', zh: '皇居與警視廳' },
        tagline: { ja: '桜田門外の変の舞台と警視庁', en: 'Sakuradamon Gate and MPD', zh: '櫻田門外之變舞台與警視廳' }
    },
    'Higashi-Ikebukuro': {
        title: { ja: 'サンシャインシティ', en: 'Sunshine City', zh: '太陽城' },
        tagline: { ja: '池袋のエンタメとショッピング', en: 'Entertainment complex and shopping', zh: '池袋的娛樂與購物中心' }
    },
    'Gokokuji': {
        title: { ja: '寺院と出版社', en: 'Temple & Publishing', zh: '寺院與出版社' },
        tagline: { ja: '護国寺と講談社', en: 'Gokokuji Temple and Kodansha', zh: '護國寺與講談社' }
    },
    'Edogawabashi': {
        title: { ja: '印刷と桜', en: 'Printing & Cherry Blossoms', zh: '印刷與櫻花' },
        tagline: { ja: '神田川沿いの桜並木と印刷会社', en: 'Kanda River cherry blossoms and printing', zh: '神田川沿岸櫻花與印刷公司' }
    },
    'Komagome': {
        title: { ja: '庭園の街', en: 'Garden City', zh: '庭園之街' },
        tagline: { ja: '六義園とソメイヨシノ発祥の地', en: 'Rikugien Garden and cherry blossom origin', zh: '六義園與染井吉野櫻發源地' }
    },
    'Nishigahara': {
        title: { ja: '洋館と庭園', en: 'Western Villa & Garden', zh: '洋館與庭園' },
        tagline: { ja: '旧古河庭園のバラと洋館', en: 'Kyu-Furukawa Gardens and roses', zh: '舊古河庭園的玫瑰與洋館' }
    },
    'Oji': {
        title: { ja: '飛鳥山の桜', en: 'Asukayama Cherry Blossoms', zh: '飛鳥山櫻花' },
        tagline: { ja: '都電と桜の名所', en: 'Toden tram and famous cherry blossoms', zh: '都電與賞櫻名所' }
    },
    'Roppongi-itchome': {
        title: { ja: '泉ガーデン', en: 'Izumi Garden', zh: '泉花園' },
        tagline: { ja: '緑豊かな再開発エリアと美術館', en: 'Green redevelopment and museums', zh: '綠意盎然的再開發區與美術館' }
    },
    'Sengakuji': {
        title: { ja: '赤穂浪士の墓所', en: '47 Ronin Temple', zh: '赤穗浪士墓所' },
        tagline: { ja: '泉岳寺と新しい駅の開発', en: 'Sengakuji Temple and new development', zh: '泉岳寺與新車站開發' }
    },
    'Mita': {
        title: { ja: '慶応大学の街', en: 'Keio University Town', zh: '慶應大學之街' },
        tagline: { ja: '東京タワーが見える学生街', en: 'Student town with Tokyo Tower views', zh: '看得見東京鐵塔的學生街' }
    },
    'Onarimon': {
        title: { ja: '東京タワーの玄関', en: 'Tower Gateway', zh: '鐵塔玄關' },
        tagline: { ja: '増上寺と芝公園に近い', en: 'Near Zojoji Temple and Shiba Park', zh: '鄰近增上寺與芝公園' }
    },
    'Uchisaiwaicho': {
        title: { ja: '日比谷公園の南', en: 'South Hibiya', zh: '日比谷公園南' },
        tagline: { ja: '帝国ホテルとビジネス街', en: 'Imperial Hotel and business district', zh: '帝國飯店與商務區' }
    },
    'Suitengumae': {
        title: { ja: '安産祈願', en: 'Safe Childbirth', zh: '安產祈願' },
        tagline: { ja: '水天宮と下町情緒', en: 'Suitengu Shrine and downtown vibes', zh: '水天宮與下町情懷' }
    },
    'Sumiyoshi': {
        title: { ja: '猿江恩賜公園', en: 'Sarue Park', zh: '猿江恩賜公園' },
        tagline: { ja: '広大な公園と住宅街', en: 'Large park and residential area', zh: '廣大公園與住宅區' }
    },
    'Asakusabashi': {
        title: { ja: '人形と問屋', en: 'Dolls & Wholesale', zh: '人形與批發' },
        tagline: { ja: '伝統工芸品とビーズの問屋街', en: 'Traditional crafts and bead shops', zh: '傳統工藝品與串珠批發街' }
    },
    'Higashi-ginza': {
        title: { ja: '歌舞伎座', en: 'Kabukiza Theater', zh: '歌舞伎座' },
        tagline: { ja: '日本の伝統芸能と銀座の奥座敷', en: 'Traditional theater and Ginza cuisine', zh: '日本傳統藝能與銀座美食' }
    },
    'Takaracho': {
        title: { ja: '京橋のビジネス街', en: 'Kyobashi Business', zh: '京橋商務區' },
        tagline: { ja: '映画センターと骨董通りに近い', en: 'Near Film Center and antique street', zh: '鄰近電影中心與古董街' }
    },
    'Shintomicho': {
        title: { ja: '築地の隣', en: 'Next to Tsukiji', zh: '築地隔壁' },
        tagline: { ja: '区役所と静かな下町', en: 'Ward office and quiet downtown', zh: '區公所與寧靜下町' }
    },
    'Kachidoki': {
        title: { ja: '勝鬨橋とタワー', en: 'Kachidoki Bridge', zh: '勝鬨橋與高塔' },
        tagline: { ja: '隅田川の最下流と高層マンション', en: 'Sumida River mouth and high-rises', zh: '隅田川最下游與高層公寓' }
    },
    'Shiodome': {
        title: { ja: '汐留シオサイト', en: 'Shiodome Siosite', zh: '汐留Siosite' },
        tagline: { ja: '再開発された摩天楼とメディア', en: 'Redeveloped skyscrapers and media', zh: '再開發摩天樓與媒體' }
    },
    'Daimon': {
        title: { ja: '増上寺の大門', en: 'Great Gate of Zojoji', zh: '增上寺大門' },
        tagline: { ja: '東京タワーと増上寺の参道', en: 'Approach to Zojoji and Tokyo Tower', zh: '東京鐵塔與增上寺參道' }
    },
    'Kokuritsu-kyogijo': {
        title: { ja: 'オリンピックスタジアム', en: 'Olympic Stadium', zh: '奧運體育場' },
        tagline: { ja: '国立競技場と神宮外苑', en: 'National Stadium and Jingu Gaien', zh: '國立競技場與神宮外苑' }
    },
    'Yoyogi-koen': {
        title: { ja: '代々木公園', en: 'Yoyogi Park', zh: '代代木公園' },
        tagline: { ja: '広大な緑とイベント広場', en: 'Vast greenery and event plaza', zh: '廣大綠地與活動廣場' }
    },
    'Nishi-Shinjuku': {
        title: { ja: '新宿副都心', en: 'Shinjuku Skyscraper District', zh: '新宿副都心' },
        tagline: { ja: '超高層ビルとホテル群', en: 'Skyscrapers and luxury hotels', zh: '超高層大樓與飯店群' }
    },
    'Tochomae': {
        title: { ja: '東京都庁', en: 'Tokyo Metro Govt', zh: '東京都廳' },
        tagline: { ja: '展望台と中央公園', en: 'Observatory and Central Park', zh: '展望台與中央公園' }
    },
    'Shinjuku-sanchome': {
        title: { ja: '新宿のショッピング', en: 'Shinjuku Shopping', zh: '新宿購物' },
        tagline: { ja: '伊勢丹と新宿御苑に近い', en: 'Isetan and Shinjuku Gyoen', zh: '伊勢丹與新宿御苑' }
    },
    'Shinjuku-gyoemmae': {
        title: { ja: '都会のオアシス', en: 'Urban Garden Oasis', zh: '都會花園綠洲' },
        tagline: { ja: '新宿御苑の豊かな自然', en: 'Nature of Shinjuku Gyoen', zh: '新宿御苑的豐富自然' }
    },
    'Yotsuya-sanchome': {
        title: { ja: '消防博物館', en: 'Fire Museum', zh: '消防博物館' },
        tagline: { ja: 'おもちゃ美術館と荒木町', en: 'Toy Museum and Araki-cho dining', zh: '玩具美術館與荒木町美食' }
    },
    'Kita-sando': {
        title: { ja: 'ダガヤサンドウ', en: 'Dagaya-sando', zh: '千駄谷表參道' },
        tagline: { ja: 'アパレルとカフェの街', en: 'Fashion offices and cafes', zh: '服飾與咖啡之街' }
    },
    'Meiji-jingumae': {
        title: { ja: '原宿の交差点', en: 'Harajuku Crossing', zh: '原宿交差點' },
        tagline: { ja: '表参道と明治通り', en: 'Omotesando and Meiji-dori', zh: '表參道與明治通' }
    },
    'Nogizaka': {
        title: { ja: '美術館と乃木神社', en: 'Art Center & Shrine', zh: '美術館與乃木神社' },
        tagline: { ja: '国立新美術館と乃木神社', en: 'National Art Center and Nogi Shrine', zh: '國立新美術館與乃木神社' }
    },
    'Tameike-sanno': {
        title: { ja: '首相官邸前', en: 'Prime Minister\'s Office', zh: '首相官邸前' },
        tagline: { ja: '日本の政治と経済の中心', en: 'Center of politics and economy', zh: '日本政治與經濟中心' }
    },
    'Minami-Senju': {
        title: { ja: '変貌する街', en: 'Transforming Town', zh: '變貌之街' },
        tagline: { ja: '高層マンションと歴史ある貨物駅', en: 'High-rises and historic freight terminal', zh: '高層公寓與歷史貨運站' }
    },
    'Shin-Ochanomizu': {
        title: { ja: '聖橋とニコライ堂', en: 'Hijiri Bridge', zh: '聖橋與尼古拉堂' },
        tagline: { ja: '学生街と歴史的建築', en: 'Student town and historic architecture', zh: '學生街與歷史建築' }
    },
    'Nakano': {
        title: { ja: 'サブカルの聖地', en: 'Subculture Broadway', zh: '次文化聖地' },
        tagline: { ja: '中野ブロードウェイと時計・フィギュアの街', en: 'Nakano Broadway, watches, and figures', zh: '中野百老匯與鐘錶公仔之街' }
    },
    'Tawaramachi': {
        title: { ja: 'かっぱ橋道具街', en: 'Kitchenware Town', zh: '合羽橋道具街' },
        tagline: { ja: 'プロ用調理器具と食品サンプルの街', en: 'Pro kitchenware and plastic food samples', zh: '專業餐具與食物模型之街' }
    },
    'Inaricho': {
        title: { ja: '仏壇と下町', en: 'Shrines & Altars', zh: '佛壇與下町' },
        tagline: { ja: '仏壇通りと下町の銭湯', en: 'Buddhist altars street and public baths', zh: '佛壇街與下町錢湯' }
    },
    'Suehirocho': {
        title: { ja: '秋葉原の北', en: 'North Akihabara', zh: '秋葉原北' },
        tagline: { ja: 'ジャンク通りと神田明神下', en: 'Tech junk street near Kanda Myojin', zh: '電子零件街與神田明神下' }
    },
    'Iriya': {
        title: { ja: '朝顔の街', en: 'Morning Glory', zh: '朝顏之花' },
        tagline: { ja: '入谷鬼子母神と朝顔市', en: 'Iriya Kishimojin and Morning Glory Fair', zh: '入谷鬼子母神與朝顏市' }
    },
    'Kodemmacho': {
        title: { ja: '江戸の歴史', en: 'Edo History', zh: '江戶歷史' },
        tagline: { ja: '伝馬町牢屋敷跡と繊維問屋', en: 'Historic prison site and textile wholesale', zh: '傳馬町牢屋敷跡與纖維批發' }
    },
    'Mitsukoshimae': {
        title: { ja: '日本橋室町', en: 'Historic Department Store', zh: '日本橋室町' },
        tagline: { ja: '三越本店と日本銀行', en: 'Mitsukoshi Main Store and Bank of Japan', zh: '三越本店與日本銀行' }
    },
    'Nakano-sakaue': {
        title: { ja: '高層ビルと住宅', en: 'Skyscrapers & Homes', zh: '高樓與住宅' },
        tagline: { ja: 'オフィス街と静かな住宅地の境界', en: 'Office towers meeting quiet residential', zh: '辦公區與寧靜住宅區的交界' }
    },
    'Minami-Sunamachi': {
        title: { ja: 'ショッピングと緑', en: 'Malls & Greenery', zh: '購物與綠地' },
        tagline: { ja: '大型ショッピングモールと公園', en: 'Large shopping malls and parks', zh: '大型購物中心與公園' }
    },
    'Nishi-Kasai': {
        title: { ja: 'リトルインディア', en: 'Little India', zh: '小印度' },
        tagline: { ja: 'インド料理と江戸川区の自然', en: 'Authentic Indian food and nature', zh: '印度料理與江戶川區自然' }
    },
    'Kasai': {
        title: { ja: '地下鉄博物館', en: 'Subway Museum', zh: '地下鐵博物館' },
        tagline: { ja: '地下鉄の歴史と公園', en: 'Metro history and parks', zh: '地下鐵歷史與公園' }
    },
    'Zoshigaya': {
        title: { ja: '鬼子母神と都電', en: 'Old Tokyo Tram', zh: '鬼子母神與都電' },
        tagline: { ja: '鬼子母神堂とレトロな街並み', en: 'Kishimojin temple and retro streets', zh: '鬼子母神堂與懷舊街道' }
    },
    'Honjo-azumabashi': {
        title: { ja: 'スカイツリーの足元', en: 'Skytree View', zh: '晴空塔腳下' },
        tagline: { ja: '吾妻橋とアサヒビール本社', en: 'Azuma Bridge and Asahi Beer Hall', zh: '吾妻橋與朝日啤酒總部' }
    },
    'Higashi-nihombashi': {
        title: { ja: '問屋街の中心', en: 'Wholesale Hub', zh: '批發街中心' },
        tagline: { ja: '衣料品問屋と歴史ある街', en: 'Clothing wholesale district', zh: '服飾批發與歷史之街' }
    },
    'Togoshi': {
        title: { ja: '戸越銀座', en: 'Longest Arcade', zh: '戶越銀座' },
        tagline: { ja: '東京一長い商店街', en: 'Tokyo\'s longest shopping street', zh: '東京最長的商店街' }
    },
    'Hakusan': {
        title: { ja: 'あじさいの街', en: 'Hydrangea Town', zh: '紫陽花之街' },
        tagline: { ja: '白山神社と大学', en: 'Hakusan Shrine and Toyo University', zh: '白山神社與東洋大學' }
    },
    'Morishita': {
        title: { ja: '下町の交差点', en: 'Shitamachi Crossroads', zh: '下町十字路口' },
        tagline: { ja: '芭蕉記念館と深川の歴史', en: 'Basho Museum and Fukagawa history', zh: '芭蕉紀念館與深川歷史' }
    },
    'Funabori': {
        title: { ja: 'タワーホール', en: 'Tower Hall', zh: '船堀塔' },
        tagline: { ja: '展望塔と江戸川区の眺望', en: 'Observation tower and Edogawa views', zh: '展望塔與江戶川區眺望' }
    },
    'Higashi-shinjuku': {
        title: { ja: '多文化の街', en: 'Multicultural Hub', zh: '多文化之街' },
        tagline: { ja: 'コリアンタウンと新しいホテル', en: 'Korea Town extension and new hotels', zh: '韓國城延伸與新飯店' }
    },
    'Hikarigaoka': {
        title: { ja: '光の公園都市', en: 'Park City', zh: '光之公園都市' },
        tagline: { ja: '広大な光が丘公園と団地', en: 'Massive Hikarigaoka Park and housing', zh: '廣大光之丘公園與住宅團地' }
    },
    'Tsukijishijo': {
        title: { ja: '市場の記憶', en: 'Market Legacy', zh: '市場的記憶' },
        tagline: { ja: '築地市場跡地と朝日新聞', en: 'Former market site and Asahi Shimbun', zh: '築地市場舊址與朝日新聞' }
    },
    'Ochiai': {
        title: { ja: '住宅と川', en: 'Quiet Riverside', zh: '住宅與河川' },
        tagline: { ja: '神田川と静かな住宅街', en: 'Kanda River and quiet homes', zh: '神田川與寧靜住宅街' }
    },
    'AkabaneIwabuchi': {
        title: { ja: '北東京の玄関', en: 'Gateway to North Tokyo', zh: '北東京玄關' },
        tagline: { ja: '荒川沿いに広がる街、埼玉方面への入口', en: 'Riverside station linking Tokyo and Saitama', zh: '沿著荒川的生活圈，通往埼玉的入口' }
    },
    'Awajicho': {
        title: { ja: '神田の路地', en: 'Kanda Backstreets', zh: '神田巷弄' },
        tagline: { ja: '楽器店や老舗が残る、御茶ノ水・神保町の間', en: 'Music shops and long-standing businesses near Ochanomizu', zh: '御茶之水與神保町之間，樂器街與老舖林立' }
    },
    'BarakiNakayama': {
        title: { ja: '郊外の生活拠点', en: 'Suburban Living Hub', zh: '郊區生活據點' },
        tagline: { ja: '中山エリアの住宅街と商業施設が身近', en: 'Residential area with everyday shopping nearby', zh: '中山周邊住宅區與日常採買機能' }
    },
    'ChikatetsuAkatsuka': {
        title: { ja: '板橋の緑', en: 'Itabashi Green', zh: '板橋綠意' },
        tagline: { ja: '公園と住宅街が広がる、落ち着いた暮らしの街', en: 'Quiet neighborhoods with parks and local streets', zh: '公園與住宅區交織的沉靜生活圈' }
    },
    'ChikatetsuNarimasu': {
        title: { ja: '成増の玄関', en: 'Narimasu Gateway', zh: '成增玄關' },
        tagline: { ja: '商店街と住宅が共存し、埼玉方面へも近い', en: 'Shopping streets and homes near the Saitama border', zh: '商店街與住宅共存，亦是通往埼玉的近郊入口' }
    },
    'GinzaItchome': {
        title: { ja: '銀座の入口', en: 'Entrance to Ginza', zh: '銀座入口' },
        tagline: { ja: '老舗百貨と新しいギャラリーが交差する街角', en: 'Where classic department stores meet modern galleries', zh: '老牌百貨與新興藝廊交會的街角' }
    },
    'Gyotoku': {
        title: { ja: '水辺の下町', en: 'Riverside Old Town', zh: '水岸下町' },
        tagline: { ja: '旧街道と寺社が残る、江戸の面影を感じる街', en: 'Historic streets and temples with an old-town feel', zh: '保留舊街道與寺社，仍可感受江戶風情' }
    },
    'Heiwadai': {
        title: { ja: '穏やかな住宅街', en: 'Quiet Neighborhoods', zh: '沉靜住宅區' },
        tagline: { ja: '緑の多い街並みと暮らしやすさが魅力', en: 'Green streets and comfortable everyday living', zh: '綠意街景與宜居氛圍' }
    },
    'HigashiKoenji': {
        title: { ja: '高円寺カルチャー', en: 'Koenji Culture', zh: '高圓寺文化' },
        tagline: { ja: 'ライブハウスと古着、個性が集まる街', en: 'Live music venues, vintage shops, and indie vibes', zh: 'Live House、古著店與獨立氣質聚集' }
    },
    'Hikawadai': {
        title: { ja: '静かな住宅地', en: 'Calm Residential Stop', zh: '寧靜住宅站' },
        tagline: { ja: '落ち着いた街並みと身近な緑が続く', en: 'A calm area with familiar greenery and local streets', zh: '安靜街區與隨處可見的綠意' }
    },
    'HonKomagome': {
        title: { ja: '庭園の入口', en: 'Gateway to Gardens', zh: '庭園入口' },
        tagline: { ja: '六義園などの名園に近い、静かな文教エリア', en: 'Quiet academic area near Rikugien and historic gardens', zh: '鄰近六義園等名園的靜謐文教區' }
    },
    'Kanamecho': {
        title: { ja: '池袋の隣町', en: 'Neighbor to Ikebukuro', zh: '池袋隔壁' },
        tagline: { ja: '都心の近さと生活感が同居する住宅街', en: 'Residential streets balancing city access and local life', zh: '兼具都心便利與生活感的住宅街' }
    },
    'KitaAyase': {
        title: { ja: '千代田線の支線', en: 'Chiyoda Line Branch', zh: '千代田線支線' },
        tagline: { ja: '足立の住宅街へつながる、落ち着いた終着エリア', en: 'A calm terminus connecting to Adachi neighborhoods', zh: '連接足立住宅區的沉靜終點站' }
    },
    'KotakeMukaihara': {
        title: { ja: '住宅地の乗換点', en: 'Residential Transfer Point', zh: '住宅區轉乘點' },
        tagline: { ja: '二つの路線が交差する、穏やかな街の結節', en: 'Two-line interchange in a calm neighborhood', zh: '兩線交會的寧靜住宅圈轉乘點' }
    },
    'MinamiAsagaya': {
        title: { ja: '杉並の行政中心', en: 'Suginami Civic Center', zh: '杉並行政中心' },
        tagline: { ja: '区役所と阿佐ヶ谷の商店街が身近', en: 'Ward offices and Asagaya shopping arcade nearby', zh: '區役所與阿佐谷商店街近在咫尺' }
    },
    'MinamiGyotoku': {
        title: { ja: '湾岸の暮らし', en: 'Bay Area Living', zh: '灣岸生活' },
        tagline: { ja: '公園と住宅街が広がる、家族で暮らしやすい街', en: 'Parks and residential streets ideal for everyday life', zh: '公園與住宅區延展，適合日常生活的街區' }
    },
    'Myoden': {
        title: { ja: '整備された街並み', en: 'Planned Suburban Town', zh: '規劃完善的街區' },
        tagline: { ja: '新しい住宅地と生活利便が揃うエリア', en: 'Modern residential area with daily conveniences', zh: '新興住宅區與完善生活機能' }
    },
    'NakaOkachimachi': {
        title: { ja: '上野・秋葉原の間', en: 'Between Ueno & Akihabara', zh: '上野與秋葉原之間' },
        tagline: { ja: 'アメ横や問屋街へ歩ける、下町の動線', en: 'Walkable access to Ameyoko and wholesale streets', zh: '步行可達阿美橫與批發街的下町動線' }
    },
    'Nihombashi': {
        title: { ja: '江戸の中心地', en: 'Heart of Edo', zh: '江戶中心' },
        tagline: { ja: '老舗の商いと金融の街、日本橋の歴史', en: 'Historic merchants and the finance district of Nihombashi', zh: '老舖商家與金融街交織的日本橋歷史' }
    },
    'NishiFunabashi': {
        title: { ja: '千葉の巨大乗換', en: 'Major Chiba Interchange', zh: '千葉大型轉乘' },
        tagline: { ja: 'JRと地下鉄が交差する、通勤動線の要所', en: 'Key transfer hub linking JR lines and the subway', zh: 'JR 與地鐵交會的通勤動線樞紐' }
    },
    'NishiWaseda': {
        title: { ja: '早稲田の学生街', en: 'Waseda Student Area', zh: '早稻田學區' },
        tagline: { ja: '大学の空気が漂う、学びと文化の街', en: 'Academic atmosphere with learning and culture nearby', zh: '校園書香濃厚的學術與文化街區' }
    },
    'Ogikubo': {
        title: { ja: '中央線と丸ノ内線', en: 'Chuo Line Junction', zh: '中央線轉乘' },
        tagline: { ja: '商店街と住みやすさが揃う、杉並の拠点', en: 'Shopping streets and livability in Suginami', zh: '商店街與宜居氛圍兼具的杉並據點' }
    },
    'OjiKamiya': {
        title: { ja: '北区の静けさ', en: 'Quiet Kita Ward', zh: '北區靜謐' },
        tagline: { ja: '公園に近い落ち着いた住宅街', en: 'Calm residential area near parks and greenery', zh: '鄰近公園綠地的沉靜住宅區' }
    },
    'Senkawa': {
        title: { ja: '住宅街の小さな結節', en: 'Neighborhood Junction', zh: '住宅區小樞紐' },
        tagline: { ja: '暮らしの匂いが残る、穏やかな街並み', en: 'Calm streets with a strong local-life feel', zh: '生活感濃厚、街景沉靜舒適' }
    },
    'Shimo': {
        title: { ja: '北区の下町', en: 'Kita Ward Downtown', zh: '北區下町' },
        tagline: { ja: '荒川に近い、昔ながらの暮らしが続く街', en: 'Traditional neighborhood life near the Arakawa River', zh: '靠近荒川、延續傳統生活樣貌的街區' }
    },
    'ShinKoenji': {
        title: { ja: '阿波おどりの街', en: 'Awa Odori Town', zh: '阿波舞之街' },
        tagline: { ja: '高円寺阿波おどりで知られる活気ある街', en: 'Known for the Koenji Awa Odori festival and local energy', zh: '以高圓寺阿波舞祭聞名的活力街區' }
    },
    'ShinNakano': {
        title: { ja: '中野の住宅街', en: 'Calm Nakano Area', zh: '中野住宅區' },
        tagline: { ja: '都心アクセスと落ち着きが両立する街', en: 'Balanced city access and a relaxed neighborhood feel', zh: '兼具都心便利與悠閒氛圍的街區' }
    },
    'ShinOtsuka': {
        title: { ja: '文京の入口', en: 'Bunkyo Gateway', zh: '文京入口' },
        tagline: { ja: '住宅街と学校が点在する静かなエリア', en: 'Quiet area with homes and schools nearby', zh: '住宅與學校點綴的安靜區域' }
    },
    'Tatsumi': {
        title: { ja: '湾岸のスポーツパーク', en: 'Bayfront Sports Park', zh: '灣岸運動公園' },
        tagline: { ja: '辰巳の森海浜公園とスポーツ施設の玄関口', en: 'Gateway to Tatsumi-no-Mori Seaside Park and venues', zh: '辰巳之森海濱公園與運動設施的入口' }
    },
    'ToranomonHills': {
        title: { ja: '虎ノ門再開発', en: 'Toranomon Redevelopment', zh: '虎之門再開發' },
        tagline: { ja: '超高層ビルが集まる、新しいビジネス中枢', en: 'Skyscrapers and a newly built business core', zh: '摩天樓林立的新興商務核心' }
    },
    'UenoHirokoji': {
        title: { ja: '上野広小路', en: 'Ueno Hirokoji', zh: '上野廣小路' },
        tagline: { ja: 'アメ横と上野公園へ続く、にぎわいの動線', en: 'Bustling route toward Ameyoko and Ueno Park', zh: '通往阿美橫與上野公園的熱鬧動線' }
    },
    'Urayasu': {
        title: { ja: 'ディズニーの玄関', en: 'Gateway to Disney', zh: '迪士尼玄關' },
        tagline: { ja: '東京ディズニーリゾート方面へのアクセスで知られる', en: 'Known for convenient access toward Tokyo Disney Resort', zh: '以通往東京迪士尼度假區的便利性聞名' }
    },
    'Wakoshi': {
        title: { ja: '埼玉への玄関', en: 'Saitama Gateway', zh: '埼玉玄關' },
        tagline: { ja: '都心直通の始発駅として発展する街', en: 'A starting point to central Tokyo in a growing city', zh: '直通都心的始發站，發展中的城市據點' }
    },
    'YoyogiUehara': {
        title: { ja: '都心と郊外の結節', en: 'Urban-Suburban Junction', zh: '都心與郊外交會' },
        tagline: { ja: '小田急線と千代田線の乗換、落ち着いた街並み', en: 'Odakyu and Chiyoda transfer in a calm neighborhood', zh: '小田急與千代田轉乘，街區氛圍沉靜' }
    },
    'Hamacho': {
        title: { ja: '浜町公園', en: 'Hamacho Park', zh: '濱町公園' },
        tagline: { ja: '隅田川と下町の緑、江戸の面影が残る街', en: 'Riverside greenery with an old downtown feel', zh: '隅田川畔的綠意與下町氣息' }
    },
    'Iwamotocho': {
        title: { ja: 'ものづくりと商い', en: 'Craft & Commerce', zh: '匠心與商業' },
        tagline: { ja: '秋葉原と神田の間、問屋とオフィスが混ざる街', en: 'Between Akihabara and Kanda with mixed wholesale and offices', zh: '位於秋葉原與神田之間，批發與辦公共存' }
    },
    'Ogawamachi': {
        title: { ja: '古書とカレーの界隈', en: 'Books & Curry District', zh: '古書與咖哩街區' },
        tagline: { ja: '神保町に近い、喫茶と書店が集まるエリア', en: 'Near Jimbocho, lined with cafes and bookstores', zh: '鄰近神保町，咖啡館與書店聚集' }
    },
    'Nerima': {
        title: { ja: 'アニメの街', en: 'Anime Town', zh: '動畫之街' },
        tagline: { ja: '創作文化と住宅街が共存する練馬の中心', en: 'Creative culture and residential life in central Nerima', zh: '創作文化與住宅生活共存的練馬中心' }
    },
    'Akabane': {
        title: { ja: '北の交通結節', en: 'North Tokyo Interchange', zh: '北東京轉乘樞紐' },
        tagline: { ja: '赤羽一番街の賑わいと、都心へ伸びる路線網', en: 'Lively Akabane Ichibangai and extensive rail links', zh: '赤羽一番街的熱鬧與通往都心的路線網' }
    },
    'UenoOkachimachi': {
        title: { ja: 'アメ横の西側', en: 'Ameyoko West Side', zh: '阿美橫西側' },
        tagline: { ja: '上野と御徒町を結ぶ、買い物と下町の動線', en: 'Shopping corridor linking Ueno and Okachimachi', zh: '連結上野與御徒町的購物與下町動線' }
    },
    'ShinOkachimachi': {
        title: { ja: '上野の裏動線', en: 'Ueno Backstreet Route', zh: '上野後巷動線' },
        tagline: { ja: 'かっぱ橋や下町の小路へつながる、静かな乗換エリア', en: 'A quieter transfer area linking to Kappabashi and local streets', zh: '通往合羽橋與下町小路的安靜轉乘區' }
    },
};
