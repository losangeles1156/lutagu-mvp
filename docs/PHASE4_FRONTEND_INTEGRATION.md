# Phase 4 前端整合計劃

## 現有架構分析

### 已有功能 ✅

| 功能 | 實現位置 | 狀態 |
|-----|---------|------|
| GPS 定位最近節點 | `useZoneAwareness.ts` + `MapContainer.tsx` | ✅ |
| 距離 > 50km 自動上野站 | `useZoneAwareness.ts` (UENO_CENTER) | ✅ |
| 行政區切換 UI | `WardSelector.tsx` | ✅ |
| 節點顯示 | `NodeMarker.tsx` + `HubNodeLayer` | ✅ |

### 需改進功能 🔧

| 功能 | 實現方式 |
|-----|---------|
| 行政區列表從 API 獲取 | `wardStore.ts` |
| 整合 `is_active` 狀態 | 修改 API + NodeMarker |
| 核心 9 區動態列表 | `wardStore.ts` + 後台 API |

---

## 整合架構

```
前端顯示邏輯
├── GPS 定位
│   └── useZoneAwareness.ts (已存在)
│
├── 距離 > 50km → 上野站
│   └── UENO_CENTER = { lat: 35.7138, lon: 139.7773 }
│
├── 行政區顯示
│   ├── WardSelector.tsx (UI)
│   ├── wardStore.ts (數據)
│   └── /api/wards/[id] (後端 API)
│
└── 後台控制
    └── node_hierarchy.is_active
        └── API: /api/admin/nodes
        └── 過濾: 只顯示 is_active = TRUE
```

---

## 已實現的改進

### 1. wardStore.ts

```typescript
// 從 API 獲取行政區列表，失敗時使用 Fallback
fetchWards: async () => {
    try {
        const response = await fetch('/api/admin/nodes/wards?core=true');
        if (response.ok) {
            wards = data.wards || [];
        }
    } catch (e) {
        wards = CORE_WARDS; // Fallback
    }
}
```

### 2. 後台 API

| API | 功能 |
|-----|------|
| `GET /api/admin/nodes` | 節點列表（含 is_active） |
| `GET /api/admin/nodes/wards/[id]` | 行政區節點 |
| `PATCH /api/admin/nodes` | 批量更新節點 |
| `POST /api/admin/nodes/merge` | 合併/移除父子節點 |

### 3. SQL 函數

```sql
-- 獲取核心 9 區
SELECT * FROM v_core_wards;

-- 獲取節點統計
SELECT * FROM get_ward_node_stats('Taito');

-- 節點啟用/停用
SELECT activate_nodes(ARRAY['id1', 'id2']);
SELECT deactivate_nodes(ARRAY['id1', 'id2']);
```

---

## 下一步行動

### 短期 (1-2 天)

1. ✅ wardStore.ts 已更新
2. 🔄 測試後台 API
3. 🔄 整合 `is_active` 過濾

### 中期 (1 週)

1. 前端行政區切換優化
2. 節點顯示邏輯調整
3. 性能優化

---

## 測試清單

- [ ] 後台 API 返回正確數據
- [ ] 行政區列表從 API 載入
- [ ] 節點合併功能正常
- [ ] 節點啟用/停用功能正常
- [ ] `is_active` 狀態正確影響顯示
