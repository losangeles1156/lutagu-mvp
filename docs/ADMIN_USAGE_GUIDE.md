# 後台管理使用指南

## 第一步：執行 SQL 遷移

### 在 Supabase Studio SQL Editor 中執行

請打開 [Supabase Studio](https://supabase.com/dashboard) → SQL Editor，**重新複製並執行**以下檔案內容（已修復錯誤）：

**單一檔案（推薦）：**
- `supabase/migrations/COMBINED_ADMIN_MIGRATION.sql` - 包含所有功能的合併遷移檔

---

## 第二步：審核 L1 地點

### 在 Supabase Studio 中執行 SQL 查詢

```sql
-- 1. 查看待審核的 L1 地點
SELECT * FROM v_l1_pending LIMIT 50;

-- 2. 批准單個地點
SELECT approve_l1_place('odpt.Place:TokyoMetropolitan.Gov');

-- 3. 拒絕地點（提供原因）
SELECT reject_l1_place('odpt.Place:Duplicate.Location', '位置重複');

-- 4. 批次批准
SELECT batch_approve_places_optimized(
    ARRAY['odpt.Place:Tokyo.Aoyama', 'odpt.Place:Tokyo.Shibuya'],
    'Batch approved'
);
```

---

## 第三步：管理節點

### 查看所有節點
```sql
-- 查看所有 Hub 節點
SELECT * FROM get_all_hubs() LIMIT 50;
```

### 停用/啟用節點
```sql
-- 停用節點（從地圖上隱藏）
SELECT deactivate_nodes(ARRAY['node-id-here']);

-- 啟用節點
SELECT activate_nodes(ARRAY['node-id-here']);
```

### 合併節點到樞紐
```sql
-- 將子節點合併到樞紐
SELECT merge_nodes_to_hub('hub-node-id', ARRAY['child-node-id']);

-- 從樞紐分離節點
SELECT unmerge_nodes(ARRAY['node-id-to-separate']);
```

### 查看行政區
```sql
-- 查看所有行政區
SELECT * FROM v_core_wards;
```

---

## 可用的 SQL 函數清單

### L1 審核相關
| 函數 | 功能 |
|------|------|
| `approve_l1_place(source_id, notes)` | 批准單個 L1 地點 |
| `reject_l1_place(source_id, notes)` | 拒絕 L1 地點 |
| `batch_approve_places_optimized(ids, notes)` | 批次批准 |

### 節點管理相關
| 函數 | 功能 |
|------|------|
| `get_all_hubs()` | 取得所有 Hub 節點 |
| `merge_nodes_to_hub(hub_id, array)` | 合併節點到 Hub |
| `unmerge_nodes(array)` | 從 Hub 分離節點 |
| `deactivate_nodes(array)` | 停用節點 |
| `activate_nodes(array)` | 啟用節點 |

### 視圖
| 視圖 | 功能 |
|------|------|
| `v_l1_pending` | 待審核 L1 地點 |
| `v_l1_quick_stats` | 快速統計 |
| `v_core_wards` | 所有行政區 |

---

## 常見問題

### Q: 執行後如何驗證？
```sql
SELECT * FROM get_all_hubs() LIMIT 5;
SELECT * FROM v_core_wards;
```

### Q: 為什麼地圖上不顯示節點？
A: 檢查節點是否已啟用：
```sql
SELECT id, name FROM get_all_hubs() WHERE is_active = false;
```

---

## 相關檔案
- 合併遷移檔：`supabase/migrations/COMBINED_ADMIN_MIGRATION.sql`
- 完整指南：`docs/PHASE3_PHASE4_SUMMARY.md`
