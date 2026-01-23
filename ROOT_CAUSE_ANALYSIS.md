# 樞紐站標籤不顯示 - 根本原因分析報告

**問題**：使用者在地圖上看不到東京重要交通樞紐的節點名稱（上野、東京、新宿等）

**日期**：2026-01-23
**嚴重度**：🔴 **Critical**

---

## 🔍 問題症狀

從使用者截圖觀察到：

1. **第一張圖（高 Zoom）**：
   - 只看到「京成上野」標籤
   - 看不到「上野」（JR 上野站 / Metro 上野站）樞紐
   - 藍色圓點沒有標籤

2. **第二張圖（中 Zoom）**：
   - 看到大量藍色 M 標記（樞紐站）
   - **所有樞紐站都沒有站名標籤**
   - 只有數字標記（+2, +3等）或運營商代碼（M, J, T）

---

## 🕵️ 問題追蹤路徑

### 追蹤 1：標籤顯示邏輯

**檔案**：`src/components/map/NodeMarker.tsx:138-147`

```typescript
const showLabel = useMemo(() => {
    return isSelected ||
        hasMembers ||                     // ← 關鍵條件
        isExplicitHub ||                  // ← 關鍵條件
        (isMajor && zoom >= 13) ||
        (zoom >= 15);
}, [isSelected, hasMembers, isExplicitHub, isMajor, zoom]);
```

**條件分析**：
- `hasMembers = hubDetails && hubDetails.member_count > 0`
- `isExplicitHub = node.is_hub === true || node.parent_hub_id === null`

**結論**：邏輯正確 ✅

---

### 追蹤 2：hubDetails 資料流

```
API (route.ts)
  ↓ 返回 hub_details
useNodeFetcher
  ↓ 轉換為 hubDetails
NodeDisplayProvider (Context)
  ↓ 儲存 state.hubDetails
HubNodeLayer
  ↓ 傳遞 hubDetails[node.id]
NodeMarker
  ↓ 計算 hasMembers
showLabel
```

**關鍵點**：
1. API 返回 `hub_details`（底線）✅
2. useNodeFetcher 轉換為 `hubDetails`（駝峰）✅
3. Provider 儲存正確 ✅
4. HubNodeLayer 傳遞 `hubDetails[node.id]` ✅

---

### 追蹤 3：API hub_details 生成邏輯

**檔案**：`src/app/api/nodes/viewport/route.ts:568-596`

```typescript
const hubDetails: Record<string, HubDetails> = {};

if (supabaseClient && limitedNodes.length > 0) {
    const hubIds = limitedNodes.filter(n => n.is_hub).map(n => n.id);
    //                                      ^^^^^^^^^ 關鍵過濾條件

    if (hubIds.length > 0) {
        // 為這些 hubIds 生成 hubDetails
        for (const hubId of hubIds) {
            hubDetails[hubId] = {
                member_count: memberCount,
                ...
            };
        }
    }
}
```

**🚨 發現關鍵問題**：

API **僅為 `is_hub === true` 的節點生成 hubDetails**！

如果資料庫中的節點 `is_hub` 欄位不正確，就不會有 hubDetails！

---

## 🎯 根本原因推測

### 可能原因 1：資料庫 `is_hub` 欄位未正確設定 ⚠️ **最可能**

**問題**：
- 資料庫中的上野站、東京站等樞紐站的 `is_hub` 欄位可能是 `false` 或 `null`
- 導致 API 不會為它們生成 hubDetails
- 導致前端 `hasMembers = false`
- 導致標籤不顯示

**驗證方法**：
```sql
SELECT id, name->>'zh-TW', is_hub, parent_hub_id
FROM nodes
WHERE name->>'zh-TW' LIKE '%上野%'
  AND node_type = 'station';
```

**預期結果**：上野站的 `is_hub` 應該是 `true`

**如果 `is_hub = false`**：這就是根本原因！

---

### 可能原因 2：API 過濾邏輯過於嚴格

**問題**：
- API 的 `hubsOnly` 邏輯（zoom < 14）可能過濾掉了某些樞紐站
- 但從截圖看到有大量藍色 M 標記，表示節點有被渲染
- 所以這不是主要原因

---

### 可能原因 3：前端 `isExplicitHub` 備用檢查失效

**程式碼**：
```typescript
const isExplicitHub = node.is_hub === true || node.parent_hub_id === null;
```

**問題**：
- 如果 `is_hub = false` 且 `parent_hub_id = null`，`isExplicitHub` 仍會是 `true`
- **但這只是前端判斷**，不影響 API 是否生成 hubDetails
- 所以 `hasMembers` 仍然是 `false`（因為沒有 hubDetails）

**結論**：備用機制無法解決 API 不生成 hubDetails 的問題

---

## 📊 問題鏈分析

```
❌ 資料庫 is_hub = false/null
  ↓
❌ API 不為該節點生成 hubDetails (571行過濾掉)
  ↓
❌ 前端 hasMembers = false (hubDetails 不存在)
  ↓
⚠️  前端 isExplicitHub = true (備用機制，如果 parent_hub_id = null)
  ↓
⚠️  showLabel 可能為 true（取決於 isExplicitHub）
  ↓
🤔 但使用者看不到標籤？
```

**等等！如果 `isExplicitHub = true`，`showLabel` 應該也是 `true` 才對！**

這意味著還有其他問題...

---

## 🔍 進一步調查方向

### 懷疑 4：Icon Cache 問題（已修正但可能未清除）

**問題**：
- 雖然我們已經修正了 cache key 加入 zoom
- 但舊的 cache 可能仍在記憶體中
- 使用者可能需要**完全重新載入頁面**（關閉分頁重開）

