-- Fix missing Tier 2 Hubs and synchronize with MapDisplayPolicy
-- Some major hubs were missed in the previous migration or had inconsistencies.

-- 1. Promote Missing Major Hubs to Tier 2 (Zoom 12+)
UPDATE nodes
SET display_tier = 2, is_hub = true
WHERE display_tier > 1 AND (
    id LIKE '%Otemachi%' OR
    id LIKE '%KitaSenju%' OR -- Fix Kita-Senju (was Tier 5)
    id LIKE '%Kita-senju%' OR -- Catch lowercase variations
    id LIKE '%Daimon%' OR
    id LIKE '%Oshiage%' OR
    id LIKE '%TokyoSkytree%' OR
    id LIKE '%Hibiya%' OR
    id LIKE '%Nihombashi%' OR
    id LIKE '%Kinshicho%' OR
    id LIKE '%Akabane%' OR
    id LIKE '%Oji%' OR
    id LIKE '%Oimachi%' OR
    id LIKE '%HigashiNihombashi%' OR
    id LIKE '%Bakuroyokoyama%' OR
    id LIKE '%Bakurocho%' OR
    id LIKE '%Kamata%' OR -- Note: KeikyuKamata is excluded by explicit demotion if matched, but here we target generic Kamata
    id LIKE '%AkasakaMitsuke%' OR
    id LIKE '%Nakameguro%' OR
    id LIKE '%Nakano%' OR    -- Promote Nakano (was Tier 3 in SQL)
    id LIKE '%MusashiKosugi%' OR
    id LIKE '%Jimbocho%' OR
    id LIKE '%Kudanshita%' OR
    id LIKE '%Sengakuji%' OR
    id LIKE '%Funabashi%' OR
    id LIKE '%Sugamo%' OR     -- Re-affirm
    id LIKE '%Komagome%' OR   -- Re-affirm
    id LIKE '%Suidobashi%'    -- Re-affirm
);

-- 2. Ensure Tier 3 Minor Hubs (Zoom 14+)
UPDATE nodes
SET display_tier = 3
WHERE display_tier > 2 AND (
    id LIKE '%Higashi-Ginza%' OR
    id LIKE '%Mitsukoshimae%' OR
    id LIKE '%Aoyama-itchome%' OR
    id LIKE '%Kagurazaka%' OR
    id LIKE '%Waseda%' OR
    id LIKE '%Tamachi%' OR
    -- Re-affirm existing T3
    id LIKE '%Kayabacho%' OR
    id LIKE '%Monzen-nakacho%' OR
    id LIKE '%Hongo-sanchome%' OR
    id LIKE '%Ningyocho%' OR
    id LIKE '%Meiji-jingumae%' OR
    id LIKE '%Korakuen%' OR
    id LIKE '%Kasuga%'
);

-- 3. Explicit Demotions (Safety Net)
-- Ensure 'East/West/South/North' variants of major hubs don't accidentally get promoted unless specified
UPDATE nodes
SET display_tier = 4, is_hub = false
WHERE
    (id LIKE '%Higashi-Shinjuku%' OR id LIKE '%Seibu-Shinjuku%' OR id LIKE '%Nishi-Shinjuku%' OR id LIKE '%Minami-Shinjuku%') OR
    (id LIKE '%Keikyu Kamata%' OR id LIKE '%Keikyu-Kamata%') OR -- Policy Exclusion
    (id LIKE '%Shin-Kiba%');
