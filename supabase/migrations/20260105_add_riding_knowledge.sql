-- 遷移：為車站節點添加 L4 搭乘知識
-- 執行時間：2026-01-05

-- 首先添加 riding_knowledge 欄位到 nodes 表（如果不存在）
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS riding_knowledge JSONB DEFAULT '{}'::jsonb;

-- 為 hub 節點添加搭乘知識

-- 1. 上野站（JR）
UPDATE nodes
SET riding_knowledge = '{
  "traps": [
    {"icon": "🚄", "title": "新乾線搭乘警示", "description": "上野站的新乾線月臺位於地下四層，非常深！從上野公園/不忍口進站後，需連續搭乘四段長扶梯才能抵達。", "advice": "請務必預留至少 15 分鐘的進站緩衝時間。絕對不要在發車前 5 分鐘才抵達驗票口。"},
    {"icon": "🎫", "title": "閘門分隔複雜", "description": "上野站有「中央改札」、「不忍改札」、「公園改札」等多個驗票口，彼此在付費區內不完全相通。", "advice": "確認目的地後再選擇驗票口。中央改札可通往多數月台；不忍口靠近阿美橫町；公園口通往博物館。"}
  ],
  "hacks": [
    {"icon": "🏛️", "title": "文化天橋", "description": "從公園口出站後，可直接走天橋（官方稱熊貓橋）通往國立科學博物館與上野大廳，避開 1F 的擁擠人潮。"},
    {"icon": "🛍️", "title": "阿美橫町切入點", "description": "想去阿美橫町？不要走「中央改札」，改走「不忍改札」過馬路就是入口，省下 5 分鐘迷路時間。"},
    {"icon": "🌧️", "title": "雨天地下網", "description": "上野站地下通道發達，可一路連通至京成上野站與地鐵站，下雨天完全不必淋雨。"}
  ],
  "facilities": [
    {"type": "toilet", "location": "中央改札內", "tags": ["Wheelchair", "BabyRoom"]},
    {"type": "toilet", "location": "不忍改札內", "tags": ["Wheelchair"]},
    {"type": "elevator", "location": "中央改札通往各月台", "tags": ["Wheelchair"]},
    {"type": "wifi", "location": "部分區域", "tags": []}
  ]
}'
WHERE id = 'odpt:Station:JR-East.Ueno';

-- 2. 新宿站（JR）
UPDATE nodes
SET riding_knowledge = '{
  "traps": [
    {"icon": "🌀", "title": "東西出口迷宮", "description": "新宿站雖已有「東西自由通路」可不出閘往返，但站內層級多、指標複雜，仍很容易走到錯的改札或出口。", "advice": "以「東改札／西改札」為目標走主通路。若要去地面東口或西口，出站前先確認出口名稱（東口/西口/南口/新南口）。"},
    {"icon": "🚇", "title": "大江戶線轉乘地獄", "description": "大江戶線的「新宿站」位於地下七層，距離 JR 改札口極遠。", "advice": "若要轉乘大江戶線，請改去「新宿西口站」而非「新宿站」，兩者其實更近且沒那麼深。"},
    {"icon": "🎫", "title": "南口與新南口", "description": "南口和新南口是不同的出口！南口靠近 JR 線，新南口則是通往「Busta 新宿」巴士轉運站的方向。", "advice": "要去 Busta 新宿，請務必找「新南改札」。"}
  ],
  "hacks": [
    {"icon": "🌧️", "title": "地下通路王", "description": "新宿三丁目到西口都廳，均有地下道相連。下雨天可從「Subnade」地下街一路逛到東口，完全不必淋雨。"},
    {"icon": "🆕", "title": "新南口直達", "description": "要去「Busta 新宿 (巴士轉運站)」請務必找「新南改札」，出來直達手扶梯上樓即是。"},
    {"icon": "🏢", "title": "東京都廳觀景", "description": "從西口出站步行約 10 分鐘可達東京都廳，45 樓有免費觀景台，可俯瞰東京全景。"}
  ],
  "facilities": [
    {"type": "toilet", "location": "東口改札內", "tags": ["Wheelchair", "BabyRoom"]},
    {"type": "toilet", "location": "新南改札內", "tags": ["Wheelchair", "BabyRoom"]},
    {"type": "elevator", "location": "東口、西口、新南口", "tags": ["Wheelchair"]}
  ]
}'
WHERE id = 'odpt:Station:JR-East.Shinjuku';

