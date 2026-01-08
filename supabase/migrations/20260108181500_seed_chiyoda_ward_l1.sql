-- Seed Data for Chiyoda Ward (Otemachi, Jimbocho, Hibiya)
INSERT INTO l1_custom_places (station_id, name_i18n, primary_category, category, vibe_tags, ai_description, keywords, is_active, status, location)
VALUES 

-- OTEMACHI (Business, Luxury, Wellness)
(
  'odpt:Station:TokyoMetro.Otemachi',
  '{"ja": "アマン東京 (ザ・ラウンジ by Aman)", "en": "The Lounge by Aman", "zh": "安縵東京 The Lounge"}'::jsonb,
  'dining',
  'cafe',
  '["luxury", "view", "afternoon_tea", "quiet"]'::jsonb,
  '位於安縵酒店頂層的酒吧酒廊，擁有東京最頂級的城市景觀與下午茶',
  '["aman", "hotel", "view", "high tea", "luxury"]'::jsonb,
  true, 'approved', '{"type": "Point", "coordinates": [139.7612, 35.6875]}'
),
(
  'odpt:Station:TokyoMetro.Otemachi',
  '{"ja": "大手町の森", "en": "Otemachi Forest", "zh": "大手町之森"}'::jsonb,
  'nature',
  'park',
  '["nature", "oasis", "hidden_gem", "relax"]'::jsonb,
  '在商業區摩天大樓腳下的一片真實森林，都市中的綠洲',
  '["forest", "nature", "relax", "green"]'::jsonb,
  true, 'approved', '{"type": "Point", "coordinates": [139.7612, 35.6875]}'
),

-- JIMBOCHO (Books, Curry, Retro)
(
  'odpt:Station:TokyoMetro.Hanzomon.Jimbocho',
  '{"ja": "神田古書店街", "en": "Jimbocho Book Town", "zh": "神保町古書街"}'::jsonb,
  'culture',
  'tourist_spot',
  '["books", "history", "culture", "retro"]'::jsonb,
  '世界最大的古書店街，充滿昭和時代的文藝氣息，適合尋寶',
  '["bookstore", "secondhand", "reading", "history"]'::jsonb,
  true, 'approved', '{"type": "Point", "coordinates": [139.7570, 35.6955]}'
),
(
  'odpt:Station:TokyoMetro.Hanzomon.Jimbocho',
  '{"ja": "ボンディ (Bondy)", "en": "Bondy Curry", "zh": "Bondy 咖哩"}'::jsonb,
  'dining',
  'restaurant',
  '["curry", "famous", "lunch", "queue"]'::jsonb,
  '神保町咖哩激戰區的冠軍名店，以濃郁的歐風牛肉咖哩聞名',
  '["curry", "food", "lunch", "famous"]'::jsonb,
  true, 'approved', '{"type": "Point", "coordinates": [139.7570, 35.6955]}'
),

-- HIBIYA (Park, Theater, High-end)
(
  'odpt:Station:TokyoMetro.Hibiya.Hibiya',
  '{"ja": "東京ミッドタウン日比谷", "en": "Tokyo Midtown Hibiya", "zh": "東京中城日比谷"}'::jsonb,
  'shopping',
  'mall',
  '["luxury", "cinema", "view", "dining"]'::jsonb,
  '新地標級的複合商業設施，擁有全東京最大的電影院與眺望皇居的空中花園',
  '["shopping", "cinema", "toho", "view", "park view"]'::jsonb,
  true, 'approved', '{"type": "Point", "coordinates": [139.7598, 35.6734]}'
),
(
  'odpt:Station:TokyoMetro.Hibiya.Hibiya',
  '{"ja": "日比谷公園", "en": "Hibiya Park", "zh": "日比谷公園"}'::jsonb,
  'nature',
  'park',
  '["park", "history", "events", "flower"]'::jsonb,
  '日本最早的西式公園，四季花卉豐富，聖誕市集與啤酒節的舉辦地',
  '["park", "nature", "event", "beer garden"]'::jsonb,
  true, 'approved', '{"type": "Point", "coordinates": [139.7563, 35.6736]}'
),
(
  'odpt:Station:TokyoMetro.Hibiya.Hibiya',
  '{"ja": "東京宝塚劇場", "en": "Tokyo Takarazuka Theater", "zh": "東京寶塚劇場"}'::jsonb,
  'culture',
  'theater',
  '["theater", "musical", "unique", "art"]'::jsonb,
  '寶塚歌劇團的東京據點，全女性演出的華麗歌舞劇，日本獨有的觀劇體驗',
  '["theater", "takarazuka", "musical", "performance"]'::jsonb,
  true, 'approved', '{"type": "Point", "coordinates": [139.7600, 35.6728]}'
);
