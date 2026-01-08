-- Seed L3 Service Facilities for Tier 1 Batch 3 (Oshiage, Shinagawa, Otemachi, Ginza)
-- LUTAGU L3 Data Rules: Max 10 per category, Public Restrooms Only, Station-Internal

-- Oshiage (Skytree)
INSERT INTO l3_facilities (station_id, type, name_i18n, attributes, location_coords)
VALUES
  -- TOILETS
  (
    'odpt.Station:TokyoMetro.Hanzomon.Oshiage', 'toilet',
    '{"ja": "スカイツリー改札外トイレ", "en": "Skytree Gate Restroom", "zh": "晴空塔改札外洗手間"}',
    '{"wheelchair": true, "baby_room": true, "location_description": "B3F, Near Skytree Entrance"}',
    NULL
  ),
  -- LOCKERS
  (
    'odpt.Station:Toei.Asakusa.Oshiage', 'locker',
    '{"ja": "スカイツリー直結ロッカー", "en": "Skytree Direct Lockers", "zh": "晴空塔直結置物櫃"}',
    '{"sizes": ["S", "M", "L", "XL"], "count": "80+", "location_description": "Underground Connection, Near Ticket Gate"}',
    NULL
  ),
  -- ELEVATORS
  (
    'odpt.Station:TokyoMetro.Hanzomon.Oshiage', 'elevator',
    '{"ja": "スカイツリーアクセスEV", "en": "Skytree Access Elevator", "zh": "晴空塔直達電梯"}',
    '{"floors": ["B3", "1F", "Skytree 4F"], "wheelchair": true, "location_description": "Direct to Skytree Town Entrance"}',
    NULL
  );

-- Shinagawa
INSERT INTO l3_facilities (station_id, type, name_i18n, attributes, location_coords)
VALUES
  -- TOILETS
  (
    'odpt.Station:JR-East.Shinagawa', 'toilet',
    '{"ja": "新幹線改札内トイレ", "en": "Shinkansen Gate Restroom", "zh": "新幹線改札內洗手間"}',
    '{"wheelchair": true, "baby_room": true, "location_description": "3F Shinkansen Concourse"}',
    NULL
  ),
  -- LOCKERS
  (
    'odpt.Station:JR-East.Shinagawa', 'locker',
    '{"ja": "中央改札口ロッカー", "en": "Central Gate Lockers", "zh": "中央改札口置物櫃"}',
    '{"sizes": ["S", "M", "L", "XL"], "count": "200+", "location_description": "Near Central Gate (Konan Side)"}',
    NULL
  ),
  -- ELEVATORS
  (
    'odpt.Station:Keikyu.Main.Shinagawa', 'elevator',
    '{"ja": "京急線エレベーター", "en": "Keikyu Line Elevator", "zh": "京急線電梯"}',
    '{"floors": ["1F", "2F"], "wheelchair": true, "location_description": "Wings Port Direct Access"}',
    NULL
  );

-- Otemachi
INSERT INTO l3_facilities (station_id, type, name_i18n, attributes, location_coords)
VALUES
  -- TOILETS
  (
    'odpt.Station:TokyoMetro.Chiyoda.Otemachi', 'toilet',
    '{"ja": "千代田線改札内トイレ", "en": "Chiyoda Line Restroom", "zh": "千代田線改札內洗手間"}',
    '{"wheelchair": true, "baby_room": false, "location_description": "Near Exit C1"}',
    NULL
  ),
  -- LOCKERS
  (
    'odpt.Station:TokyoMetro.Marunouchi.Otemachi', 'locker',
    '{"ja": "丸ノ内線改札外ロッカー", "en": "Marunouchi Line Lockers", "zh": "丸之內線改札外置物櫃"}',
    '{"sizes": ["S", "M", "L"], "count": "30", "location_description": "Underground Passage (B2F)"}',
    NULL
  ),
  -- ELEVATORS
  (
    'odpt.Station:TokyoMetro.Tozai.Otemachi', 'elevator',
    '{"ja": "東西線皇居方面EV", "en": "Tozai Line Palace Elevator", "zh": "東西線皇居方面電梯"}',
    '{"floors": ["B4", "B1", "1F"], "wheelchair": true, "location_description": "Exit C13 (Imperial Palace East Garden)"}',
    NULL
  );

-- Ginza
INSERT INTO l3_facilities (station_id, type, name_i18n, attributes, location_coords)
VALUES
  -- TOILETS
  (
    'odpt.Station:TokyoMetro.Ginza.Ginza', 'toilet',
    '{"ja": "銀座線改札内トイレ", "en": "Ginza Line Restroom", "zh": "銀座線改札內洗手間"}',
    '{"wheelchair": true, "baby_room": true, "location_description": "Near Exit A12 (Ginza 4-chome)"}',
    NULL
  ),
  -- LOCKERS
  (
    'odpt.Station:TokyoMetro.Marunouchi.Ginza', 'locker',
    '{"ja": "丸ノ内線ロッカー", "en": "Marunouchi Line Lockers", "zh": "丸之內線置物櫃"}',
    '{"sizes": ["S", "M", "L"], "count": "40", "location_description": "B1F Connection Passage"}',
    NULL
  ),
  -- ELEVATORS
  (
    'odpt.Station:TokyoMetro.Hibiya.Ginza', 'elevator',
    '{"ja": "日比谷線エレベーター", "en": "Hibiya Line Elevator", "zh": "日比谷線電梯"}',
    '{"floors": ["B3", "1F"], "wheelchair": true, "location_description": "Exit A5 (Connects to Mitsukoshi)"}',
    NULL
  );