-- 3. 澀谷站（JR）
UPDATE nodes
SET riding_knowledge = '{
  "traps": [
    {"icon": "🆙", "title": "銀座線空中謎題", "description": "雖然是地下鐵，但澀谷站的銀座線月台在三樓！而副都心線在地下五樓。", "advice": "銀座線轉乘副都心線/東橫線，垂直移動距離極大，請預留 10-15 分鐘的「登山」時間。"},
    {"icon": "🚧", "title": "迷宮工事中", "description": "澀谷站周邊工程持續進行中，出口位置常有變動。", "advice": "請認準「Hachiko Gate (八公改札)」作為唯一真理，其他出口容易迷失在工地迷宮中。"}
  ],
  "hacks": [
    {"icon": "🏙️", "title": "Scramble Square 捷徑", "description": "利用 Scramble Square 百貨的電梯，可以直接從 B2 地鐵層殺到 3F 的銀座線/JR 連通道，避開人擠人的手扶梯。"},
    {"icon": "🖼️", "title": "神話明日壁畫", "description": "在通往井之頭線的連通道上，有岡本太郎巨大的壁畫「明日的神話」，是免費且震撼的藝術景點。"},
    {"icon": "🐕", "title": "八公像會合點", "description": "八公像是澀谷最著名的會合點，從八公口出站即達。"}
  ],
  "facilities": [
    {"type": "toilet", "location": "八公改札內", "tags": ["Wheelchair", "BabyRoom"]},
    {"type": "elevator", "location": "八公口、南口、新南口", "tags": ["Wheelchair"]}
  ]
}'
WHERE id = 'odpt:Station:JR-East.Shibuya';

-- 4. 池袋站（JR）
UPDATE nodes
SET riding_knowledge = '{
  "traps": [
    {"icon": "🦉", "title": "東西南北出口迷宮", "description": "池袋站有東西南北四個主要出口，彼此之間在地下不完全相通，一旦走錯可能需要繞一大圈。", "advice": "確認目的地後再選擇出口。"},
    {"icon": "🦉", "title": "東武/西武百货悖論", "description": "池袋的最大陷阱：「西武百貨在東口，東武百貨在西口」。", "advice": "記憶口訣：東口是西武 (Seibu)，西口是東武 (Tobu)。想去西武百貨請往「東口」走！"}
  ],
  "hacks": [
    {"icon": "🦉", "title": "貓頭鷹地標", "description": "東口的「Ikefukurou (貓頭鷹石像)」是最佳會合點，比八公像難找一點但人也比較少。"},
    {"icon": "🍜", "title": "拉麵激戰區", "description": "池袋是東京拉麵激戰區之一，無敵家、大勝軒、一蘭等名店都在附近。"},
    {"icon": "🛍️", "title": "Sunshine City", "description": "從東口步行約 5 分鐘可達，是池袋最大的購物中心，內有水族館、展望台和各種商店。"}
  ],
  "facilities": [
    {"type": "toilet", "location": "中央改札內", "tags": ["Wheelchair", "BabyRoom"]},
    {"type": "elevator", "location": "各主要改札口", "tags": ["Wheelchair"]}
  ]
}'
WHERE id = 'odpt:Station:JR-East.Ikebukuro';

