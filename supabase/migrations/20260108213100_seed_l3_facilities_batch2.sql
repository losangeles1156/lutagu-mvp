-- Seed L3 Service Facilities for Tier 1 Batch 2 (Akihabara, Asakusa, Ikebukuro)
-- LUTAGU L3 Data Rules: Max 10 per category, Public Restrooms Only, Station-Internal

-- Akihabara (JR & Metro)
INSERT INTO l3_facilities (station_id, type, name_i18n, attributes, location_coords)
VALUES
  -- TOILETS
  (
    'odpt.Station:JR-East.Akihabara', 'toilet',
    '{"ja": "電気街口改札内トイレ", "en": "Electric Town Gate Restroom", "zh": "電器街口改札內洗手間"}',
    '{"wheelchair": true, "baby_room": false, "location_description": "Inside Electric Town Gate, Ground Floor"}',
    NULL
  ),
  -- LOCKERS
  (
    'odpt.Station:JR-East.Akihabara', 'locker',
    '{"ja": "中央改札口ロッカー", "en": "Central Gate Lockers", "zh": "中央改札口置物櫃"}',
    '{"sizes": ["S", "M", "L"], "count": "50+", "location_description": "Near Central Gate Ticket Office"}',
    NULL
  ),
  -- ELEVATORS
  (
    'odpt.Station:TokyoMetro.Hibiya.Akihabara', 'elevator',
    '{"ja": "日比谷線改札口エレベーター", "en": "Hibiya Line Elevator", "zh": "日比谷線改札口電梯"}',
    '{"floors": ["B3", "1F"], "wheelchair": true, "location_description": "Exit 3 (Connects to Showa-dori)"}',
    NULL
  );

-- Asakusa (Metro & Toei)
INSERT INTO l3_facilities (station_id, type, name_i18n, attributes, location_coords)
VALUES
  -- TOILETS
  (
    'odpt.Station:TokyoMetro.Ginza.Asakusa', 'toilet',
    '{"ja": "銀座線改札内トイレ", "en": "Ginza Line Gate Restroom", "zh": "銀座線改札內洗手間"}',
    '{"wheelchair": true, "baby_room": true, "location_description": "Near Exit 1 (Kaminarimon Side)"}',
    NULL
  ),
  (
    'odpt.Station:Toei.Asakusa.Asakusa', 'toilet',
    '{"ja": "浅草線改札内トイレ", "en": "Asakusa Line Gate Restroom", "zh": "淺草線改札內洗手間"}',
    '{"wheelchair": true, "baby_room": false, "location_description": "B1F Concourse"}',
    NULL
  ),
  -- LOCKERS
  (
    'odpt.Station:TokyoMetro.Ginza.Asakusa', 'locker',
    '{"ja": "雷門方面ロッカー", "en": "Kaminarimon Lockers", "zh": "雷門方面置物櫃"}',
    '{"sizes": ["S", "M", "L", "XL"], "count": "100+", "location_description": "Exit 1-4 Area, Multiple Banks"}',
    NULL
  ),
  -- ELEVATORS
  (
    'odpt.Station:TokyoMetro.Ginza.Asakusa', 'elevator',
    '{"ja": "雷門エレベーター", "en": "Kaminarimon Elevator", "zh": "雷門電梯"}',
    '{"floors": ["B2", "1F"], "wheelchair": true, "location_description": "Exit 2 (Direct to Kaminarimon Gate)"}',
    NULL
  );

-- Ikebukuro (JR & Metro)
INSERT INTO l3_facilities (station_id, type, name_i18n, attributes, location_coords)
VALUES
  -- TOILETS
  (
    'odpt.Station:JR-East.Ikebukuro', 'toilet',
    '{"ja": "西口改札内トイレ", "en": "West Gate Restroom", "zh": "西口改札內洗手間"}',
    '{"wheelchair": true, "baby_room": true, "location_description": "Inside West Gate, near Tobu Entrance"}',
    NULL
  ),
  (
    'odpt.Station:TokyoMetro.Marunouchi.Ikebukuro', 'toilet',
    '{"ja": "丸ノ内線改札内トイレ", "en": "Marunouchi Line Restroom", "zh": "丸之內線改札內洗手間"}',
    '{"wheelchair": true, "baby_room": false, "location_description": "B1F, Near Exit 20-22"}',
    NULL
  ),
  -- LOCKERS
  (
    'odpt.Station:JR-East.Ikebukuro', 'locker',
    '{"ja": "北口ロッカー群", "en": "North Exit Locker Banks", "zh": "北口大型置物櫃區"}',
    '{"sizes": ["S", "M", "L", "XL"], "count": "150+", "location_description": "Near North Exit, Multiple Locations"}',
    NULL
  ),
  -- ELEVATORS
  (
    'odpt.Station:TokyoMetro.Yurakucho.Ikebukuro', 'elevator',
    '{"ja": "有楽町線東口方面EV", "en": "Yurakucho Line East Exit EV", "zh": "有樂町線東口電梯"}',
    '{"floors": ["B3", "B1", "1F"], "wheelchair": true, "location_description": "Exit 39 (Seibu Side)"}',
    NULL
  );
