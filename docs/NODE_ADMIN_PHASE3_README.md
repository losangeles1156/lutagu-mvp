# Node Admin Phase 3 - 後台管理使用指南

## 安裝方式

**L1 數據審核 + 節點管理** - 只需執行一個文件：

```bash
supabase db push supabase/migrations/20260104_node_admin_complete.sql
supabase db push supabase/migrations/20260104_node_admin_nodes.sql
```

---

## 第一部分：L1 數據審核

### 快速查詢

```sql
-- 查看統計
SELECT COUNT(*) FROM node_l1_config;
SELECT COUNT(*) FROM v_l1_pending;

-- 查看待審核
SELECT * FROM v_l1_pending 
WHERE node_id = 'odpt.Station:JR-East.Ueno'
LIMIT 50;

-- 批准上野站餐廳（取消注釋執行）
/*
UPDATE node_l1_config c
SET is_approved = TRUE, approved_at = NOW()
FROM l1_places p
WHERE c.source_table = 'l1_places'
AND c.source_id = p.id::TEXT
AND p.station_id = 'odpt.Station:JR-East.Ueno'
AND p.category = 'dining';
*/
```

---

## 第二部分：節點管理

### SQL 函數

| 函數 | 用途 | 範例 |
|-----|------|------|
| `get_all_hubs()` | 獲取所有 Hub | `SELECT * FROM get_all_hubs();` |
| `get_hub_children(id)` | 獲取 Hub 子節點 | `SELECT * FROM get_hub_children('Ueno');` |
| `merge_nodes_to_hub(hub, array)` | 合併到 Hub | `SELECT merge_nodes_to_hub('HubID', ARRAY['id1','id2']);` |
| `unmerge_nodes(array)` | 從 Hub 移除 | `SELECT unmerge_nodes(ARRAY['id1','id2']);` |
| `deactivate_nodes(array)` | 停用節點 | `SELECT deactivate_nodes(ARRAY['id1']);` |
| `activate_nodes(array)` | 啟用節點 | `SELECT activate_nodes(ARRAY['id1']);` |
| `get_ward_node_stats(id)` | 行政區統計 | `SELECT * FROM get_ward_node_stats('Taito');` |

### 視圖

| 視圖 | 用途 |
|-----|------|
| `v_core_wards` | 核心 9 區列表 |
| `v_node_tree` | 節點樹狀結構 |
| `v_l1_pending` | 待審核 L1 數據 |
| `v_l1_approved` | 已批准 L1 數據 |

---

## 第三部分：API 使用

### 節點管理 API

```typescript
import { nodesApi } from '@/lib/api/nodes-admin';

// 獲取節點列表
const nodes = await nodesApi.list({
    ward_id: 'Taitō',
    is_hub: true,
});

// 合併到 Hub
await nodesApi.mergeToHub('hub-id', ['child-1', 'child-2']);

// 從 Hub 移除
await nodesApi.unmerge(['child-1']);

// 停用節點
await nodesApi.deactivate(['node-id']);

// 啟用節點
await nodesApi.activate(['node-id']);
```

### 行政區 API

```typescript
import { wardsApi } from '@/lib/api/nodes-admin';

// 獲取行政區節點
const wardData = await wardsApi.getNodes('Taitō');

// 獲取核心 9 區
const coreWards = await wardsApi.getCoreWards();
```

---

## 架構設計

### 前端顯示邏輯

```
GPS 定位最近節點
    ↓
距離 > 50km from 23區中心 → 上野站
    ↓
顯示周邊節點 = 同一行政區
    ↓
手動切換行政區（核心 9 區）
```

### 後台控制功能

| 功能 | 實現方式 |
|-----|---------|
| 新增/移除節點 | `nodesApi.update({ node_ids, updates })` |
| 節點合併到 Hub | `nodesApi.mergeToHub(hubId, childIds)` |
| 父子節點編輯 | `node_hierarchy` 表 |
| 人工確認顯示 | `node_hierarchy.is_active` |

---

## 數據表結構

```
nodes
├── id (TEXT)
├── name (JSONB)
├── location (Geography)
├── parent_hub_id (TEXT)  -- NULL = Hub
├── ward_id (TEXT)
└── is_active (BOOLEAN)

node_hierarchy
├── node_id (TEXT, PK)
├── hub_id (TEXT)         -- 父節點 ID
├── is_active (BOOLEAN)   -- 是否顯示在前端
└── display_order (INT)
```

---

## 注意事項

1. **節點合併**：子節點會設定 `parent_hub_id` 指向 Hub
2. **節點停用**：`is_active = FALSE` 的節點不會顯示在前端
3. **核心 9 區**：台東區、千代田區、中央區、港區、新宿區、文京區、江東區、墨田區等
