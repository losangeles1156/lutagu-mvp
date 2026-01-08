-- Seed L1 Custom Places for Shibuya Ward (Ebisu, Daikanyama, Harajuku)

INSERT INTO l1_custom_places (station_id, name_i18n, primary_category, vibe_tags, ai_description, location)
VALUES
  -- Ebisu: Yebisu Garden Place
  (
    'odpt.Station:JR-East.Ebisu',
    '{"en": "Yebisu Garden Place", "ja": "恵比寿ガーデンプレイス", "zh": "惠比壽花園廣場"}',
    'attraction',
    to_jsonb(ARRAY['shopping', 'scenic', 'illumination', 'beer']),
    '充滿歐洲風情的複合設施，有美麗的聖誕點燈與惠比壽啤酒紀念館。',
    ST_AsGeoJSON(ST_SetSRID(ST_MakePoint(139.7132, 35.6420), 4326))::jsonb
  ),
  -- Ebisu: AFURI Ramen
  (
    'odpt.Station:JR-East.Ebisu',
    '{"en": "AFURI Ebisu", "ja": "AFURI 恵比寿", "zh": "AFURI 柚子鹽拉麵"}',
    'dining',
    to_jsonb(ARRAY['ramen', 'popular', 'light', 'yuzu']),
    '以清爽的柚子鹽拉麵聞名，深受女性與外國遊客歡迎的人氣排隊店。',
    ST_AsGeoJSON(ST_SetSRID(ST_MakePoint(139.7100, 35.6480), 4326))::jsonb
  ),
  -- Daikanyama: T-Site
  (
    'odpt.Station:Tokyu.DaikanYama',
    '{"en": "Daikanyama T-SITE", "ja": "代官山T-SITE", "zh": "代官山 蔦屋書店"}',
    'shopping',
    to_jsonb(ARRAY['books', 'cafe', 'stylish', 'design']),
    '獲選為世界最美書店之一，結合書店、咖啡與設計的文青聖地。',
    ST_AsGeoJSON(ST_SetSRID(ST_MakePoint(139.6990, 35.6490), 4326))::jsonb
  ),
  -- Harajuku: Takeshita Street
  (
    'odpt.Station:JR-East.Harajuku',
    '{"en": "Takeshita Street", "ja": "竹下通り", "zh": "竹下通"}',
    'shopping',
    to_jsonb(ARRAY['fashion', 'teen', 'crepes', 'kawaii']),
    '日本 Kawaii 文化的發源地，充滿可麗餅店與年輕潮流服飾。',
    ST_AsGeoJSON(ST_SetSRID(ST_MakePoint(139.7030, 35.6715), 4326))::jsonb
  ),
  -- Harajuku: Meiji Jingu
  (
    'odpt.Station:JR-East.Harajuku',
    '{"en": "Meiji Jingu Shrine", "ja": "明治神宮", "zh": "明治神宮"}',
    'temple',
    to_jsonb(ARRAY['nature', 'peaceful', 'history', 'power_spot']),
    '東京市中心最大的綠地與神社，供奉明治天皇，與喧囂的原宿形成強烈對比。',
    ST_AsGeoJSON(ST_SetSRID(ST_MakePoint(139.6995, 35.6764), 4326))::jsonb
  );
