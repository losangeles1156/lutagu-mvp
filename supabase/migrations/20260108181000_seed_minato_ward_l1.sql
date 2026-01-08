-- Seed Data for Minato Ward (Roppongi, Omotesando, Shimbashi, Odaiba)
INSERT INTO l1_custom_places (station_id, name_i18n, primary_category, category, vibe_tags, ai_description, keywords, is_active, status, location)
VALUES 

-- ROPPONGI (Art, Nightlife, Luxury)
(
  'odpt:Station:TokyoMetro.Hibiya.Roppongi',
  '{"ja": "六本木ヒルズ", "en": "Roppongi Hills", "zh": "六本木新城"}',
  'culture',
  'landmark',
  '["art", "luxury", "observatory", "night_view"]'::jsonb,
  '東京最著名的現代複合設施，擁有森美術館、展望台與眾多高級餐廳',
  '["mori art museum", "view", "tokyo city view", "shopping", "cinema"]'::jsonb,
  true, 'approved', '{"type": "Point", "coordinates": [139.7291, 35.6604]}'
),
(
  'odpt:Station:TokyoMetro.Hibiya.Roppongi',
  '{"ja": "東京ミッドタウン", "en": "Tokyo Midtown", "zh": "東京中城"}',
  'shopping',
  'mall',
  '["park", "luxury", "art", "relax"]'::jsonb,
  '結合綠地公園與美術館的高質感商場，氛圍比六本木新城更為優雅寧靜',
  '["suntory museum", "park", "shopping", "design"]'::jsonb,
  true, 'approved', '{"type": "Point", "coordinates": [139.7303, 35.6657]}'
),
(
  'odpt:Station:TokyoMetro.Hibiya.Roppongi',
  '{"ja": "森美術館", "en": "Mori Art Museum", "zh": "森美術館"}',
  'culture',
  'museum',
  '["art", "modern", "indoor", "late_night"]'::jsonb,
  '位於六本木新城頂樓，以現代藝術展覽聞名，開館時間較晚適合夜間行程',
  '["art", "museum", "contemporary", "exhibition"]'::jsonb,
  true, 'approved', '{"type": "Point", "coordinates": [139.7291, 35.6604]}'
),

-- OMOTESANDO (Fashion, Architecture)
(
  'odpt:Station:TokyoMetro.Ginza.OmoteSando',
  '{"ja": "表参道ヒルズ", "en": "Omotesando Hills", "zh": "表參道之丘"}',
  'shopping',
  'mall',
  '["fashion", "architecture", "trend", "luxury"]'::jsonb,
  '由安藤忠雄設計的時尚地標，匯集世界頂級品牌的購物大道',
  '["shopping", "ando tadao", "fashion", "brand", "architecture"]'::jsonb,
  true, 'approved', '{"type": "Point", "coordinates": [139.7103, 35.6672]}'
),
(
  'odpt:Station:TokyoMetro.Ginza.OmoteSando',
  '{"ja": "東急プラザ表参道原宿", "en": "Tokyu Plaza Omotesando", "zh": "東急 Plaza 表參道原宿"}',
  'shopping',
  'mall',
  '["trend", "photo", "entrance", "fashion"]'::jsonb,
  '入口處的萬花筒鏡面是著名的打卡點，頂樓有漂亮的空中花園',
  '["mirror", "instagram", "photo", "starbucks", "rooftop"]'::jsonb,
  true, 'approved', '{"type": "Point", "coordinates": [139.7058, 35.6683]}'
),

-- SHIMBASHI (Business, Salaryman, Izakaya)
(
  'odpt:Station:JR-East.Shimbashi',
  '{"ja": "SL広場", "en": "SL Plaza", "zh": "SL廣場"}',
  'culture',
  'landmark',
  '["meeting_point", "historic", "train", "iconic"]'::jsonb,
  '新橋站前的集合點，展示著著名的蒸汽火車頭，是日本上班族的象徵地',
  '["train", "steam locomotive", "meeting", "photo"]'::jsonb,
  true, 'approved', '{"type": "Point", "coordinates": [139.7583, 35.6664]}'
),
(
  'odpt:Station:JR-East.Shimbashi',
  '{"ja": "烏森神社", "en": "Karasumori Shrine", "zh": "烏森神社"}',
  'culture',
  'shrine',
  '["shrine", "colorful", "hidden_gem", "blessing"]'::jsonb,
  '藏身於鬧區巷弄間的神社，以色彩獨特的御朱印聞名',
  '["shrine", "goshuin", "color", "lucky"]'::jsonb,
  true, 'approved', '{"type": "Point", "coordinates": [139.7565, 35.6660]}'
),

-- ODAIBA (Entertainment, View, Robot) -> Target Yurikamome Daiba & Rinkai TokyoTeleport
(
  'odpt:Station:Yurikamome.Daiba',
  '{"ja": "アクアシティお台場", "en": "AQUA CiTY ODAIBA", "zh": "AQUA CiTY 台場"}',
  'shopping',
  'mall',
  '["view", "rainbow_bridge", "family_friendly", "dining"]'::jsonb,
  '正面對彩虹大橋與自由女神像的大型商場，餐廳景觀極佳',
  '["view", "statue of liberty", "shopping", "rainbow bridge"]'::jsonb,
  true, 'approved', '{"type": "Point", "coordinates": [139.7712, 35.6275]}'
),
(
  'odpt:Station:TWR.Rinkai.TokyoTeleport',
  '{"ja": "ダイバーシティ東京 プラザ", "en": "DiverCity Tokyo Plaza", "zh": "DiverCity Tokyo Plaza"}',
  'shopping',
  'mall',
  '["gundam", "food_court", "anime", "shopping"]'::jsonb,
  '以其巨大的獨角獸鋼彈立像聞名，館內有鋼彈基地與大型美食街',
  '["gundam", "robot", "statue", "food", "anime"]'::jsonb,
  true, 'approved', '{"type": "Point", "coordinates": [139.7753, 35.6253]}'
),
(
  'odpt:Station:Yurikamome.OdaibaKaihinkoen',
  '{"ja": "東京ジョイポリス", "en": "Tokyo Joypolis", "zh": "東京 Joypolis"}',
  'leisure',
  'theme_park',
  '["indoor", "arcade", "vr", "rainy_day"]'::jsonb,
  '日本最大的室內遊樂園，由 SEGA 營運，雨天也能盡情遊玩',
  '["sega", "game", "amusement", "indoor", "vr"]'::jsonb,
  true, 'approved', '{"type": "Point", "coordinates": [139.7778, 35.6286]}'
);
