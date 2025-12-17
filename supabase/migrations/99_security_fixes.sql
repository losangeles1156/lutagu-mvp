-- Migration to fix Supabase Security Advisor issues

-- 1. Fix "RLS Disabled in Public"
-- Enabling RLS is the first step. Note that without policies, no one (except service_role) can access these tables.
-- You may need to add policies later depending on your application logic.

ALTER TABLE IF EXISTS public.node_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.node_facility_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

-- Adding a default read policy for spatial_ref_sys since it is widely used by PostGIS internals
-- and blocking it often causes issues with geography queries.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'spatial_ref_sys' AND policyname = 'Allow public read access on spatial_ref_sys'
    ) THEN
        CREATE POLICY "Allow public read access on spatial_ref_sys"
        ON public.spatial_ref_sys
        FOR SELECT
        TO public
        USING (true);
    END IF;
END $$;


-- 2. Fix "Function Search Path Mutable"
-- This block dynamically finds the functions identified in the security report and sets their search_path to 'public, extensions, pg_temp'.
-- This prevents malicious users from executing code in a different schema by modifying the search_path.

DO $$
DECLARE
    func_record record;
    -- Array of function names identified in the security report
    target_functions text[] := ARRAY[
        'create_service_role_write_policy',
        'set_nodes_geohash',
        'set_node_location_bulk',
        'set_node_geom',
        'calculate_facility_stats',
        'set_updated_at',
        'set_nodes_geom_bulk',
        'create_public_read_policy'
    ];
BEGIN
    FOR func_record IN
        SELECT n.nspname as schema_name, p.proname as function_name, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
          AND p.proname = ANY(target_functions)
    LOOP
        -- Execute ALTER FUNCTION for each match found in the database
        EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public, extensions, pg_temp;',
            func_record.schema_name, func_record.function_name, func_record.args);
            
        RAISE NOTICE 'Updated search_path for function: %.%(%)', 
            func_record.schema_name, func_record.function_name, func_record.args;
    END LOOP;
END $$;
