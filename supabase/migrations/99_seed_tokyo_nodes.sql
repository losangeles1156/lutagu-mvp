-- Seed Key Hub Nodes for Tokyo Core MVP
-- Coordinates are approx (Lat, Lon) for PostGIS Point(Lon Lat)

-- 1. Ueno Station
insert into nodes (id, city_id, name, type, location, geohash, zone, vibe, is_hub, source_dataset)
values (
  'odpt:Station:TokyoMetro.Ueno',
  'tokyo_core',
  '{"zh-TW": "上野", "en": "Ueno", "ja": "上野"}',
  'station',
  st_point(139.7770, 35.7138),
  'xn77k', -- dummy geohash for MVP
  'core',
  'culture',
  true,
  'odpt'
) on conflict (id) do nothing;

insert into node_facility_profiles (node_id, radius_meters, category_counts, vibe_tags, total_count, dominant_category)
values (
  'odpt:Station:TokyoMetro.Ueno', 
  500,
  '{"shopping": 85, "dining": 90, "leisure": 88, "culture": 75, "transport": 95, "nightlife": 80}',
  array['#阿美橫町', '#居酒屋天國', '#熊貓', '#美術館巡禮', '#下町風情', '#交通樞紐'],
  350,
  'shopping'
) on conflict (node_id) do update set 
  category_counts = EXCLUDED.category_counts,
  vibe_tags = EXCLUDED.vibe_tags,
  total_count = EXCLUDED.total_count,
  dominant_category = EXCLUDED.dominant_category;

-- 2. Asakusa Station
insert into nodes (id, city_id, name, type, location, geohash, zone, vibe, is_hub, source_dataset)
values (
  'odpt:Station:TokyoMetro.Asakusa',
  'tokyo_core',
  '{"zh-TW": "淺草", "en": "Asakusa", "ja": "浅草"}',
  'station',
  st_point(139.7976, 35.7119),
  'xn77k',
  'core',
  'tourism',
  true,
  'odpt'
) on conflict (id) do nothing;

insert into node_facility_profiles (node_id, radius_meters, category_counts, vibe_tags, total_count, dominant_category)
values (
  'odpt:Station:TokyoMetro.Asakusa', 
  500,
  '{"shopping": 30, "dining": 50, "temple": 5, "tourist": 20}',
  array['traditional', 'temple', 'crowded'],
  105,
  'dining'
) on conflict (node_id) do nothing;

-- 3. Tokyo Station
insert into nodes (id, city_id, name, type, location, geohash, zone, vibe, is_hub, source_dataset)
values (
  'odpt:Station:JR-East.Tokyo',
  'tokyo_core',
  '{"zh-TW": "東京", "en": "Tokyo", "ja": "東京"}',
  'station',
  st_point(139.7671, 35.6812),
  'xn76u',
  'core',
  'transit',
  true,
  'odpt'
) on conflict (id) do nothing;

insert into node_facility_profiles (node_id, radius_meters, category_counts, vibe_tags, total_count, dominant_category)
values (
  'odpt:Station:JR-East.Tokyo', 
  500,
  '{"shopping": 50, "dining": 60, "business": 40}',
  array['business', 'transit', 'premium'],
  150,
  'dining'
) on conflict (node_id) do nothing;

-- 4. Akihabara Station
insert into nodes (id, city_id, name, type, location, geohash, zone, vibe, is_hub, source_dataset)
values (
  'odpt:Station:JR-East.Akihabara',
  'tokyo_core',
  '{"zh-TW": "秋葉原", "en": "Akihabara", "ja": "秋葉原"}',
  'station',
  st_point(139.7753, 35.6984),
  'xn77e',
  'core',
  'geek',
  true,
  'odpt'
) on conflict (id) do nothing;

insert into node_facility_profiles (node_id, radius_meters, category_counts, vibe_tags, total_count, dominant_category)
values (
  'odpt:Station:JR-East.Akihabara', 
  500,
  '{"shopping": 80, "dining": 30, "electronics": 50, "anime": 40}',
  array['electronics', 'anime', 'subculture'],
  200,
  'shopping'
) on conflict (node_id) do nothing;

-- 5. Ginza Station
insert into nodes (id, city_id, name, type, location, geohash, zone, vibe, is_hub, source_dataset)
values (
  'odpt:Station:TokyoMetro.Ginza',
  'tokyo_core',
  '{"zh-TW": "銀座", "en": "Ginza", "ja": "銀座"}',
  'station',
  st_point(139.7619, 35.6719),
  'xn76u',
  'core',
  'luxury',
  true,
  'odpt'
) on conflict (id) do nothing;

insert into node_facility_profiles (node_id, radius_meters, category_counts, vibe_tags, total_count, dominant_category)
values (
  'odpt:Station:TokyoMetro.Ginza', 
  500,
  '{"shopping": 100, "dining": 80, "luxury": 40}',
  array['luxury', 'shopping', 'expensive'],
  220,
  'shopping'
) on conflict (node_id) do nothing;
