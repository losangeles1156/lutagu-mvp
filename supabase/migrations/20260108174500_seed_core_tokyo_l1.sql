-- Mass Seed Data for Core Tokyo Stations
INSERT INTO l1_custom_places (station_id, name_i18n, primary_category, category, vibe_tags, ai_description, keywords, is_active, status, location)
VALUES 

-- UENO (Culture, Park, Museum, Ameyoko)
(
  'odpt:Station:JR-East.Ueno',
  '{"ja": "上野恩賜公園", "en": "Ueno Park", "zh": "上野恩賜公園"}',
  'nature',
  'park',
  '["cherry_blossom", "family_friendly", "historic", "museum_hub"]'::jsonb,
  '東京文化心臟，擁有動物園、美術館與賞櫻名所',
  '["櫻花", "動物園", "zoo", "museum", "美術館"]'::jsonb,
  true, 'approved', '{"type": "Point", "coordinates": [139.7741, 35.7140]}'
),
(
  'odpt:Station:JR-East.Ueno',
  '{"ja": "アメ横", "en": "Ameyoko Shopping Street", "zh": "阿美橫丁"}',
  'shopping',
  'market',
  '["budget", "street_food", "bustling", "bargain"]'::jsonb,
  '充滿活力的露天市場，以平價海鮮、乾貨和街頭小吃聞名',
  '["市場", "market", "便宜", "street food", "藥妝"]'::jsonb,
  true, 'approved', '{"type": "Point", "coordinates": [139.7745, 35.7105]}'
),
(
  'odpt:Station:JR-East.Ueno',
  '{"ja": "国立科学博物館", "en": "National Museum of Nature and Science", "zh": "國立科學博物館"}',
  'culture',
  'museum',
  '["learning", "family_friendly", "indoor", "history"]'::jsonb,
  '日本最大的綜合科學博物館，擁有著名的忠犬八公剝製標本',
  '["科學", "dinosaur", "恐龍", "museum", "八公"]'::jsonb,
  true, 'approved', '{"type": "Point", "coordinates": [139.7766, 35.7163]}'
),

-- AKIHABARA (Electronics, Anime, Maid Cafes)
(
  'odpt:Station:JR-East.Akihabara',
  '{"ja": "ラジオ会館", "en": "Radio Kaikan", "zh": "秋葉原無線電會館"}',
  'shopping',
  'hobby_shop',
  '["anime", "otaku", "figures", "collectible"]'::jsonb,
  '秋葉原的地標性建築，滿滿的動漫周邊和模型店',
  '["公仔", "figure", "anime", "radio kaikan", "模型"]'::jsonb,
  true, 'approved', '{"type": "Point", "coordinates": [139.7719, 35.6979]}'
),
(
  'odpt:Station:JR-East.Akihabara',
  '{"ja": "ヨドバシカメラ マルチメディアAkiba", "en": "Yodobashi Akiba", "zh": "Yodobashi Camera Akiba"}',
  'shopping',
  'electronics',
  '["tech", "gadgets", "duty_free", "massive"]'::jsonb,
  '超大型電器百貨，從相機到家電應有盡有，頂樓有餐廳街',
  '["電器", "camera", "家電", "shopping", "toys"]'::jsonb,
  true, 'approved', '{"type": "Point", "coordinates": [139.7744, 35.6988]}'
),
(
  'odpt:Station:JR-East.Akihabara',
  '{"ja": "@ほぉ〜むカフェ", "en": "@Home Cafe", "zh": "@Home Cafe 女僕咖啡廳"}',
  'dining',
  'theme_cafe',
  '["maid", "kawaii", "experience", "tourist_spot"]'::jsonb,
  '著名的女僕咖啡廳，體驗秋葉原萌文化的最佳去處',
  '["女僕", "maid cafe", "萌", "moe", "cafe"]'::jsonb,
  true, 'approved', '{"type": "Point", "coordinates": [139.7715, 35.7001]}'
),

