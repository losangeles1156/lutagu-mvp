-- Seed L1 Custom Places for Remainder Wards (Shinjuku, Oshiage, Toyosu, Korakuen)

INSERT INTO l1_custom_places (station_id, name_i18n, primary_category, vibe_tags, ai_description, location)
VALUES
  -- Shinjuku: Golden Gai
  (
    'odpt.Station:JR-East.Shinjuku',
    '{"en": "Shinjuku Golden Gai", "ja": "新宿ゴールデン街", "zh": "新宿黃金街"}',
    'nightlife',
    to_jsonb(ARRAY['bar', 'retro', 'tiny', 'history']),
    '戰後保留至今的木造長屋酒吧街，擁有獨特的昭和氛圍與數百間微型酒吧。',
    ST_AsGeoJSON(ST_SetSRID(ST_MakePoint(139.7040, 35.6940), 4326))::jsonb
  ),
  -- Shinjuku: Omoide Yokocho
  (
    'odpt.Station:JR-East.Shinjuku',
    '{"en": "Omoide Yokocho", "ja": "思い出横丁", "zh": "思出橫丁 (回憶橫丁)"}',
    'dining',
    to_jsonb(ARRAY['izakaya', 'yakitori', 'retro', 'crowded']),
    '充滿煙燻味與人情味的燒鳥巷，俗稱「小便橫丁」，是體驗地道居酒屋文化的絕佳地點。',
    ST_AsGeoJSON(ST_SetSRID(ST_MakePoint(139.6995, 35.6930), 4326))::jsonb
  ),
  -- Oshiage: Tokyo Skytree
  (
    'odpt.Station:TokyoMetro.Oshiage',
    '{"en": "Tokyo Skytree", "ja": "東京スカイツリー", "zh": "東京晴空塔"}',
    'attraction',
    to_jsonb(ARRAY['view', 'landmark', 'height', 'shopping']),
    '世界最高的自立式電波塔，擁有絕佳的東京全景展望台與大型購物中心 Solamachi。',
    ST_AsGeoJSON(ST_SetSRID(ST_MakePoint(139.8107, 35.7100), 4326))::jsonb
  ),
  -- Oshiage: Sumida Aquarium
  (
    'odpt.Station:TokyoMetro.Oshiage',
    '{"en": "Sumida Aquarium", "ja": "すみだ水族館", "zh": "墨田水族館"}',
    'attraction',
    to_jsonb(ARRAY['aquarium', 'penguins', 'jellyfish', 'family']),
    '位於晴空塔下的都市型水族館，以企鵝與水母展示區聞名，設計感十足。',
    ST_AsGeoJSON(ST_SetSRID(ST_MakePoint(139.8095, 35.7102), 4326))::jsonb
  ),
  -- Toyosu: TeamLab Planets
  (
    'odpt.Station:TokyoMetro.Yurakucho.Toyosu',
    '{"en": "teamLab Planets TOKYO", "ja": "チームラボプラネッツ", "zh": "teamLab Planets TOKYO"}',
    'attraction',
    to_jsonb(ARRAY['art', 'digital', 'interactive', 'water']),
    '赤腳體驗的沉浸式數位藝術美術館，與水結合的巨大作品是其最大特色。',
    ST_AsGeoJSON(ST_SetSRID(ST_MakePoint(139.7943, 35.6465), 4326))::jsonb
  ),
  -- Korakuen: Tokyo Dome
  (
    'odpt.Station:TokyoMetro.Marunouchi.Korakuen',
    '{"en": "Tokyo Dome", "ja": "東京ドーム", "zh": "東京巨蛋"}',
    'attraction',
    to_jsonb(ARRAY['baseball', 'concert', 'event', 'amusement']),
    '日本最具代表性的巨蛋球場，不僅是讀賣巨人的主場，也是大型演唱會的聖地，旁有遊樂園。',
    ST_AsGeoJSON(ST_SetSRID(ST_MakePoint(139.7519, 35.7056), 4326))::jsonb
  );