-- 5. 秋葉原站（JR）
UPDATE nodes
SET riding_knowledge = '{
  "traps": [
    {"icon": "🔄", "title": "總武線空中轉乘", "description": "總武線月台位於 6 樓，山手線/京濱東北線位於 2 樓。轉乘時需搭乘極長的電扶梯。", "advice": "人潮眾多時電扶梯會大排長龍，轉乘請預留 5-8 分鐘。"},
    {"icon": "⚡", "title": "電器街 vs 昭和通", "description": "秋葉原站被 JR 線路切分為二，西側是「電器街/動漫區」，東側是「Yodobashi Camera/日比谷線」。", "advice": "看動漫走「電器街口」，買家電走「中央改札」或「昭和通口」。"}
  ],
  "hacks": [
    {"icon": "🛍️", "title": "Yodobashi Akiba", "description": "昭和通口直結，全日本最大的電器百貨，B1-8F 應有盡有。"},
    {"icon": "🥛", "title": "牛奶小站", "description": "總武線月台上有專賣日本各地玻璃瓶牛奶的販賣部，非常受歡迎。"},
    {"icon": "🌉", "title": "東西自由通路", "description": "這是唯一不需進站即可穿越車站東西兩側的捷徑，位於中央改札口旁。"}
  ],
  "facilities": [
    {"type": "toilet", "location": "電氣街口、中央改札內", "tags": ["Wheelchair"]},
    {"type": "elevator", "location": "中央改札口、3號出口", "tags": ["Wheelchair"]}
  ]
}'
WHERE id = 'odpt:Station:JR-East.Akihabara';

-- 6. 東京站（JR）
UPDATE nodes
SET riding_knowledge = '{
  "traps": [
    {"icon": "🏃", "title": "京葉線轉乘陷阱", "description": "京葉線（去迪士尼的路線）月臺距離山手線非常遠，實際上接近「有樂町站」。", "advice": "轉乘通道長達 800 公尺，步行需 15-20 分鐘。請把它當作是「走到下一站」的距離感。"},
    {"icon": "🎯", "title": "丸之內 vs 八重洲", "description": "東京站被鐵路分成「丸之內側」（西側）和「八重洲側」（東側），兩個方向在地下不完全互通。", "advice": "確認目的地後再選擇出口。丸之內側主要是辦公大樓和車站大樓；八重洲側有許多購物中心和餐廳。"}
  ],
  "hacks": [
    {"icon": "⚡️", "title": "京葉線隱藏捷徑", "description": "要去迪士尼？與其在站內走 20 分鐘，不如在「JR 有樂町站」下山！從「京橋口」出站，往「東京國際論壇」走，看到「Side Square」下山梯，直接抵達京葉線丸之內口。"},
    {"icon": "🎫", "title": "丸之內南口紅磚站舍", "description": "國家重要文化財，必拍照點！從丸之內地下廣場搭電梯上 1F 即可抵達。"},
    {"icon": "🍱", "title": "駅弁屋 祭", "description": "中央通路有超過 200 種車站便當，建議發車前 30 分鐘來選購。"}
  ],
  "facilities": [
    {"type": "toilet", "location": "中央、丸之內、八重洲、京葉線改札內", "tags": ["Wheelchair", "BabyRoom"]},
    {"type": "elevator", "location": "各主要改札口", "tags": ["Wheelchair"]},
    {"type": "wifi", "location": "全站", "tags": []}
  ]
}'
WHERE id = 'odpt:Station:JR-East.Tokyo';

-- 7. 品川站（JR）
UPDATE nodes
SET riding_knowledge = '{
  "traps": [
    {"icon": "🎯", "title": "五線交會", "description": "品川站有山手線、京濱東北線、東海道線、横須賀線、京急線五條路線。", "advice": "不同路線在不同月台，請確認看板再上車。"}
  ],
  "hacks": [
    {"icon": "✈️", "title": "機場交通", "description": "京急線可直達羽田機場，是前往機場的便捷選擇。約 20 分鐘可達。"},
    {"icon": "🏨", "title": "品川飯店區", "description": "品川站周邊有許多大型飯店，是商務旅客的首選。"},
    {"icon": "🚃", "title": "新幹線の玄關", "description": "品川站是東海道・山陽新幹線の主要車站，搭乘新幹선을前往大阪、神戶非常方便。"}
  ],
  "facilities": [
    {"type": "toilet", "location": "中央改札內、北口改札內", "tags": ["Wheelchair", "BabyRoom"]},
    {"type": "elevator", "location": "中央改札、北口、高輪改札", "tags": ["Wheelchair"]}
  ]
}'
WHERE id = 'odpt:Station:JR-East.Shinagawa';

