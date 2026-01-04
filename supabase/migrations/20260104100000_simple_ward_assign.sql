-- Simple Ward Assignment Migration
-- Execute in Supabase SQL Editor

-- Check current ward count first
SELECT 'Current wards:' as info, COUNT(*) as count FROM public.wards;

-- Check nodes with ward_id
SELECT 'Nodes with ward_id:' as info, COUNT(*) as count 
FROM public.nodes WHERE ward_id IS NOT NULL;

-- Simple assignment using ward center_point (distance-based)
-- This is simpler and works without complex geometry functions

-- For each ward, find nearest nodes
DO $$
DECLARE
    w RECORD;
    n RECORD;
    min_dist FLOAT;
    ward_center GEOMETRY;
BEGIN
    FOR w IN SELECT * FROM public.wards WHERE is_active = true LOOP
        -- Get center point of ward
        SELECT center_point INTO ward_center FROM public.wards WHERE id = w.id;
        
        IF ward_center IS NOT NULL THEN
            -- Update nodes within ~3km of ward center that don't have ward_id
            UPDATE public.nodes n
            SET ward_id = w.id
            WHERE n.ward_id IS NULL
              AND n.location IS NOT NULL
              AND (
                SELECT ST_Distance(
                  ST_SetSRID(ST_MakePoint(
                    (n.location->>'coordinates'::jsonb)->>0::float,
                    (n.location->>'coordinates'::jsonb)->>1::float
                  ), 4326)::geography,
                  ward_center::geography
                ) < 5000  -- Within 5km
              );
            
            RAISE NOTICE 'Assigned nodes to ward: %', w.id;
        END IF;
    END LOOP;
END $$;

-- Update ward statistics
UPDATE public.wards w
SET node_count = (
    SELECT COUNT(*) FROM public.nodes n WHERE n.ward_id = w.id
);

-- Final check
SELECT 
    w.id,
    w.name_i18n->>'ja' as ward_name,
    w.node_count
FROM public.wards w
ORDER BY w.node_count DESC
LIMIT 10;

-- Overall coverage
SELECT 
    COUNT(*) as total_nodes,
    COUNT(CASE WHEN ward_id IS NOT NULL THEN 1 END) as assigned,
    ROUND(
        COUNT(CASE WHEN ward_id IS NOT NULL THEN 1 END)::numeric /
        NULLIF(COUNT(*), 0) * 100, 1
    ) as coverage_pct
FROM public.nodes;
