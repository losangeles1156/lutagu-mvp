-- 1. Populate ward_id based on spatial containment
UPDATE nodes
SET ward_id = wards.id
FROM wards
WHERE ST_Contains(wards.boundary, nodes.coordinates);

-- 2. Force Narita Airport nodes to 'ward:airport' just in case of boundary mismatches
-- Only if they haven't been assigned or forcing consistent ID for airport logic
UPDATE nodes
SET ward_id = 'ward:airport'
WHERE (name->>'en' ILIKE '%Narita Airport%' OR name->>'ja' ILIKE '%成田空港%')
  AND ward_id IS DISTINCT FROM 'ward:airport';

-- 3. Update is_active visibility
-- Allowed: Chiyoda, Minato, Chuo, Taito, Bunkyo, Toshima, Shinjuku, Shibuya, Ota, Meguro, Shinagawa, Airport
UPDATE nodes
SET is_active = CASE
    WHEN ward_id IN (
        'ward:chiyoda',
        'ward:minato',
        'ward:chuo',
        'ward:taito',
        'ward:bunkyo',
        'ward:toshima',
        'ward:shinjuku',
        'ward:shibuya',
        'ward:ota',
        'ward:meguro',
        'ward:shinagawa',
        'ward:airport'
    ) THEN true
    ELSE false
END;