-- 8. 銀座站（東京Metro）
UPDATE nodes
SET riding_knowledge = '{
  "traps": [
    {"icon": "🤝", "title": "銀座線與日比谷線轉乘", "description": "雖然這兩條線路共享銀座站，但轉乘需要經過漫長的地下通道。", "advice": "跟隨藍色（日比谷線）或橙色（銀座線）的地面指示箭頭。"},
    {"icon": "💎", "title": "出口分散", "description": "銀座站有 A1-A15 等多個出口，通往不同方向的購物區和商業大樓。", "advice": "確認目的地後再選擇出口。前往「銀座三越」建議 A3 或 A5 出口；前往「松屋銀座」建議 A8 出口。"}
  ],
  "hacks": [
    {"icon": "💎", "title": "出口陷阱", "description": "如果要去銀座四丁目的三越百貨，請尋找 A7 或 A8 出口，這比走 A1 快得多。"},
    {"icon": "🎨", "title": "藝術地下道", "description": "地下道內常有藝術展覽，轉乘時不妨放慢腳步欣賞。"},
    {"icon": "🛍️", "title": "中央通", "description": "從 A1 出口出來就是著名的中央通，是東京最繁華的購物街之一。"}
  ],
  "facilities": [
    {"type": "toilet", "location": "改札內", "tags": ["Wheelchair"]},
    {"type": "elevator", "location": "A5、A8、A11 出口", "tags": ["Wheelchair"]},
    {"type": "wifi", "location": "全站", "tags": []}
  ]
}'
WHERE id = 'odpt:Station:TokyoMetro.Ginza';

-- 9. 淺草站（都營）
UPDATE nodes
SET riding_knowledge = '{
  "traps": [
    {"icon": "🚇", "title": "淺草站大迷宮", "description": "淺草一帶同名車站很多（銀座線／都營淺草線／東武／TX），站體分散且通路不一，轉乘常需要走改札外通道或地面。", "advice": "把目的地改札口與出口號（例如 A4、1 號出口）一起記下來。遇到需要出站步行時，用 IC 卡通行最省事。"},
    {"icon": "🧳", "title": "電梯陷阱", "description": "淺草站出口雖多，但直通地面的電梯只有一座！", "advice": "攜帶大型行李的旅客，請務必尋找「駒形橋方面」的 A2b 出口或 1 號出口（雷門旁）。"},
    {"icon": "🚧", "title": "四個淺草站混淆", "description": "地鐵銀座線、都營淺草線、東武鐵道、筑波快線都有「淺草站」。", "advice": "筑波快線的淺草站距離其他三站約 600 公尺，請勿安排在此站轉乘 TX。"}
  ],
  "hacks": [
    {"icon": "⛩️", "title": "雷門最近出口", "description": "A4 出口步行 1 分鐘即可抵達著名的雷門。"},
    {"icon": "🍡", "title": "仲見世通り", "description": "雷門到淺草寺之間的參道商店街，約 250 公尺長，可以邊吃邊逛。"},
    {"icon": "🚤", "title": "水上巴士", "description": "從吾妻橋可以搭水上巴士到御台場和葛西臨海公園。"}
  ],
  "facilities": [
    {"type": "toilet", "location": "淺草線改札內", "tags": ["Wheelchair"]},
    {"type": "toilet", "location": "1號出口附近", "tags": ["Wheelchair", "BabyRoom"]},
    {"type": "elevator", "location": "A2b、A4、A5 出口", "tags": ["Wheelchair"]},
    {"type": "wifi", "location": "全站", "tags": []}
  ]
}'
WHERE id = 'odpt:Station:Toei.Asakusa.Asakusa';

-- 10. 大手町站（東京Metro）
UPDATE nodes
SET riding_knowledge = '{
  "traps": [
    {"icon": "🌀", "title": "東京最大迷宮", "description": "大手町站共有 5 條路線交會，是東京地下鐵最大的迷宮。從千代田線走到東西線可能需要 15 分鐘。", "advice": "請務必看著頭頂的顏色指標前進，絕對不要憑感覺走。丸之內線(紅)、東西線(藍)、千代田線(綠)、半藏門線(紫)、三田線(深藍)。"}
  ],
  "hacks": [
    {"icon": "🍱", "title": "Otemachi One", "description": "C4/C5 出口直結的新大樓，B1 有許多高檔但平價的便當店，適合商務午餐。"},
    {"icon": "🌲", "title": "皇居東御苑", "description": "C13b 出口出來就是皇居的大手門，是離皇居最近的入口。"}
  ],
  "facilities": [
    {"type": "toilet", "location": "丸之內線、東西線、千代田線改札內", "tags": ["Wheelchair", "BabyRoom"]},
    {"type": "elevator", "location": "A5、B2c、C14 出口", "tags": ["Wheelchair"]},
    {"type": "wifi", "location": "全站", "tags": []}
  ]
}'
WHERE id = 'odpt:Station:TokyoMetro.Otemachi';

