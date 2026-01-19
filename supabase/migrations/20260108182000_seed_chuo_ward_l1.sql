-- Seed Data for Chuo Ward (Tsukiji, Nihombashi, Mitsukoshimae)
INSERT INTO l1_custom_places (station_id, name_i18n, primary_category, category, vibe_tags, ai_description, keywords, is_active, status, location)
VALUES

-- TSUKIJI (Food, History, Temple)
(
  'odpt:Station:TokyoMetro.Hibiya.Tsukiji',
  '{"ja": "築地場外市場", "en": "Tsukiji Outer Market", "zh": "築地場外市場"}'::jsonb,
  'dining',
  'market',
  '{"en": ["sushi", "street_food", "seafood", "breakfast"], "zh": ["壽司", "海鮮", "早餐", "小吃"]}'::jsonb,
  '即使批發市場已搬遷，這裡依然是東京最好的海鮮美食街，著名的玉子燒與海鮮丼都在此',
  '["sushi", "seafood", "market", "street food", "tamagoyaki"]'::jsonb,
  true, 'approved', '{"type": "Point", "coordinates": [139.7715, 35.6655]}'
),
(
  'odpt:Station:TokyoMetro.Hibiya.Tsukiji',
  '{"ja": "築地本願寺", "en": "Tsukiji Hongwanji Temple", "zh": "築地本願寺"}'::jsonb,
  'culture',
  'temple',
  '{"en": ["architecture", "unique", "cafe", "temple"], "zh": ["建築", "印度風格", "咖啡廳", "寺廟"]}'::jsonb,
  '外觀獨特的古代印度風格寺廟，內設有現代化的咖啡廳與管風琴，打破傳統印象的必訪景點',
  '["temple", "architecture", "cafe", "unique"]'::jsonb,
  true, 'approved', '{"type": "Point", "coordinates": [139.7718, 35.6668]}'
),

-- NIHOMBASHI / MITSUKOSHIMAE (History, Department Store, Finance)
(
  'odpt:Station:TokyoMetro.Ginza.Nihombashi',
  '{"ja": "日本橋 (橋梁)", "en": "Nihombashi Bridge", "zh": "日本橋 (橋梁)"}'::jsonb,
  'culture',
  'landmark',
  '{"en": ["historic", "zero_mile", "highway", "iconic"], "zh": ["道路元標", "麒麟之翼", "歷史", "地標"]}'::jsonb,
  '日本道路的起點（道路元標），橋上的麒麟之翼像因東野圭吾的小說而聞名',
  '["kirin", "bridge", "history", "landmark", "highway"]'::jsonb,
  true, 'approved', '{"type": "Point", "coordinates": [139.7745, 35.6840]}'
),
(
  'odpt:Station:TokyoMetro.Ginza.Mitsukoshimae',
  '{"ja": "日本橋三越本店", "en": "Nihombashi Mitsukoshi Main Store", "zh": "日本橋三越本店"}'::jsonb,
  'shopping',
  'department_store',
  '{"en": ["historic", "luxury", "architecture", "iconic"], "zh": ["歷史", "百貨公司", "建築", "獅子像"]}'::jsonb,
  '日本第一家百貨公司，被指定為重要文化財，門口的獅子像是著名的會面點',
  '["department store", "shopping", "luxury", "history", "lion"]'::jsonb,
  true, 'approved', '{"type": "Point", "coordinates": [139.7735, 35.6856]}'
),
(
  'odpt:Station:TokyoMetro.Ginza.Mitsukoshimae',
  '{"ja": "コレド室町 (COREDO Muromachi)", "en": "COREDO Muromachi", "zh": "COREDO 室町"}'::jsonb,
  'shopping',
  'mall',
  '{"en": ["modern", "traditional", "dining", "crafts"], "zh": ["和風", "現代", "美食", "工藝"]}'::jsonb,
  '融合江戶風情與現代設計的商業設施，聚集了許多日本老字號的餐飲與工藝品店',
  '["shopping", "dining", "crafts", "modern", "edo"]'::jsonb,
  true, 'approved', '{"type": "Point", "coordinates": [139.7742, 35.6865]}'
);
