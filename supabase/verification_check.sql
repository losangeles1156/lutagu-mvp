SELECT 
    p.proname as function_name,
    n.nspname as schema_name,
    pg_get_userbyid(p.proowner) as owner_name,
    CASE 
        WHEN p.proconfig IS NULL THEN '❌ Missing search_path'
        WHEN 'search_path=public, extensions, pg_temp' = ANY(p.proconfig) THEN '✅ Secured'
        ELSE '⚠️ Check config: ' || array_to_string(p.proconfig, ', ')
    END as status
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
AND p.prosecdef = true
AND (p.proconfig IS NULL OR NOT ('search_path=public, extensions, pg_temp' = ANY(p.proconfig)))
AND pg_get_userbyid(p.proowner) <> 'supabase_admin'
AND p.proname NOT LIKE 'st_%';
SELECT 
    c.relname as view_name,
    n.nspname as schema_name,
    pg_get_userbyid(c.relowner) as owner_name,
    CASE 
        WHEN c.reloptions IS NULL THEN '❌ Missing security_invoker'
        WHEN 'security_invoker=true' = ANY(c.reloptions) THEN '✅ Secured'
        ELSE '⚠️ Check options: ' || array_to_string(c.reloptions, ', ')
    END as status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
AND c.relkind = 'v'
AND (c.reloptions IS NULL OR NOT ('security_invoker=true' = ANY(c.reloptions)))
AND c.relname NOT IN ('geometry_columns', 'geography_columns');
SELECT 
    tablename as table_without_rls,
    '❌ Critical Risk' as risk_level
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = false
AND tablename NOT IN ('spatial_ref_sys', 'geometry_columns', 'geography_columns');
