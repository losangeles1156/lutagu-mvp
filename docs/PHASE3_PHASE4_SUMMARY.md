# Phase 3 & Phase 4 完成摘要

## Phase 3：後台管理 UI（在 Supabase Studio 審核 v_l1_pending）

### 完成的工作

#### 3.1 SQL 遷移檔案
- `supabase/migrations/20260104_node_admin_complete.sql` - 完整的 L1 審核 SQL 函數
- `supabase/migrations/20260104_node_admin_nodes.sql` - 節點管理 SQL 函數
- `supabase/migrations/20260104_node_admin_queries.sql` - Supabase Studio 直接查詢
- `supabase/migrations/20260104_node_admin_performance.sql` - 效能優化索引

#### 3.2 API 路由
- `src/app/api/admin/nodes/route.ts` - 節點 CRUD API
- `src/app/api/admin/nodes/merge/route.ts` - 合併節點到樞紐
- `src/app/api/admin/nodes/wards/[wardId]/route.ts` - 行政區節點查詢
- `src/app/api/admin/l1/places/pending/route.ts` - 待審核 L1 地點
- `src/app/api/admin/l1/places/pending/batch/route.ts` - 批次審核

#### 3.3 文檔
- `docs/NODE_ADMIN_PHASE3_README.md` - Phase 3 使用指南

---

## Phase 4：前端整合（修改 API 只返回已批准數據）

### 完成的工作

#### 4.1 is_active 狀態整合
- 更新 `src/components/map/HubNodeLayer.tsx` - 過濾非活躍節點
- 更新 `src/app/api/nodes/viewport/route.ts` - API 層過濾
- 新增 `supabase/migrations/20260104_add_is_active_to_rpc.sql` - SQL 層過濾

#### 4.2 Admin API Client
- `src/lib/api/admin-client.ts` - 類型化的管理操作 API 客戶端

#### 4.3 測試腳本
- `scripts/test-node-activation.ts` - 節點啟用/停用測試

---

## 數據流向

```
Supabase Studio (v_l1_pending)
    ↓
批次審核 API (approve/reject)
    ↓
nodes.is_active = true/false
    ↓
前端 API (nearby_nodes_v2)
    ↓
過濾 is_active = true
    ↓
HubNodeLayer.tsx
    ↓
地圖顯示
```

---

## 使用說明

### 在 Supabase Studio 審核 L1 地點

```sql
-- 查看待審核的 L1 地點
SELECT * FROM v_l1_pending LIMIT 50;

-- 批准地點
SELECT admin_approve_l1_place('odpt.Place:TokyoMetropolitan.Gov');

-- 拒絕地點
SELECT admin_reject_l1_place('odpt.Place:TokyoMetropolitan.Gov', '重複的數據');
```

### 批次審核

```sql
-- 一次批准多個地點
SELECT admin_batch_approve(
    ARRAY['odpt.Place:TokyoMetropolitan.Gov', 'odpt.Place:Tokyo.Chiyoda.Kanda'],
    ARRAY['odpt.Place:TokyoMetropolitan.Duplicate']
);
```

### 前端節點管理

```typescript
// 停用節點
import { updateNodes } from '@/lib/api/admin-client';

await updateNodes({
    node_ids: ['node-id-1', 'node-id-2'],
    updates: { is_active: false }
});

// 合併節點到樞紐
import { mergeNodes } from '@/lib/api/admin-client';

await mergeNodes({
    child_node_id: 'child-node-id',
    parent_hub_id: 'hub-node-id'
});
```

---

## SQL 函數清單

| 函數名稱 | 功能 |
|---------|------|
| `v_l1_pending` | 待審核的 L1 地點視圖 |
| `admin_approve_l1_place(id)` | 批准單個 L1 地點 |
| `admin_reject_l1_place(id, reason)` | 拒絕 L1 地點 |
| `admin_batch_approve(approvals, rejections)` | 批次審核 |
| `admin_merge_to_hub(child_id, hub_id)` | 合併節點到樞紐 |
| `admin_unmerge_from_hub(node_id)` | 從樞紐分離節點 |
| `admin_toggle_node_active(node_id, is_active)` | 切換節點啟用狀態 |
| `admin_get_ward_nodes(ward_id)` | 取得行政區所有節點 |
| `nearby_nodes_v2(...)` | 附近節點（已過濾 is_active） |
| `nearby_nodes(...)` | 附近節點（已過濾 is_active） |

---

## 待執行事項

1. ✅ 所有 Phase 3 和 Phase 4 代碼已完成
2. ⚠️ 需要執行 SQL 遷移：
   ```bash
   # 在 Supabase Studio 或使用 CLI 執行
   supabase db push
   ```
3. ⚠️ 測試節點啟用/停用功能：
   ```bash
   npx ts-node scripts/test-node-activation.ts
   ```

---

## 相關文件

- `plans/node_admin_design.md` - 原始設計文件
- `docs/NODE_ADMIN_PHASE3_README.md` - Phase 3 詳細指南
- `docs/PHASE4_FRONTEND_INTEGRATION.md` - Phase 4 整合計劃
