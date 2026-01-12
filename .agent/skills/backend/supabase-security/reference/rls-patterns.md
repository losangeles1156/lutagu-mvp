# Supabase Security & RLS Patterns

本文件彙整專案標準的資料庫安全性實作模式。

## 1. Row Level Security (RLS) 標準寫法

所有 Table **必須** 啟用 RLS：
```sql
ALTER TABLE public.table_name ENABLE ROW LEVEL SECURITY;
```

### 1.1 公開讀取 (Public Read)
適用於 `nodes`, `l1_places`, `cities` 等公開資料。

```sql
DROP POLICY IF EXISTS "Allow public read access" ON public.table_name;
CREATE POLICY "Allow public read access" ON public.table_name
  FOR SELECT
  USING (true);
```

### 1.2 用戶自有資料 (User Owned)
適用於 `trip_subscriptions`, `nudge_logs` 等用戶私有資料。

```sql
DROP POLICY IF EXISTS "Users can manage own data" ON public.table_name;
CREATE POLICY "Users can manage own data" ON public.table_name
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### 1.3 Service Role 全權限 (System)
**必須** 為每個 Table 加入此 Policy，以確保後端 API/Edge Functions 可寫入資料。

```sql
DROP POLICY IF EXISTS "Service role full access" ON public.table_name;
CREATE POLICY "Service role full access" ON public.table_name
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
```

---

## 2. RBAC (Role-Based Access Control)

專案使用 `public.member_profiles` 儲存角色，而非僅依賴 `auth.users` 的 metadata。

- **Roles**: `member` (預設), `support`, `admin`.
- **Admin Access Pattern**:
  通常不直接在 Policy 做 Join (效能考量)，而是建議由 Application Layer 驗證 Admin 身份後，使用 Service Role 執行操作，或針對特定低頻操作使用 `EXISTS` 子查詢。

---

## 3. Function Security

所有 `SECURITY DEFINER` 函數必須明確設定 `search_path` 以防止 Search Path Hijacking。

```sql
CREATE OR REPLACE FUNCTION public.secure_function()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  -- Function logic
END;
$$;
```

---

## 4. Audit Logging (Security Events)

對於敏感資料表（如 `member_profiles`, `fares`），應掛載 `log_security_event` Trigger。

```sql
DO $$
BEGIN
  IF not exists (select 1 from pg_trigger where tgname = 'tr_audit_table_name') THEN
    CREATE TRIGGER tr_audit_table_name
    AFTER INSERT OR UPDATE OR DELETE ON public.table_name
    FOR EACH ROW
    EXECUTE FUNCTION public.log_security_event();
  END IF;
END $$;
```
