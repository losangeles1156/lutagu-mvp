-- Insert seed data for Asakusa and Iidabashi
INSERT INTO l1_custom_places (station_id, name_i18n, primary_category, category, vibe_tags, ai_description, keywords, is_active, status, location)
VALUES 
(
  'odpt.Station:TokyoMetro.Ginza.Asakusa',
  '{"ja": "吉野家 浅草店", "en": "Yoshinoya Asakusa", "zh": "吉野家 淺草店"}',
  'dining',
  'fast_food',
  '["budget", "chain", "fast_food", "late_night"]'::jsonb,
  '平價連鎖牛丼店，24小時營業，適合快速用餐',
  '["牛丼", "beef bowl", "便宜", "cheap", "24時間"]'::jsonb,
  true,
  'approved',
  '{"type": "Point", "coordinates": [139.7963, 35.7112]}'
),
(
  'odpt.Station:TokyoMetro.Ginza.Asakusa',
  '{"ja": "浅草寺", "en": "Senso-ji Temple", "zh": "淺草寺"}',
  'culture',
  'temple',
  '["historic", "tourist_spot", "spiritual", "instagram"]'::jsonb,
  '東京最古老寺廟，雷門為著名地標，觀光人潮眾多',
  '["雷門", "Kaminarimon", "寺廟", "temple", "淺草"]'::jsonb,
  true,
  'approved',
  '{"type": "Point", "coordinates": [139.7966, 35.7147]}'
),
(
  'odpt.Station:TokyoMetro.Tozai.Iidabashi',
  '{"ja": "東京大神宮", "en": "Tokyo Daijingu", "zh": "東京大神宮"}',
  'culture',
  'shrine',
  '["spiritual", "love_luck", "hidden_gem", "local_favorite"]'::jsonb,
  '以求姻緣聞名的神社，是日本神前婚禮發源地',
  '["戀愛", "love", "結婚", "wedding", "姻緣", "en-musubi"]'::jsonb,
  true,
  'approved',
  '{"type": "Point", "coordinates": [139.7465, 35.7000]}'
);
