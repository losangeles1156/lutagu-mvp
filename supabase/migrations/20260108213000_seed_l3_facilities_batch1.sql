-- Seed L3 Service Facilities for Major Hubs (Ueno, Shinjuku, Tokyo, Shibuya)

-- Ueno (JR & Metro)
INSERT INTO l3_facilities (station_id, type, name_i18n, attributes, location_coords)
VALUES
  -- TOILETS
  (
    'odpt.Station:JR-East.Ueno', 'toilet',
    '{"ja": "公園口改札外トイレ", "en": "Park Exit Restroom", "zh": "公園口改札外洗手間"}',
    '{"wheelchair": true, "baby_room": true, "location_description": "Outside Park Exit Gate, Turn Left"}',
    NULL
  ),
  (
    'odpt.Station:TokyoMetro.Ginza.Ueno', 'toilet',
    '{"ja": "銀座線改札内トイレ", "en": "Ginza Line Gate Inside Restroom", "zh": "銀座線改札內洗手間"}',
    '{"wheelchair": false, "baby_room": false, "location_description": "Near Exit 5"}',
    NULL
  ),
  -- LOCKERS
  (
    'odpt.Station:JR-East.Ueno', 'locker',
    '{"ja": "中央口大ロッカー群", "en": "Central Gate Large Lockers", "zh": "中央口大型置物櫃區"}',
    '{"sizes": ["S", "M", "L", "XL"], "count": "100+", "location_description": "Central Gate (Ground Floor), near Ticket Office"}',
    NULL
  ),
  -- ELEVATORS
  (
    'odpt.Station:TokyoMetro.Hibiya.Ueno', 'elevator',
    '{"ja": "昭和通り方面エレベーター", "en": "Showa-dori Elevator", "zh": "昭和通方面電梯"}',
    '{"floors": ["B2", "1F"], "wheelchair": true, "location_description": "Exit 1 (Access to Ameyoko)"}',
    NULL
  );

-- Shinjuku (JR & Toei)
INSERT INTO l3_facilities (station_id, type, name_i18n, attributes, location_coords)
VALUES
  -- TOILETS
  (
    'odpt.Station:JR-East.Shinjuku', 'toilet',
    '{"ja": "東口改札内トイレ", "en": "East Gate Inside Restroom", "zh": "東口改札內洗手間"}',
    '{"wheelchair": true, "baby_room": true, "location_description": "Inside East Gate, near Alps Plaza"}',
    NULL
  ),
  -- LOCKERS
  (
    'odpt.Station:JR-East.Shinjuku', 'locker',
    '{"ja": "西口地下ロッカー", "en": "West Exit Underground Lockers", "zh": "西口地下置物櫃"}',
    '{"sizes": ["S", "M", "L"], "count": "200+", "location_description": "B1F, Main Concourse towards Taxi Stand"}',
    NULL
  ),
  -- ELEVATORS
  (
    'odpt.Station:Toei.Oedo.Shinjuku', 'elevator',
    '{"ja": "大江戸線マインズタワー方面EV", "en": "Oedo Line Maynds Tower EV", "zh": "大江戶線 Maynds Tower 電梯"}',
    '{"floors": ["B7", "B1", "1F"], "wheelchair": true, "location_description": "Exit A1"}',
    NULL
  );

-- Tokyo (JR & Metro)
INSERT INTO l3_facilities (station_id, type, name_i18n, attributes, location_coords)
VALUES
  -- TOILETS
  (
    'odpt.Station:JR-East.Tokyo', 'toilet',
    '{"ja": "丸の内中央口トイレ", "en": "Marunouchi Central Restroom", "zh": "丸之內中央口洗手間"}',
    '{"wheelchair": true, "baby_room": true, "location_description": "B1F Gransta Area"}',
    NULL
  ),
  -- LOCKERS
  (
    'odpt.Station:JR-East.Tokyo', 'locker',
    '{"ja": "八重洲南口ロッカー", "en": "Yaesu South Lockers", "zh": "八重洲南口置物櫃"}',
    '{"sizes": ["S", "M", "L", "XL"], "count": "Many", "location_description": "Access to Highway Bus Terminal"}',
    NULL
  );

-- Shibuya (JR & Metro)
INSERT INTO l3_facilities (station_id, type, name_i18n, attributes, location_coords)
VALUES
  -- TOILETS
  (
    'odpt.Station:JR-East.Shibuya', 'toilet',
    '{"ja": "ハチ公口改札内トイレ", "en": "Hachiko Gate Restroom", "zh": "八公口改札內洗手間"}',
    '{"wheelchair": true, "baby_room": false, "location_description": "Inside Hachiko Gate"}',
    NULL
  ),
  -- LOCKERS
  (
    'odpt.Station:TokyoMetro.Ginza.Shibuya', 'locker',
    '{"ja": "ヒカリエ改札外ロッカー", "en": "Hikarie Gate Lockers", "zh": "Hikarie改札外置物櫃"}',
    '{"sizes": ["S", "M"], "count": "50", "location_description": "2F Connection Bridge"}',
    NULL
  );
