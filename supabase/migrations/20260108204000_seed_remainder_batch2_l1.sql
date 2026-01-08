-- Seed L1 Custom Places for Remainder Wards (Ikebukuro, Shinagawa, Meguro, etc.)

INSERT INTO l1_custom_places (station_id, name_i18n, primary_category, vibe_tags, ai_description, location)
VALUES
  -- Ikebukuro: Sunshine City
  (
    'odpt.Station:JR-East.Ikebukuro',
    '{"en": "Sunshine City", "ja": "サンシャインシティ", "zh": "太陽城"}',
    'shopping',
    to_jsonb(ARRAY['aquarium', 'shopping', 'pokemon', 'observatory']),
    '池袋的地標性複合設施，擁有水族館、展望台、購物中心與寶可夢中心。',
    ST_AsGeoJSON(ST_SetSRID(ST_MakePoint(139.7196, 35.7289), 4326))::jsonb
  ),
  -- Ikebukuro: Sunshine Aquarium
  (
    'odpt.Station:JR-East.Ikebukuro',
    '{"en": "Sunshine Aquarium", "ja": "サンシャイン水族館", "zh": "陽光水族館"}',
    'attraction',
    to_jsonb(ARRAY['aquarium', 'sky', 'penguins', 'rooftop']),
    '位於高樓頂層的都市型水族館，以「天空中的綠洲」為概念，能看到企鵝在城市天際線中游泳。',
    ST_AsGeoJSON(ST_SetSRID(ST_MakePoint(139.7197, 35.7292), 4326))::jsonb
  ),
  -- Shinagawa: Maxell Aqua Park
  (
    'odpt.Station:JR-East.Shinagawa',
    '{"en": "Maxell Aqua Park Shinagawa", "ja": "マクセル アクアパーク品川", "zh": "Maxell Aqua Park 品川"}',
    'attraction',
    to_jsonb(ARRAY['aquarium', 'dolphin', 'digital', 'art']),
    '結合數位藝術與海豚表演的現代水族館，位於品川王子大飯店內，營業至深夜。',
    ST_AsGeoJSON(ST_SetSRID(ST_MakePoint(139.7365, 35.6277), 4326))::jsonb
  ),
  -- Meguro: Meguro River (Cherry Blossoms)
  (
    'odpt.Station:JR-East.Meguro',
    '{"en": "Meguro River", "ja": "目黒川", "zh": "目黑川"}',
    'nature',
    to_jsonb(ARRAY['sakura', 'river', 'scenic', 'crowded']),
    '東京最著名的賞櫻勝地之一，兩岸種滿櫻花樹，夜櫻更是絕美，平日則是幽靜的散步道。',
    ST_AsGeoJSON(ST_SetSRID(ST_MakePoint(139.7067, 35.6337), 4326))::jsonb
  ),
  -- Meguro: Hotel Gajoen Tokyo
  (
    'odpt.Station:JR-East.Meguro',
    '{"en": "Hotel Gajoen Tokyo", "ja": "ホテル雅叙園東京", "zh": "東京雅敘園酒店"}',
    'attraction',
    to_jsonb(ARRAY['art', 'history', 'luxury', 'museum']),
    '被稱為「昭和的龍宮城」，擁有豪華絢爛的日本畫裝飾與著名的「百階段」文化財，免費區域也很值得參觀。',
    ST_AsGeoJSON(ST_SetSRID(ST_MakePoint(139.7107, 35.6315), 4326))::jsonb
  ),
  -- Sengakuji: Sengakuji Temple
  (
    'odpt.Station:Toei.Asakusa.Sengakuji',
    '{"en": "Sengakuji Temple", "ja": "泉岳寺", "zh": "泉岳寺"}',
    'temple',
    to_jsonb(ARRAY['history', 'samurai', '47ronin', 'peaceful']),
    '赤穗四十七浪士的長眠之地，歷史迷必訪的聖地，境內肅穆莊嚴。',
    ST_AsGeoJSON(ST_SetSRID(ST_MakePoint(139.7383, 35.6375), 4326))::jsonb
  ),
  -- Kamata: Kamata Onsen (Black Water)
  (
    'odpt.Station:JR-East.Kamata',
    '{"en": "Kamata Onsen", "ja": "蒲田温泉", "zh": "蒲田溫泉"}',
    'onsen',
    to_jsonb(ARRAY['onsen', 'local', 'black_water', 'retro']),
    '蒲田特有的「黑湯」溫泉，水色如咖啡，泉質滑順，是著名的錢湯激戰區代表。',
    ST_AsGeoJSON(ST_SetSRID(ST_MakePoint(139.7225, 35.5605), 4326))::jsonb
  );
