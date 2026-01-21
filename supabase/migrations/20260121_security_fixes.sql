DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT p.oid::regprocedure::text as func_signature
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        JOIN pg_roles r ON r.oid = p.proowner
        WHERE n.nspname = 'public'
        AND p.prosecdef = true
        AND r.rolname = current_user
    LOOP
        RAISE NOTICE 'Securing function: %', func_record.func_signature;
        EXECUTE format('ALTER FUNCTION %s SET search_path = public, extensions, pg_temp', func_record.func_signature);
    END LOOP;
END $$;
DO $$
DECLARE
    v_name text;
BEGIN
    FOR v_name IN 
        SELECT c.relname
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_roles r ON r.oid = c.relowner
        WHERE n.nspname = 'public'
        AND c.relkind = 'v'
        AND r.rolname = current_user
    LOOP
        RAISE NOTICE 'Securing view: %', v_name;
        EXECUTE format('ALTER VIEW public.%I SET (security_invoker = true)', v_name);
    END LOOP;
END $$;
DO $$
DECLARE
    tbl_name text;
BEGIN
    FOR tbl_name IN 
        SELECT c.relname
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_roles r ON r.oid = c.relowner
        WHERE n.nspname = 'public'
        AND c.relkind = 'r'
        AND c.relrowsecurity = false
        AND r.rolname = current_user
        AND c.relname NOT IN ('spatial_ref_sys', 'geometry_columns', 'geography_columns')
    LOOP
        RAISE NOTICE 'Enabling RLS on table: %', tbl_name;
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl_name);
    END LOOP;
END $$;
