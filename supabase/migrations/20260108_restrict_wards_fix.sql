-- 1. Reset ward_id to ensure clean slate
UPDATE nodes SET ward_id = NULL;

-- 2. Populate ward_id based on spatial containment, EXCLUDING ward:airport
-- The airport boundary is too loose/large, overlapping with city wards.
UPDATE nodes
SET ward_id = wards.id
FROM wards
WHERE wards.id != 'ward:airport'
  AND ST_Contains(wards.boundary, nodes.coordinates);

-- 3. Force Narita Airport nodes to 'ward:airport' strictly by name
UPDATE nodes
SET ward_id = 'ward:airport'
WHERE (name->>'en' ILIKE '%Narita Airport%' OR name->>'ja' ILIKE '%成田空港%');

-- 4. Update is_active visibility
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
