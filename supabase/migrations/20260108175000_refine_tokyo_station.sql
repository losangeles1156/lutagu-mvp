-- 1. Update Tokyo Character Street (More specific description)
UPDATE l1_custom_places
SET 
  ai_description = '位於東京車站一番街，集結了30家以上電視台與動漫官方商店（如 Jump Shop, 吉卜力, 寶可夢, 拉拉熊等），是購買官方正版周邊的一站式地標',
  keywords = '["pokemon", "ghibli", "jump", "souvenir", "gift", "rilakkuma", "snoopy", "official store"]'::jsonb
WHERE station_id = 'odpt:Station:JR-East.Tokyo' 
  AND name_i18n->>'en' = 'Tokyo Character Street';

-- 2. Add Ekibenya Matsuri (Railway Bento)
INSERT INTO l1_custom_places (station_id, name_i18n, primary_category, category, vibe_tags, ai_description, keywords, is_active, status, location)
VALUES 
(
  'odpt:Station:JR-East.Tokyo',
  '{"ja": "駅弁屋 祭", "en": "Ekibenya Matsuri", "zh": "鐵路便當屋 祭"}',
  'dining',
  'bento',
  '["takeout", "famous", "variety", "station_exclusive", "crowded"]'::jsonb,
  '東京車站內最大的鐵路便當專賣店，匯集全日本各地超過200種特色便當，是搭新幹線前的必經之地',
  '["ekiben", "bento", "lunch box", "便當", "railway", "shinkansen"]'::jsonb,
  true, 
  'approved', 
  '{"type": "Point", "coordinates": [139.7665, 35.6811]}' -- Approx location inside Central Passage
);