-- 11. 飯田橋站（JR）
UPDATE nodes
SET riding_knowledge = '{
  "traps": [
    {"icon": "🎢", "title": "五線交匯長廊", "description": "飯田橋站匯集了東西線、有楽町線、南北線、大江戶線與 JR，轉乘路徑極長。", "advice": "東西線與其他線路轉乘需步行 5-10 分鐘，請務必跟隨地面顏色指引指標。"}
  ],
  "hacks": [
    {"icon": "⛩️", "title": "東京大神宮", "description": "從西口出站步行約 5 分鐘，是東京最具代表性的戀愛結緣神社。"},
    {"icon": "🚢", "title": "Canal Cafe", "description": "位於神田川邊的景觀咖啡廳，特別是櫻花季時美不勝收。"}
  ],
  "facilities": [
    {"type": "toilet", "location": "改札內", "tags": ["Wheelchair", "BabyRoom"]},
    {"type": "elevator", "location": "主要出入口", "tags": ["Wheelchair"]}
  ]
}'
WHERE id = 'odpt:Station:JR-East.Iidabashi';

-- 12. 日暮里站（JR）
UPDATE nodes
SET riding_knowledge = '{
  "traps": [
    {"icon": "✈️", "title": "Skyliner 轉乘陷阱", "description": "要從 JR 轉乘京成 Skyliner 去機場？千萬別走「南口」！", "advice": "請務必走北改札口，那裡才有 JR 直通京成的轉乘專用閘門。南口沒有轉乘機制，需出站重進。"}
  ],
  "hacks": [
    {"icon": "🛍️", "title": "ecute 日暮里", "description": "北改札內有著名的 ecute 商場，是購買伴手禮和便當的最後一站。"},
    {"icon": "🐈", "title": "谷中銀座", "description": "從西口步行 5 分鐘即達著名的「貓町」谷中銀座商店街。"}
  ],
  "facilities": [
    {"type": "toilet", "location": "北改札內、南改札內", "tags": ["Wheelchair"]},
    {"type": "elevator", "location": "北改札、西口", "tags": ["Wheelchair"]}
  ]
}'
WHERE id = 'odpt:Station:JR-East.Nippori';

-- 13. 中野站（JR）
UPDATE nodes
SET riding_knowledge = '{
  "traps": [
    {"icon": "🎯", "title": "中央・總武線", "description": "中央・總武線（各站停車）和中央線快速是不同系統，站台位置不同。", "advice": "中央・總武線（各站停車）的月台在東側；中央線快速（Chuo Line Rapid）的月台在西側。"}
  ],
  "hacks": [
    {"icon": "🏪", "title": "中野百老匯", "description": "從北口出站步行約 3 分鐘可達，是東京著名的動漫、模型、收藏品聖地。"},
    {"icon": "🎮", "title": "古玩市場", "description": "中野百老匯內有許多稀有動漫商品和收藏品，是收藏愛好者的天堂。"},
    {"icon": "🍜", "title": "蘸麵", "description": "蘸麵的「元祖」常被認為是東池袋大勝軒（山岸一雄）系譜；中野一帶也有許多拉麵與蘸麵名店，適合排入美食散步。"}
  ],
  "facilities": [
    {"type": "toilet", "location": "南口、北口改札內", "tags": ["Wheelchair"]},
    {"type": "elevator", "location": "南口、北口", "tags": ["Wheelchair"]}
  ]
}'
WHERE id = 'odpt:Station:JR-East.Nakano';

