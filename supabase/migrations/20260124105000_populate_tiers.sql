-- Tier 1: Super Hubs (Zoom 1+)
-- JR East Green #00AC4E
UPDATE nodes SET display_tier=1, min_zoom_level=1, is_hub=true, primary_operator='JR東日本', brand_color='#00AC4E' 
WHERE id IN (
  'odpt:Station:JR-East.Tokyo', 'odpt:Station:JR-East.Ueno', 'odpt:Station:JR-East.Ikebukuro', 
  'odpt:Station:JR-East.Shinjuku', 'odpt:Station:JR-East.Shibuya', 'odpt:Station:JR-East.Shinagawa', 
  'odpt:Station:JR-East.Akihabara'
);

-- Ginza (Metro Blue #009BBF)
UPDATE nodes SET display_tier=1, min_zoom_level=1, is_hub=true, primary_operator='TokyoMetro', brand_color='#009BBF'
WHERE id IN ('odpt:Station:TokyoMetro.Ginza', 'odpt:Station:TokyoMetro.Ginza.Ginza');

-- Narita Airport (Keisei Blue #003DA5) - Apply to all Narita nodes to be safe
UPDATE nodes SET display_tier=1, min_zoom_level=1, is_hub=true, primary_operator='Keisei', brand_color='#003DA5'
WHERE id LIKE '%NaritaAirport%' OR name->>'ja' LIKE '%成田空港%';

-- Haneda Airport (Monorail Blue #0071BC)
UPDATE nodes SET display_tier=1, min_zoom_level=1, is_hub=true, primary_operator='TokyoMonorail', brand_color='#0071BC'
WHERE id LIKE '%HanedaAirport%' OR name->>'ja' LIKE '%羽田空港%';


-- Tier 2: Major Hubs (Zoom 12+)
-- Tokyo Metro Blue #009BBF
UPDATE nodes SET display_tier=2, min_zoom_level=12, is_hub=true, primary_operator='TokyoMetro', brand_color='#009BBF'
WHERE id IN (
  'odpt:Station:TokyoMetro.Otemachi', 
  'odpt:Station:TokyoMetro.NakaMeguro',
  'odpt:Station:TokyoMetro.Asakusa',
  'odpt:Station:TokyoMetro.Oshiage' -- Oshiage Hanzomon
);

-- Toei Otemachi/Oshiage fallback if Metro ID missed (Magenta #B6007A)
-- Only update if not already set (display_tier=5)
UPDATE nodes SET display_tier=2, min_zoom_level=12, is_hub=true, primary_operator='Toei', brand_color='#B6007A'
WHERE id IN ('odpt:Station:Toei.Otemachi', 'odpt:Station:Toei.Oshiage') AND display_tier = 5;

-- JR East Hubs (Green #00AC4E)
UPDATE nodes SET display_tier=2, min_zoom_level=12, is_hub=true, primary_operator='JR東日本', brand_color='#00AC4E'
WHERE id IN (
  'odpt:Station:JR-East.Shimbashi', 
  'odpt:Station:JR-East.Hamamatsucho', 
  'odpt:Station:JR-East.Okachimachi',
  'odpt:Station:JR-East.Ochanomizu', 
  'odpt:Station:JR-East.Iidabashi', 
  'odpt:Station:JR-East.Nippori',
  'odpt:Station:JR-East.Oimachi', 
  'odpt:Station:JR-East.Kamata'
);

-- Sengakuji (Keikyu Red #E31E24)
UPDATE nodes SET display_tier=2, min_zoom_level=12, is_hub=true, primary_operator='Keikyu', brand_color='#E31E24'
WHERE id LIKE '%Sengakuji%';

-- Catch-all for named Tier 2 nodes not matched by ID (using Toei/Metro/JR generic colors based on guesswork or priority)
-- Ensure 'Asakusa', 'Otemachi', etc are covered.