-- TOKYO (Business, History, Transit)
(
  'odpt:Station:JR-East.Tokyo',
  '{"ja": "皇居", "en": "Imperial Palace", "zh": "皇居"}',
  'culture',
  'historic',
  '["historic", "nature", "jogging", "landmark"]'::jsonb,
  '日本天皇居住地，周圍的東御苑和二重橋是著名景點',
  '["emperor", "palace", "history", "garden", "jogging"]'::jsonb,
  true, 'approved', '{"type": "Point", "coordinates": [139.7528, 35.6852]}'
),
(
  'odpt:Station:JR-East.Tokyo',
  '{"ja": "東京キャラクターストリート", "en": "Tokyo Character Street", "zh": "東京動漫人物街"}',
  'shopping',
  'souvenir',
  '["anime", "family_friendly", "souvenir", "indoor"]'::jsonb,
  '位於東京車站一番街，集合了吉卜力、神奇寶貝等各大動漫角色商店',
  '["pokemon", "ghibli", "jump", "souvenir", "gift"]'::jsonb,
  true, 'approved', '{"type": "Point", "coordinates": [139.7667, 35.6811]}'
),
(
  'odpt:Station:JR-East.Tokyo',
  '{"ja": "KITTE丸の内", "en": "KITTE Marunouchi", "zh": "KITTE丸之內"}',
  'shopping',
  'mall',
  '["modern", "reused_arch", "view_spot", "trendy"]'::jsonb,
  '由舊東京中央郵局改建的時尚商場，頂樓花園可俯瞰東京車站',
  '["view", "post office", "shopping", "dining", "rooftop"]'::jsonb,
  true, 'approved', '{"type": "Point", "coordinates": [139.7649, 35.6796]}'
),

-- GINZA (Luxury, Dining, Art)
(
  'odpt:Station:TokyoMetro.Ginza',
  '{"ja": "GINZA SIX", "en": "GINZA SIX", "zh": "GINZA SIX"}',
  'shopping',
  'mall',
  '["luxury", "art", "modern", "high_end"]'::jsonb,
  '銀座最大的豪華購物中心，結合了高端時尚與蔦屋書店',
  '["shopping", "luxury", "tsutaya", "art", "fashion"]'::jsonb,
  true, 'approved', '{"type": "Point", "coordinates": [139.7640, 35.6696]}'
),
(
  'odpt:Station:TokyoMetro.Ginza',
  '{"ja": "歌舞伎座", "en": "Kabukiza Theatre", "zh": "歌舞伎座"}',
  'culture',
  'theatre',
  '["traditional", "performance", "historic", "landmark"]'::jsonb,
  '欣賞日本傳統藝能歌舞伎的殿堂，建築本身也非常壯觀',
  '["kabuki", "theatre", "traditional", "art", "japan"]'::jsonb,
  true, 'approved', '{"type": "Point", "coordinates": [139.7684, 35.6698]}'
),

-- SHIBUYA (Youth, Crossing, Fashion)
(
  'odpt:Station:JR-East.Shibuya',
  '{"ja": "渋谷スクランブル交差点", "en": "Shibuya Scramble Crossing", "zh": "澀谷十字路口"}',
  'culture',
  'landmark',
  '["iconic", "bustling", "instagram", "famous"]'::jsonb,
  '世界最繁忙的十字路口，東京最具代表性的地標之一',
  '["crossing", "photo", "landmark", "busy", "famous"]'::jsonb,
  true, 'approved', '{"type": "Point", "coordinates": [139.7006, 35.6595]}'
),
(
  'odpt:Station:JR-East.Shibuya',
  '{"ja": "SHIBUYA 109", "en": "SHIBUYA 109", "zh": "SHIBUYA 109"}',
  'shopping',
  'fashion',
  '["youth", "fashion", "trendy", "iconic"]'::jsonb,
  '澀谷辣妹文化的發源地，年輕女性潮流的聖地',
  '["fashion", "gal", "trendy", "clothes", "shopping"]'::jsonb,
  true, 'approved', '{"type": "Point", "coordinates": [139.6994, 35.6596]}'
),
(
  'odpt:Station:JR-East.Shibuya',
  '{"ja": "渋谷スカイ", "en": "SHIBUYA SKY", "zh": "SHIBUYA SKY"}',
  'leisure',
  'observatory',
  '["view", "sunset", "instagram", "modern"]'::jsonb,
  'Scramble Square 頂樓的露天展望台，擁有360度絕美東京全景',
  '["view", "observatory", "photo", "sky", "landmark"]'::jsonb,
  true, 'approved', '{"type": "Point", "coordinates": [139.7024, 35.6585]}'
),

