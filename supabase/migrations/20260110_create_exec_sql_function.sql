-- Migration: Create exec_sql function for running raw SQL
-- Created: 2026-01-10
-- Purpose: Enable executing raw SQL statements via Supabase RPC

-- 建立 exec_sql 函式
CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS void AS $$
BEGIN
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 授與 public 角色的執行權限
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO postgres, anon, authenticated, service_role;
