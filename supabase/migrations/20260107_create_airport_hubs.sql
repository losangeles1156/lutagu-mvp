-- Create Airport Ward
INSERT INTO wards (id, name_i18n, prefecture, ward_code, boundary, center_point, priority_order, is_active)
VALUES 
(
  'ward:airport',
  '{"ja": "空港エリア", "en": "Airport Area", "zh-TW": "機場區域"}',
  'Tokyo/Chiba',
  '99999',
  ST_GeomFromText('POLYGON((139.7 35.5, 140.4 35.5, 140.4 35.8, 139.7 35.8, 139.7 35.5))', 4326), -- Covers both airports roughly
  ST_SetSRID(ST_MakePoint(140.0, 35.65), 4326),
  99,
  true
)
ON CONFLICT (id) DO NOTHING;

-- Create Airport Hubs
INSERT INTO nodes (id, name, node_type, is_hub, ward_id, city_id, coordinates, is_active)
VALUES 
(
  'odpt:Station:Airport.Haneda',
  '{"ja": "羽田空港", "en": "Haneda Airport", "zh-TW": "羽田機場"}',
  'station',
  true,
  'ward:airport', -- Use valid Ward ID
  'tokyo_core',
  ST_SetSRID(ST_MakePoint(139.784, 35.549), 4326),
  true
),
(
  'odpt:Station:Airport.Narita',
  '{"ja": "成田空港", "en": "Narita Airport", "zh-TW": "成田機場"}',
  'station',
  true,
  'ward:airport', -- Use valid Ward ID
  'tokyo_core',
  ST_SetSRID(ST_MakePoint(140.392, 35.772), 4326),
  true
)
ON CONFLICT (id) DO UPDATE SET 
  ward_id = 'ward:airport',
  is_hub = true,
  city_id = 'tokyo_core',
  coordinates = EXCLUDED.coordinates;

-- Aggregating Haneda Child Nodes
UPDATE nodes 
SET parent_hub_id = 'odpt:Station:Airport.Haneda'
WHERE 
  id LIKE 'odpt.Station:TokyoMonorail.HanedaAirportLine.Haneda%' OR
  id LIKE 'odpt.Station:Keikyu.Airport.Haneda%';

-- Aggregating Narita Child Nodes
UPDATE nodes 
SET parent_hub_id = 'odpt:Station:Airport.Narita'
WHERE 
  id LIKE 'odpt.Station:Keisei.%NaritaAirport%';