-- SHINJUKU (Nightlife, Park, Government)
(
  'odpt:Station:JR-East.Shinjuku',
  '{"ja": "新宿御苑", "en": "Shinjuku Gyoen", "zh": "新宿御苑"}',
  'nature',
  'park',
  '["nature", "quiet", "cherry_blossom", "garden"]'::jsonb,
  '都市中的綠洲，融合了日式、英式和法式庭園風格',
  '["park", "garden", "nature", "relax", "sakura"]'::jsonb,
  true, 'approved', '{"type": "Point", "coordinates": [139.7101, 35.6852]}'
),
(
  'odpt:Station:JR-East.Shinjuku',
  '{"ja": "歌舞伎町", "en": "Kabukicho", "zh": "歌舞伎町"}',
  'leisure',
  'nightlife',
  '["nightlife", "bustling", "adult", "neon"]'::jsonb,
  '亞洲最大的紅燈區與不夜城，擁有哥吉拉大樓、黃金街等景點',
  '["nightlife", "bar", "entertainment", "godzilla", "neon"]'::jsonb,
  true, 'approved', '{"type": "Point", "coordinates": [139.7032, 35.6938]}'
),
(
  'odpt:Station:JR-East.Shinjuku',
  '{"ja": "東京都庁舎展望室", "en": "TMG Observatory", "zh": "東京都廳展望室"}',
  'leisure',
  'observatory',
  '["view", "free", "indoor", "high"]'::jsonb,
  '免費開放的高層展望台，可欣賞東京夜景，天氣好時可見富士山',
  '["view", "free", "fuji", "night view", "landmark"]'::jsonb,
  true, 'approved', '{"type": "Point", "coordinates": [139.6917, 35.6896]}'
),


-- IKEBUKURO (Anime, Shopping, Aquarium)
(
  'odpt:Station:JR-East.Ikebukuro',
  '{"ja": "サンシャインシティ", "en": "Sunshine City", "zh": "太陽城"}',
  'shopping',
  'mall',
  '["family_friendly", "aquarium", "shopping", "entertainment"]'::jsonb,
  '池袋的地標，集結了水族館、展望台、寶可夢中心和購物商場',
  '["aquarium", "pokemon", "observation", "shopping", "food"]'::jsonb,
  true, 'approved', '{"type": "Point", "coordinates": [139.7196, 35.7289]}'
),
(
  'odpt:Station:JR-East.Ikebukuro',
  '{"ja": "ポケモンセンターメガトウキョー", "en": "Pokemon Center Mega Tokyo", "zh": "寶可夢中心 Mega Tokyo"}',
  'shopping',
  'hobby_shop',
  '["pokemon", "kids", "souvenir", "popular"]'::jsonb,
  '日本最大的寶可夢中心之一，粉絲必朝聖之地',
  '["pokemon", "pikachu", "toys", "gift", "anime"]'::jsonb,
  true, 'approved', '{"type": "Point", "coordinates": [139.7197, 35.7289]}'
),
-- NIHOMBASHI (Traditional, Finance)
(
  'odpt:Station:TokyoMetro.Nihombashi',
  '{"ja": "日本橋", "en": "Nihombashi Bridge", "zh": "日本橋"}',
  'culture',
  'historic',
  '["historic", "landmark", "traditional", "bridge"]'::jsonb,
  '日本道路的起點（道路元標），標誌性的文藝復興式石橋',
  '["bridge", "history", "landmark", "road start"]'::jsonb,
  true, 'approved', '{"type": "Point", "coordinates": [139.7745, 35.6841]}'
);
