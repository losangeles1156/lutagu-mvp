export interface DemoStep {
  user: string;
  agent: string;
  action?: string;
  tools?: string[];
  links?: { label: string; url: string }[];
  // Localized overrides
  user_en?: string;
  agent_en?: string;
  user_ja?: string;
  agent_ja?: string;
}

export interface DemoScenario {
  id: string;
  title: string;
  title_ja?: string;
  title_en?: string;
  triggerQuestion: string;
  triggerQuestions?: string[]; // Optional additional triggers for other languages
  steps: DemoStep[];
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: '01_overtourism',
    title: '解決過度觀光：從使用者感受出發的在地避人建議',
    title_ja: 'オーバーツーリズムの解決：ユーザーの感性に寄り添ったローカルな穴場提案',
    title_en: 'Solving Overtourism: Local Hidden Gem Recommendations Based on User Feelings',
    triggerQuestion: '淺草寺這裡人潮多到有點不舒服，附近有沒有人少一點，但也能感受江戶風情的地方？',
    triggerQuestions: [
      'Senso-ji is so crowded it\'s uncomfortable. Are there any less crowded spots nearby that still have that Edo-period vibe?',
      '浅草寺は混雑していて少し不快なのですが、近くに人が少なめで江戸の風情を感じられる場所はありますか？'
    ],
    steps: [
      {
        user: '淺草寺這裡人潮多到有點不舒服，附近有沒有人少一點，但也能感受江戶風情的地方？',
        user_ja: '浅草寺は混雑していて少し不快なのですが、近くに人が少なめで江戸の風情を感じられる場所はありますか？',
        user_en: 'Senso-ji is so crowded it\'s uncomfortable. Are there any less crowded spots nearby that still have that Edo-period vibe?',
        agent: '非常理解您的感受，淺草地區在假日的人潮確實會影響旅遊品質。\n\n若您想避開人潮並深入感受江戶下町氛圍，我根據專家知識庫為您精選了三個方案：\n\n---\n\n### 🏮 推薦方案 A：今戶神社 (Imado Jinja)\n*   特色：避開主幹道的深度在地選擇，以「招財貓」發源地聞名。\n*   交通：步行或體驗在地人力車即可抵達。\n\n### ⛩️ 推薦方案 B：根津神社 (Nezu Jinja)\n*   特色：擁有壯觀的千本鳥居，氛圍極其寧靜優雅。\n*   交通：搭乘地鐵轉乘約 15 分鐘。\n\n### 🚋 推薦方案 C：柴又帝釋天 (Shibamata Taishakuten)\n*   特色：完美的懷舊老街參道，步調悠閒，適合深度慢遊。\n*   交通：搭乘京成線電車前往。\n\n---\n\n請問您對哪一個方案比較有興趣？我可以為您提供更詳細的路線指引。',
        agent_ja: 'お気持ちはよくわかります。浅草エリアは休日、確かに混雑が激しく、観光の質に影響することがありますね。\n\n人混みを避けて、江戸の下町の雰囲気を深く味わいたいのであれば、エキスパート知識ベースから3つのプランを厳選しました：\n\n---\n\n### 🏮 おすすめプラン A：今戸神社 (Imado Jinja)\n* 特徴：大通りを避けたディープな地元スポット。「招き猫」発祥の地として知られています。\n* 交通：徒歩、または人力車での移動がおすすめです。\n\n### ⛩️ おすすめプラン B：根津神社 (Nezu Jinja)\n* 特徴：壮観な千本鳥居があり、非常に静かで優雅な雰囲気です。\n* 交通：地下鉄で約15分です。\n\n### 🚋 おすすめプラン C：柴又帝釈天 (Shibamata Taishakuten)\n* 特徴：完璧なノスタルジックな参道があり、のんびりとしたペースで散策できます。\n* 交通：京成線で向かいます。\n\n---\n\nどのプランに興味がありますか？より詳細なルート案内も可能です。',
        agent_en: 'I completely understand. The crowds in Asakusa on holidays can indeed impact the quality of your visit.\n\nIf you\'d like to escape the crowds and immerse yourself in the Edo shitamachi atmosphere, I\'ve selected three options for you based on our expert knowledge base:\n\n---\n\n### 🏮 Option A: Imado Jinja\n*   Feature: A deep local choice off the main path, famous as the birthplace of "Maneki-neko".\n*   Access: Reachable by foot or a local rickshaw experience.\n\n### ⛩️ Option B: Nezu Jinja\n*   Feature: Home to spectacular Thousand Torii Gates, with an extremely peaceful and elegant atmosphere.\n*   Access: About 15 minutes by subway.\n\n### 🚋 Option C: Shibamata Taishakuten\n*   Feature: A perfect nostalgic temple approach with a leisurely pace, ideal for deep exploration.\n*   Access: Accessible via the Keisei Line.\n\n---\n\nWhich option interests you? I can provide more detailed route guidance for any of these.',
        tools: ['專家知識庫 (Expert Knowledge)', '步行導航']
      },
      {
        user: '去根津神社轉乘會很麻煩嗎？我怕在車站迷路。',
        user_ja: '根津神社への乗り換えは大変ですか？駅で迷うのが心配です。',
        user_en: 'Is the transfer to Nezu Jinja complicated? I\'m worried about getting lost in the station.',
        agent: '別擔心！根津神社的轉乘非常單純。我會為您標註最簡單的轉乘月台編號與出口資訊，確保您不會在車站迷路。\n\n此外，如果您想先在淺草附近試試，要不要先幫您查詢往 今戶神社 的人力車搭乘點與預估費用？這是一個非常具有在地風情的移動方式。',
        agent_ja: 'ご安心ください！根津神社への乗り換えは非常にシンプルです。駅で迷わないよう、最も簡単な乗り換えホームの番号と出口情報をご案内します。\n\nまた、まずは浅草付近で試してみたい場合は、今戸神社への人力車の乗り場と推定料金をお調べしましょうか？とても風情のある移動手段ですよ。',
        agent_en: 'Don\'t worry! The transfer to Nezu Jinja is very straightforward. I will mark the easiest transfer platform numbers and exit information for you to ensure you don\'t get lost in the station.\n\nAlso, if you\'d like to try something near Asakusa first, would you like me to look up the rickshaw pickup point and estimated cost for Imado Jinja? It\'s a very local and atmospheric way to get around.',
        action: '切換至步行/人力車推薦模式'
      }
    ]
  },
  {
    id: '02_disruption',
    title: '應對交通中斷：專家知識引導的最優決策',
    title_ja: '交通機関の乱れへの対応：専門知識に基づいた最適な意思決定',
    title_en: 'Handling Traffic Disruptions: Optimal Decision Making Guided by Expert Knowledge',
    triggerQuestion: '我要從東京車站去東京都廳看夜景，但聽說中央線現在大誤點，該怎麼辦？',
    triggerQuestions: [
      'I\'m going to the Tokyo Metropolitan Government Building for the night view, but I heard the Chuo Line is delayed. What should I do?',
      '東京駅から東京都庁へ夜景を見に行きたいのですが、中央線が大幅に遅れていると聞きました。どうすればいいですか？'
    ],
    steps: [
      {
        user: '我要從東京車站去東京都廳看夜景，但聽說中央線現在大誤點，該怎麼辦？',
        user_ja: '東京駅から東京都庁へ夜景を見に行きたいのですが、中央線が大幅に遅れていると聞きました。どうすればいいですか？',
        user_en: 'I\'m going to the Tokyo Metropolitan Government Building for the night view, but I heard the Chuo Line is delayed. What should I do?',
        agent: '收到！系統偵測到目前 JR 中央快速線 確實發生人員事故，導致大規模延誤。\n\n為了不耽誤您的夜景行程，我強烈建議您改用以下專家備選方案：\n\n1.  改搭路線：地鐵 丸之內線 (Marunouchi Line)\n2.  上車車站：東京站 (M17)\n3.  下車車站：西新宿站 (M07)\n\n這條路線完全不受 JR 延誤影響，且轉乘路徑更為直接。',
        agent_ja: '了解しました！システムが現在、JR中央快速線で人身事故が発生し、大幅な遅延が出ていることを検知しました。\n\n夜景の予定を遅らせないために、以下のエキスパート代替案を強くお勧めします：\n\n1. 代替路線：地下鉄 丸ノ内線 (Marunouchi Line)\n2. 乗車駅：東京駅 (M17)\n3. 降車駅：西新宿駅 (M07)\n\nこのルートはJRの遅延の影響を全く受けず、乗り換えもよりスムーズです。',
        agent_en: 'Got it! The system has detected a major delay on the JR Chuo Rapid Line due to a passenger accident.\n\nTo ensure you don\'t miss your night view, I strongly recommend using the following expert alternative:\n\n1. Alternative Route: Metro Marunouchi Line\n2. Boarding Station: Tokyo Station (M17)\n3. Alighting Station: Nishi-shinjuku Station (M07)\n\nThis route is completely unaffected by the JR delay and provides a more direct transfer.',
        tools: ['實時交通監控 (L2 Status)', '專家轉乘策略']
      },
      {
        user: '為什麼是去西新宿站，而不是新宿站？',
        user_ja: 'なぜ新宿駅ではなく西新宿駅なのですか？',
        user_en: 'Why Nishi-shinjuku Station instead of Shinjuku Station?',
        agent: '這正是 Lutagu 的專家建議精髓：\n\n*   避免複雜結構：JR 新宿站是著名的「迷宮」，出口極其複雜，推著行李或不熟路況的人極易走錯方向。\n*   距離優勢：西新宿站 的結構簡單許多。從該站出口步行前往東京都廳的實際距離，其實比從新宿站出來還要更短、更順暢。\n\n選擇西新宿站，預計能幫您節省至少 10-15 分鐘 的找路與步行時間。',
        agent_ja: 'これこそがLutaguのエキスパートアドバイスの真髄です：\n\n* 複雑な構造を回避：JR新宿駅は有名な「迷宮」であり、出口が非常に複雑です。大きな荷物を持っていたり、不慣れな方は道に迷いやすいです。\n* 距離のメリット：西新宿駅の構造はずっとシンプルです。この駅の出口から東京都庁までの実際の距離は、実は新宿駅から行くよりも短く、スムーズです。\n\n西新宿駅を選ぶことで、道に迷う時間や歩行時間を少なくとも10〜15分短縮できる見込みです。',
        agent_en: 'This is the essence of Lutagu\'s expert advice:\n\n* Avoid Complexity: JR Shinjuku Station is a famous "labyrinth" with extremely complex exits. Travelers with luggage or those unfamiliar with the area can easily get lost.\n* Distance Advantage: Nishi-shinjuku Station has a much simpler layout. The actual walking distance from its exit to the Tokyo Metropolitan Government Building is shorter and more direct than from Shinjuku Station.\n\nChoosing Nishi-shinjuku is expected to save you at least 10-15 minutes of navigation and walking time.',
        action: '顯示西新宿站最佳出口地圖'
      }
    ]
  },
  {
    id: '03_handsfree',
    title: '實踐空手觀光：動態解決行李寄放難題',
    title_ja: '手ぶら観光の実現：荷物預かりの課題を動的に解決',
    title_en: 'Hands-free Tourism: Dynamically Solving Luggage Storage Challenges',
    triggerQuestion: '我剛從成田機場到淺草，但飯店下午才能進房，淺草站的置物櫃還有位子嗎？',
    triggerQuestions: [
      'I\'m just arrived at Asakusa from Narita Airport, but I can\'t check into my hotel until this afternoon. Are there any lockers available at Asakusa Station?',
      '成田空港から浅草に着いたばかりですが、ホテルのチェックインは午後からです。浅草駅のロッカーは空いていますか？'
    ],
    steps: [
      {
        user: '我剛從成田機場到淺草，但飯店下午才能進房，淺草站的置物櫃還有位子嗎？',
        user_ja: '成田空港から浅草に着いたばかりですが、ホテルのチェックインは午後からです。浅草駅のロッカーは空いていますか？',
        user_en: 'I\'m just arrived at Asakusa from Narita Airport, but I can\'t check into my hotel until this afternoon. Are there any lockers available at Asakusa Station?',
        agent: '淺草站作為觀光大站，置物櫃的稼動率非常高，特別是在中午時段。\n\n您可以先透過下方的實時連結即時確認站內各區域的空位狀態：',
        agent_ja: '浅草駅は主要な観光駅であるため、特に昼間はロッカーの稼働率が非常に高いです。\n\n以下のリアルタイムリンクから、駅内各エリアの空き状況をすぐに確認できます：',
        agent_en: 'Asakusa Station is a major tourist hub, so lockers have a very high occupancy rate, especially during midday.\n\nYou can instantly check the real-time availability in various areas of the station through the link below:',
        links: [{ label: '東京 Metro 置物櫃實時狀態 (淺草站)', url: 'https://metro.akilocker.biz/index.html?lgId=tokyometro' }]
      },
      {
        user: '天啊，網頁顯示站內全部客滿了，我不想拖著大行李逛街。',
        user_ja: 'うわあ、ウェブサイトでは駅内がすべて満杯だと表示されています。大きな荷物を引きずって観光したくないです。',
        user_en: 'Oh no, the website shows all lockers in the station are full. I don\'t want to drag my heavy luggage around.',
        agent: '請別擔心！這正是發揮 Lutagu 空手觀光 (Hands-free Travel) 精神的時候。針對淺草站滿櫃的情況，我為您提供兩個最佳備案：\n\n### 🎒 備案一：Ecbo Cloak 在地寄放\n預約附近的合作咖啡廳或商店空間寄放行李，費用與置物櫃相仿，但空間更充裕。\n\n### 🚚 備案二：LUGGAGENT 行李當日配送\n直接由專業團隊在車站收件，將行李直送您的飯店。您可以直接開始輕鬆逛街，行李會準時出現在飯店大廳。\n\n您想嘗試預約哪一種服務？',
        agent_ja: 'ご安心ください！これこそがLutaguの「空手観光 (Hands-free Travel)」の精神を発揮する時です。浅草駅が満杯の場合、2つの最適な代替案をご提案します：\n\n### 🎒 代替案 1：Ecbo Cloak（エクボクローク）\n近くの提携カフェや店舗のスペースを予約して荷物を預けられます。料金はロッカーと同程度ですが、スペースには余裕があります。\n\n### 🚚 代替案 2：LUGGAGENT 当日配送サービス\n駅で専門スタッフが荷物を受け取り、ホテルへ直送します。そのまま手ぶらで観光を始められ、荷物はホテルのロビーに時間通りに届きます。\n\nどちらのサービスを予約してみたいですか？',
        agent_en: 'Don\'t worry! This is the perfect time to embrace the "Hands-free Travel" spirit. Given that the station lockers are full, I offer two excellent alternatives:\n\n### 🎒 Option 1: Ecbo Cloak\nBook a space in nearby partner cafes or shops to store your luggage. The cost is similar to a locker, but there\'s more space available.\n\n### 🚚 Option 2: LUGGAGENT Same-Day Delivery\nHave a professional team collect your luggage at the station and deliver it directly to your hotel. You can start sightseeing immediately, and your luggage will be waiting for you in the hotel lobby.\n\nWhich service would you like to try?',
        links: [
          { label: 'Ecbo Cloak 預約連結', url: 'https://cloak.ecbo.io/zh-TW' },
          { label: 'LUGGAGENT 服務連結', url: 'https://luggagent.com/zh-TW' }
        ],
        tools: ['第三方服務整合 (Service Integration)']
      }
    ]
  },
  {
    id: '04_accessibility',
    title: '無障礙導航：為家庭與行動不便者設計的貼心路徑',
    title_ja: 'バリアフリーナビ：家族や移動が困難な方のための親切なルート設計',
    title_en: 'Accessibility Navigation: Thoughtful Paths for Families and People with Limited Mobility',
    triggerQuestion: '我推著嬰兒車要去上野動物園，請問搭到上野站要從哪個出口出來最方便？',
    triggerQuestions: [
      'I\'m going to Ueno Zoo with a stroller. Which exit at Ueno Station is the most convenient?',
      'ベビーカーで上野動物園に行きたいのですが、上野駅のどの出口が一番便利ですか？'
    ],
    steps: [
      {
        user: '我推著嬰兒車要去上野動物園，請問搭到上野站要從哪個出口出來最方便？',
        user_ja: 'ベビーカーで上野動物園に行きたいのですが、上野駅のどの出口が一番便利ですか？',
        user_en: 'I\'m going to Ueno Zoo with a stroller. Which exit at Ueno Station is the most convenient?',
        agent: '帶著嬰兒車同行，最重要的是避開階梯與漫長的電梯排隊。根據 ODPT 設施數據 與專家路線建議，您的最佳選擇是：\n\n📍 「JR 上野站 - 公園口 (Park Exit)」\n\n這是上野站針對無障礙需求設計最友善的出口。',
        agent_ja: 'ベビーカーをお連れの場合、最も重要なのは階段や長いエレベーター待ちを避けることです。ODPTの施設データとエキスパートのルート推奨に基づき、最適な選択は：\n\n📍 「JR 上野駅 - 公園口 (Park Exit)」\n\nこれは上野駅でバリアフリーニーズに合わせて設計された、最も親切な出口です。',
        agent_en: 'When traveling with a stroller, the most important thing is to avoid stairs and long elevator queues. Based on ODPT facility data and expert route recommendations, your best choice is:\n\n📍 "JR Ueno Station - Park Exit"\n\nThis is the most user-friendly exit at Ueno Station, specifically designed for accessibility needs.',
        tools: ['ODPT 設施數據 (Amenity Data)']
      },
      {
        user: '那個出口出來就有電梯或斜坡嗎？',
        user_ja: 'その出口を出るとエレベーターやスロープはありますか？',
        user_en: 'Is there an elevator or ramp at that exit?',
        agent: '是的，選擇 公園口 的優勢在於：\n\n*   ✅ 完全零高低差：公園口改建後，出口層即與外部公園地面切齊，您完全不需要尋找電梯或搬運嬰兒車。\n*   ✅ 直達動物園：出站後只需穿過行人徒步區即可進入上野恩賜公園，步行約 5 分鐘內即可抵達動物園入口。\n\n這比從其他出口找電梯要快上至少 10 分鐘，且體驗更為輕鬆。',
        agent_ja: 'はい、公園口を選ぶメリットは以下の通りです：\n\n* ✅ 完全に段差ゼロ：公園口の改修後、出口階は外の公園の地面と同じ高さになっています。エレベーターを探したり、ベビーカーを運んだりする必要は全くありません。\n* ✅ 動物園に直結：駅を出て歩行者天国を通り抜けるだけで上野恩賜公園に入れます。徒歩約5分以内で動物園の入り口に到着します。\n\nこれは他の出口からエレベーターを探すよりも少なくとも10分は早く、体験もずっと楽です。',
        agent_en: 'Yes, the advantages of choosing the Park Exit are:\n\n* ✅ Completely Step-free: After the renovation, the Park Exit is level with the outside park ground. You won\'t need to find elevators or carry the stroller at all.\n* ✅ Direct Access to the Zoo: Just walk through the pedestrian area after exiting to enter Ueno Park. You\'ll reach the zoo entrance in less than 5 minutes on foot.\n\nThis is at least 10 minutes faster than finding elevators from other exits and much more relaxed.',
        action: '標註育嬰室與哺乳室位置'
      }
    ]
  }
];
