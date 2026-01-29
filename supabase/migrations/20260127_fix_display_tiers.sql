-- 1. Reset all nodes to Tier 5 (Default)
UPDATE nodes SET display_tier = 5;

-- 2. Tier 1: SUPER HUBS
-- Major transport nodes that should always be visible (Zoom 8+)
UPDATE nodes
SET display_tier = 1, is_hub = true
WHERE
   -- Match EXACT suffixes or specific known patterns to avoid over-matching
   (id LIKE '%.Tokyo' OR id LIKE '%:Tokyo') OR
   (id LIKE '%.Shinjuku' OR id LIKE '%:Shinjuku') OR
   (id LIKE '%.Shibuya' OR id LIKE '%:Shibuya') OR
   (id LIKE '%.Ikebukuro' OR id LIKE '%:Ikebukuro') OR
   (id LIKE '%.Ueno' OR id LIKE '%:Ueno') OR
   (id LIKE '%.Shinagawa' OR id LIKE '%:Shinagawa') OR
   (id LIKE '%.Yokohama' OR id LIKE '%:Yokohama') OR
   (id LIKE '%.Omiya' OR id LIKE '%:Omiya') OR
   (id LIKE '%.Nagoya' OR id LIKE '%:Nagoya') OR
   (id LIKE '%.Kyoto' OR id LIKE '%:Kyoto') OR
   (id LIKE '%.Osaka' OR id LIKE '%:Osaka') OR
   (id LIKE '%.Shin-Osaka' OR id LIKE '%:Shin-Osaka') OR
   (id LIKE '%.Namba' OR id LIKE '%:Namba') OR
   (id LIKE '%.Tennoji' OR id LIKE '%:Tennoji') OR
   (id LIKE '%.Hakata' OR id LIKE '%:Hakata') OR
   (id LIKE '%.Sapporo' OR id LIKE '%:Sapporo');

-- 3. Tier 1: AIRPORTS (Ensure all terminals are Tier 1)
-- Matches Narita, Haneda, Kansai, etc. by name or ID
UPDATE nodes
SET display_tier = 1, is_hub = true
WHERE (name->>'en' ILIKE '%Airport%') OR (id ILIKE '%Airport%');


-- 4. Tier 2: MAJOR HUBS
-- Visible at Zoom 10+
UPDATE nodes
SET display_tier = 2, is_hub = true
WHERE display_tier > 1 AND ( -- Only update if not already Tier 1
   id LIKE '%Akihabara%' OR
   id LIKE '%Asakusa%' OR
   id LIKE '%Roppongi%' OR
   (id LIKE '%:Ginza' OR id LIKE '%.Ginza') OR -- Exact match to avoid Higashi-Ginza
   id LIKE '%Omotesando%' OR
   id LIKE '%Harajuku%' OR
   -- REMOVED Ebisu (Demoted to T3)
   id LIKE '%Meguro%' OR
   id LIKE '%Gotanda%' OR
   -- REMOVED Osaki (Demoted to T3)
   id LIKE '%Hamamatsucho%' OR
   id LIKE '%Shimbashi%' OR
   -- REMOVED Yurakucho (Demoted to T3)
   id LIKE '%Kanda%' OR
   id LIKE '%Okachimachi%' OR
   id LIKE '%Nippori%' OR
   id LIKE '%Nishi-Nippori%' OR
   -- REMOVED: Tabata, Komagome, Sugamo, Otsuka, Mejiro (Demoted to T3 or T5)
   id LIKE '%Takadanobaba%' OR
   -- REMOVED Yoyogi, Sendagaya (Demoted to T3)
   id LIKE '%Shinanomachi%' OR
   id LIKE '%Yotsuya%' OR
   id LIKE '%Ichigaya%' OR
   id LIKE '%Iidabashi%' OR
   -- REMOVED Suidobashi (Demoted to T3)
   id LIKE '%Ochanomizu%'
);

-- 5. Tier 3: MINOR HUBS
-- Visible at Zoom 12+
UPDATE nodes
SET display_tier = 3
WHERE display_tier > 2 AND (
   id LIKE '%Nakano%' OR
   id LIKE '%Koenji%' OR
   id LIKE '%Asagaya%' OR
   id LIKE '%Ogikubo%' OR
   id LIKE '%Nishi-Ogikubo%' OR
   id LIKE '%Kichijoji%' OR
   id LIKE '%Kayabacho%' OR
   id LIKE '%MonzenNakacho%' OR
   id LIKE '%HongoSanchome%' OR
   id LIKE '%Ningyocho%' OR
   id LIKE '%Yurakucho%' OR
   id LIKE '%Omotesando%' OR
   id LIKE '%AoyamaItchome%' OR
   id LIKE '%MeijiJingumae%' OR
   id LIKE '%Korakuen%' OR
   id LIKE '%Kasuga%' OR
   id LIKE '%Komagome%' OR
   id LIKE '%Sugamo%' OR
   id LIKE '%Suidobashi%'
);

-- 6. EXPLICIT EXCLUSIONS / DEMOTIONS
-- Fix over-matching from Tier 1/2 logic (e.g. Higashi-Shinjuku shouldn't be Tier 1)
UPDATE nodes
SET display_tier = 4, is_hub = false
WHERE
   id LIKE '%Higashi-Shinjuku%' OR
   id LIKE '%Seibu-Shinjuku%' OR
   id LIKE '%Nishi-Shinjuku%' OR
   id LIKE '%Shin-Kiba%' OR
   id LIKE '%Minami-Shinjuku%' OR
   id LIKE '%Shinjuku-sanchome%' OR
   id LIKE '%Shinjuku-gyoenmae%';

-- Note: Kita-Senju is kept as Tier 2 (major transfer hub)