**驗證**：
- 使用者是否執行了**硬重新整理**（Cmd+Shift+R）？
- 或者只是一般重新整理（Cmd+R）？

---

### 懷疑 5：節點資料結構問題

**問題**：
- 可能有多個「上野」節點：
  - JR 上野（odpt.Station:JR-East.Yamanote.Ueno）
  - Metro 上野（odpt.Station:TokyoMetro.Ginza.Ueno）
  - 京成上野（odpt.Station:Keisei.KeiseiMain.Keisei-Ueno）
- 前兩個應該是 Hub，但可能 `is_hub` 設定錯誤
- 第三個（京成上野）是獨立站，有顯示標籤

---

## ✅ 診斷步驟

### 步驟 1：檢查資料庫（最優先）

在 Supabase SQL Editor 執行：

```sql
-- 檢查上野站
SELECT
  id,
  name->>'zh-TW' as name_zh,
  name->>'ja' as name_ja,
  is_hub,
  parent_hub_id,
  is_active
FROM nodes
WHERE (name->>'zh-TW' LIKE '%上野%' OR name->>'ja' LIKE '%上野%')
  AND node_type = 'station'
  AND is_active = true
ORDER BY is_hub DESC NULLS LAST;
```

**預期看到**：
- JR 上野：`is_hub = true`, `parent_hub_id = null`
- Metro 上野：`is_hub = true`, `parent_hub_id = null`
- 京成上野：`is_hub = false` 或 `parent_hub_id` 指向某個 Hub

**如果 `is_hub = false`**：這就是根本原因！

---

### 步驟 2：檢查 API 回應（次要）

在瀏覽器 Console 貼上 `debug-api-response.js` 的內容，然後重新整理頁面，查看：

1. API 是否返回了上野站節點？
2. 上野站的 `is_hub` 欄位是什麼？
3. `hub_details` 中是否包含上野站？
4. `hub_details[上野ID].member_count` 是多少？

---

### 步驟 3：檢查前端 Props（最後）

使用 React DevTools：
1. 找到 NodeMarker 元件（上野站）
2. 檢查 props：
   - `hubDetails` 是否存在？
   - `node.is_hub` 是什麼？
   - `node.parent_hub_id` 是什麼？
3. 檢查計算值：
   - `hasMembers` 應該是什麼？
   - `isExplicitHub` 應該是什麼？
   - `showLabel` 最終是什麼？

---

## 🎯 預測的根本原因

**最可能的原因（90%）**：

**資料庫 `is_hub` 欄位未正確設定**

- 上野、東京、新宿等重要樞紐站的 `is_hub` 可能是 `false` 或 `null`
- 導致 API 不生成 hubDetails
- 導致前端 `hasMembers = false`
- 即使 `isExplicitHub = true`（如果 parent_hub_id = null），標籤可能因為其他原因不顯示

---

## 🔧 建議修正方案

### 方案 A：修正資料庫（最根本）

如果 `is_hub` 確實不正確：

```sql
-- 將主要樞紐站設為 is_hub = true
UPDATE nodes
SET is_hub = true
WHERE id IN (
  'odpt.Station:JR-East.Yamanote.Ueno',
  'odpt.Station:TokyoMetro.Ginza.Ueno',
  'odpt.Station:TokyoMetro.Hibiya.Ueno',
  'odpt.Station:JR-East.Yamanote.Tokyo',
  'odpt.Station:JR-East.Yamanote.Shinjuku',
  'odpt.Station:JR-East.Yamanote.Shibuya',
  'odpt.Station:JR-East.Yamanote.Ikebukuro'
  -- 加入所有主要樞紐
)
AND node_type = 'station';
```

---

### 方案 B：API 邏輯調整（備用）

如果無法修正資料庫，可調整 API 邏輯：

```typescript
// src/app/api/nodes/viewport/route.ts:571
// Before
const hubIds = limitedNodes.filter(n => n.is_hub).map(n => n.id);

// After
const hubIds = limitedNodes.filter(n =>
  n.is_hub || n.parent_hub_id === null  // 加入備用條件
).map(n => n.id);
```

**缺點**：可能為非樞紐站生成 hubDetails，浪費資源

---

### 方案 C：前端 Fallback（臨時）

如果前兩個方案都無法立即執行：

```typescript
// src/components/map/NodeMarker.tsx
// 為沒有 hubDetails 的 explicit hub 建立假的 hubDetails
const effectiveHubDetails = hubDetails || (isExplicitHub ? {
  member_count: 1,  // 假設至少有 1 條線
  transfer_type: 'indoor',
  transfer_complexity: 'simple',
  walking_distance_meters: null,
  indoor_connection_notes: null,
  members: []
} : undefined);

const hasMembers = effectiveHubDetails && effectiveHubDetails.member_count > 0;
```

**缺點**：資料不準確，只是權宜之計

---

## 📝 下一步行動

1. **✅ 立即執行 SQL 查詢**（步驟 1）
   - 確認 `is_hub` 欄位狀態
   - 確定根本原因

2. **⏳ 等待查詢結果後決定**：
   - 如果 `is_hub = false` → 執行方案 A（修正資料庫）
   - 如果 `is_hub = true` → 繼續調查其他原因

3. **🔧 實施修正方案**

4. **✅ 重新測試驗證**

---

**分析完成時間**：2026-01-23 18:00
**待驗證**：資料庫 `is_hub` 欄位狀態
**建議行動**：立即執行 SQL 查詢（check-hub-data.sql）