-- 14. 目黑站（JR）
UPDATE nodes
SET riding_knowledge = '{
  "traps": [
    {"icon": "🎯", "title": "四線同站轉乘", "description": "目黑站同一站體內匯集 JR 山手線、東京Metro南北線、都營三田線、東急目黑線，轉乘方向容易走反。", "advice": "先確認要去的路線與方向（例如南北線＝白金高輪／麻布十番方向），再選擇對應的樓層與月台。"}
  ],
  "hacks": [
    {"icon": "🏪", "title": "目黑川", "description": "從 JR 目黑站步行約 10 分鐘可達目黑川，是東京著名的賞櫻景點。"},
    {"icon": "🍵", "title": "星巴克臻選", "description": "想去「STARBUCKS RESERVE(R) ROASTERY TOKYO」建議改從中目黑一帶前往，步行更順。"},
    {"icon": "🏪", "title": "atre 目黑", "description": "車站直結的購物中心，有超市和餐廳。"}
  ],
  "facilities": [
    {"type": "toilet", "location": "改札內", "tags": ["Wheelchair", "BabyRoom"]},
    {"type": "elevator", "location": "主要出入口及月台", "tags": ["Wheelchair"]}
  ]
}'
WHERE id = 'odpt:Station:JR-East.Meguro';

-- 15. 中目黑站
UPDATE nodes
SET riding_knowledge = '{
  "traps": [
    {"icon": "🌸", "title": "賞櫻名所", "description": "目黑川沿岸是中目黑最著名的賞櫻景點，春天人潮洶湧。", "advice": "賞櫻季節（3月下旬至4月上旬）建議平日前往，或清晨搶位。"}
  ],
  "hacks": [
    {"icon": "🏪", "title": "目黑川沿岸", "description": "沿著目黑川散步，兩岸有許多精品店、咖啡廳和餐廳。"},
    {"icon": "☕", "title": "咖啡廳激戰區", "description": "中目黑是東京咖啡廳密度最高的地區之一。"},
    {"icon": "🏪", "title": "代官山散步", "description": "想看蔦屋書店風格街區，可從中目黑沿目黑川散步到代官山一帶，行程很順。"}
  ],
  "facilities": [
    {"type": "toilet", "location": "改札內", "tags": ["Wheelchair", "BabyRoom"]},
    {"type": "elevator", "location": "主要出入口", "tags": ["Wheelchair"]},
    {"type": "wifi", "location": "全站", "tags": []}
  ]
}'
WHERE id IN (
  'odpt:Station:Tokyu.TokyuTamagawa.Nakameguro',
  'odpt:Station:Tokyu.Toyoko.NakaMeguro',
  'odpt:Station:TokyoMetro.NakaMeguro'
);

-- 16. 北千住站（JR）
UPDATE nodes
SET riding_knowledge = '{
  "traps": [
    {"icon": "🎯", "title": "四線交會", "description": "北千住站有 JR、日比谷線、東武線、TX 四條路線交會，轉乘複雜。", "advice": "不同路線在不同位置，請跟隨指標前進，避免迷路。"}
  ],
  "hacks": [
    {"icon": "🏪", "title": "業務超市", "description": "北千住站周邊有多家業務超市，可以購買便宜的日本零食和飲料。"},
    {"icon": "🌸", "title": "荒川沿岸", "description": "荒川沿岸是散步和騎腳踏車的好去處，春天有美麗的櫻花。"}
  ],
  "facilities": [
    {"type": "toilet", "location": "西口、東口改札內", "tags": ["Wheelchair"]},
    {"type": "elevator", "location": "西口、東口", "tags": ["Wheelchair"]}
  ]
}'
WHERE id = 'odpt:Station:JR-East.KitaSenju';

-- 17. 泉岳寺站
UPDATE nodes
SET riding_knowledge = '{
  "traps": [
    {"icon": "🔀", "title": "直通系統分歧", "description": "泉岳寺是都營淺草線與京急線的直通關鍵點，列車去向（羽田／成田／西馬込等）很多，目的地看錯很常見。", "advice": "上車前看清楚車頭顯示與站內案內：目的地與種別比路線名更重要。若顯示「泉岳寺止まり」或目的地不符，務必在泉岳寺改乘。"}
  ],
  "hacks": [
    {"icon": "⛩️", "title": "泉岳寺", "description": "車站附近的「泉岳寺」是著名的佛寺。"},
    {"icon": "✈️", "title": "機場直達", "description": "從泉岳寺站可直通京急線前往羽田機場，約 20 分鐘可達。"}
  ],
  "facilities": [
    {"type": "toilet", "location": "改札內", "tags": ["Wheelchair"]},
    {"type": "elevator", "location": "主要出入口", "tags": ["Wheelchair"]},
    {"type": "wifi", "location": "全站", "tags": []}
  ]
}'
WHERE id = 'odpt:Station:Toei.Asakusa.Sengakuji';

