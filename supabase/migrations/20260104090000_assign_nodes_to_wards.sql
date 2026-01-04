-- Migration: Assign all nodes to wards using JSONB location
-- Execute this in Supabase SQL Editor

-- 1. First, check the nodes table structure
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'nodes';

-- 2. Update nodes with ward_id based on ST_Contains using PostGIS
-- The nodes table stores location as JSONB: {"coordinates": [lon, lat]}

-- Create a function to convert JSONB location to geometry
CREATE OR REPLACE FUNCTION public.jsonb_to_geometry(loc JSONB)
RETURNS GEOMETRY AS $$
BEGIN
    RETURN ST_SetSRID(
        ST_MakePoint(
            (loc->>'coordinates'::jsonb)->>0::float,
            (loc->>'coordinates'::jsonb)->>1::float
        ),
        4326
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Assign ward_id to all nodes that don't have one
UPDATE public.nodes n
SET ward_id = w.id
FROM public.wards w
WHERE w.boundary IS NOT NULL
  AND n.ward_id IS NULL
  AND ST_Contains(w.boundary, public.jsonb_to_geometry(n.location));

-- 4. Update ward statistics
UPDATE public.wards w
SET node_count = (
    SELECT COUNT(*) FROM public.nodes n WHERE n.ward_id = w.id
);

-- 5. Verify
SELECT
    w.id,
    w.name_i18n->>'ja' as ward_name,
    w.node_count,
    (
        SELECT COUNT(*) FROM public.nodes n
        WHERE n.ward_id = w.id AND n.is_hub = true
    ) as hub_count
FROM public.wards w
ORDER BY w.id;

-- 6. Check overall coverage
SELECT
    COUNT(*) as total_nodes,
    COUNT(CASE WHEN ward_id IS NOT NULL THEN 1 END) as nodes_with_ward,
    ROUND(
        COUNT(CASE WHEN ward_id IS NOT NULL THEN 1 END)::numeric /
        NULLIF(COUNT(*), 0) * 100,
        1
    ) as coverage_percent
FROM public.nodes;
