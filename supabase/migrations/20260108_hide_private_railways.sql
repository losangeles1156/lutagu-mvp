-- 1. Hide specific private railway operators completely (by Node ID)
-- User requested: Seibu, Odakyu, Yurikamome, Keio
UPDATE nodes
SET is_active = false
WHERE id LIKE 'odpt.Station:Seibu.%'
   OR id LIKE 'odpt.Station:Odakyu.%'
   OR id LIKE 'odpt.Station:Yurikamome.%'
   OR id LIKE 'odpt.Station:Keio.%';

-- 2. Handle Specific Shared/Duplicate Stations

-- Nippori: Hide Toei node (Nippori-Toneri Liner start), allow JR/Keisei if present
-- Also hiding ALL Nippori-Toneri liner stations as requested ("subsequent stations not shown, please hide")
UPDATE nodes
SET is_active = false
WHERE id LIKE 'odpt.Station:Toei.Nippori%' -- Matches Toei.Nippori
   OR EXISTS (
       SELECT 1
       FROM jsonb_array_elements_text(transit_lines) line
       WHERE line = 'odpt.Railway:Toei.NipporiToneri'
   );

-- Naka-Meguro: Show Tokyu only, Hide Tokyo Metro
UPDATE nodes
SET is_active = false
WHERE id = 'odpt.Station:TokyoMetro.NakaMeguro';

-- Sengakuji: Show Toei only, Hide Keikyu
UPDATE nodes
SET is_active = false
WHERE id = 'odpt.Station:Keikyu.Sengakuji';

-- Meiji-Jingumae: Hide duplicate/variant node 'MeijiJingumaeHarajuku', keep 'MeijiJingumae'
UPDATE nodes
SET is_active = false
WHERE id = 'odpt.Station:TokyoMetro.MeijiJingumaeHarajuku';