-- 18. 白金高輪站
UPDATE nodes
SET riding_knowledge = '{
  "traps": [
    {"icon": "🎯", "title": "與南北線直通", "description": "三田線與南北線直通運行，可直達目黑、白金方向。", "advice": "確認看板上的直通運行資訊。"}
  ],
  "hacks": [
    {"icon": "🏛️", "title": "白金", "description": "白金地區是東京的高級住宅區，有許多外國大使館和時尚餐廳。"},
    {"icon": "🏪", "title": "白金購物中心", "description": "周邊有許多精品店和咖啡廳，適合散步和購物。"}
  ],
  "facilities": [
    {"type": "toilet", "location": "改札內", "tags": ["Wheelchair"]},
    {"type": "elevator", "location": "主要出入口", "tags": ["Wheelchair"]}
  ]
}'
WHERE id = 'odpt:Station:Toei.Mita.ShirokaneTakanawa';

-- 19. 大門站（都營）
UPDATE nodes
SET riding_knowledge = '{
  "traps": [
    {"icon": "🏔️", "title": "地下深層", "description": "大江戶線大門站位於地下六層，是東京較深的月台之一。", "advice": "需要搭乘電扶梯或電梯才能抵達地面，請預留充裕時間。"}
  ],
  "hacks": [
    {"icon": "🛬", "title": "機場玄關", "description": "轉乘單軌電車前往羽田機場非常方便。"},
    {"icon": "🗼", "title": "增上寺首選", "description": "從 B1 出口步行 5 分鐘即可抵達東京塔腳下的壯觀佛寺。"},
    {"icon": "🗼", "title": "東京塔夜景", "description": "大門站是欣賞東京塔夜景的最佳車站。"}
  ],
  "facilities": [
    {"type": "toilet", "location": "淺草線/大江戶線轉乘口內", "tags": ["Wheelchair"]},
    {"type": "elevator", "location": "A1、A2、B1 出口", "tags": ["Wheelchair"]},
    {"type": "wifi", "location": "全站", "tags": []}
  ]
}'
WHERE id = 'odpt:Station:Toei.Asakusa.Daimon';

-- 20. 押上站
UPDATE nodes
SET riding_knowledge = '{
  "traps": [
    {"icon": "🗼", "title": "晴空塔人潮", "description": "押上站是前往晴空塔的主要車站，假日與連假期間人潮非常洶湧。", "advice": "若要前往晴空塔，建議平日上午前往或預先購買晴空塔門票。"},
    {"icon": "🔀", "title": "直通列車看錯", "description": "押上是京成押上線與都營淺草線的接點，且與京急／京成（含成田方面）直通列車很多，行先容易看錯。", "advice": "要去羽田或成田，先確認車頭顯示的目的地與種別，再上車；不確定就先搭到大站（例如押上→泉岳寺／日本橋）再換乘。"}
  ],
  "hacks": [
    {"icon": "✈️", "title": "直通成田", "description": "此站直通京成線往成田機場。"},
    {"icon": "🗼", "title": "晴空塔最近站", "description": "押上站是距離東京晴空塔最近的車站，步行約 5 分鐘。"}
  ],
  "facilities": [
    {"type": "toilet", "location": "改札內", "tags": ["Wheelchair"]},
    {"type": "toilet", "location": "改札外", "tags": ["BabyRoom"]},
    {"type": "elevator", "location": "A1、A2、A3 出口", "tags": ["Wheelchair"]},
    {"type": "wifi", "location": "全站", "tags": []}
  ]
}'
WHERE id = 'odpt:Station:Toei.Asakusa.Oshiage';

-- 完成遷移
SELECT '已為 20 個車站節點添加搭乘知識' as status;
