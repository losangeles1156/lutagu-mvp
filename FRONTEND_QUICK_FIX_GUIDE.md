# 🚀 LUTAGU 前端問題快速修復指南

**建立日期**: 2026-01-22
**狀態**: 診斷完成,待執行修復

---

## 📊 診斷總結

### ✅ 已確認正常的部分
1. `NodeTabs.tsx` 整合邏輯正確
2. `L2_Live` 元件會被渲染 (第 216-218 行)
3. `L4_Dashboard` 元件會被渲染 (第 225-229 行)
4. Hub 節點渲染邏輯存在 (`HubNodeLayer.tsx`, `NodeMarker.tsx`)

### ❌ 問題根因

#### 問題 1: L2 資料可能未從 API 載入
**位置**: `NodeTabs.tsx:74-104`

```typescript
// l2Adapter 從 rawData.l2_status 取得資料
const l2Adapter = (() => {
    const source = rawData.l2_status || {};  // ⚠️ 可能為空物件

    return {
        lines: (source.line_status || []).map(...),  // ⚠️ 可能為空陣列
        ...
    };
})();
```

**檢查點**:
- `/api/nodes/[nodeId]` 是否返回 `l2_status` 欄位?
- `l2_status.line_status` 是否有資料?

#### 問題 2: L4 Knowledge 可能未載入
**位置**: `NodeTabs.tsx:149`

```typescript
l4_knowledge: node.riding_knowledge || rawData.riding_knowledge ||
              rawData.l4_knowledge || undefined  // ⚠️ 可能為 undefined
```

**檢查點**:
- 資料庫是否有該節點的 `riding_knowledge` 資料?
- API 是否正確返回?

#### 問題 3: Hub 節點顯示邏輯可能被覆蓋
**位置**: `HubNodeLayer.tsx:122` + `NodeMarker.tsx`

**檢查點**:
- `parent_hub_id === null` 判斷是否正確?
- Hub 圖示樣式是否被正確渲染?

---

## 🔧 快速修復方案

### 修復 1: 加入 L2 資料 Fallback 與 Debug

**檔案**: `src/components/node/L2_Live.tsx`

**目標**: 確保即使無資料也顯示友善訊息

```typescript
// 在 L2_Live.tsx 開頭加入
export function L2_Live({ data }: { data: StationUIProfile }) {
    // ✅ Debug: 檢查資料
    console.log('[L2_Live] Received data:', {
        id: data.id,
        hasL2: !!data.l2,
        linesCount: data.l2?.lines?.length || 0,
        lines: data.l2?.lines
    });

    // ✅ Fallback: 如果無資料,顯示友善訊息
    if (!data.l2 || !data.l2.lines || data.l2.lines.length === 0) {
        return (
            <div className="p-6 text-center">
                <p className="text-gray-500">目前無即時列車資訊</p>
                <p className="text-sm text-gray-400 mt-2">
                    請稍後重試或選擇其他車站
                </p>
            </div>
        );
    }

    // 正常渲染...
}
```

### 修復 2: 加入 L4 Knowledge Fallback

**檔案**: `src/components/node/L4_Dashboard_Optimized.tsx`

**目標**: 即使無 knowledge 也顯示基本建議

```typescript
export default function L4_Dashboard({ currentNodeId, l4Knowledge }: L4DashboardProps) {
    // ✅ Debug: 檢查 knowledge
    console.log('[L4_Dashboard] Knowledge:', {
        nodeId: currentNodeId,
        hasKnowledge: !!l4Knowledge,
        trapsCount: l4Knowledge?.traps?.length || 0,
        hacksCount: l4Knowledge?.hacks?.length || 0
    });

    // ✅ Fallback: 如果無 knowledge,顯示通用建議
    const displayKnowledge = l4Knowledge || {
        traps: [],
        hacks: [],
        general_tips: ['查看即時列車資訊', '注意轉乘路線', '留意出口位置']
    };

    // 正常渲染...
}
```

### 修復 3: 確保 Hub 節點正確顯示

**檔案**: `src/components/map/NodeMarker.tsx`

**目標**: Hub 節點使用特殊圖示

```typescript
// 找到 NodeMarker 元件,確保有這段邏輯:

const isHub = node.parent_hub_id === null;
const memberCount = hubDetails?.[node.id]?.member_count || 0;

// ✅ Hub 節點:使用皇冠圖示
if (isHub && memberCount > 1) {
    return (
        <div className="relative">
            {/* 皇冠圖示 */}
            <div className="text-3xl">👑</div>
            {/* Hub 名稱 */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <span className="text-xs font-bold bg-white px-2 py-1 rounded shadow">
                    {nodeName}
                </span>
            </div>
            {/* 成員數量徽章 */}
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {memberCount}
            </div>
        </div>
    );
}

// ✅ Spoke 節點:使用數字
return (
    <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
        {memberCount || '•'}
    </div>
);
```

---

## 🧪 測試步驟

### 測試 1: 驗證 L2 資料

```bash
# 1. 啟動開發伺服器
npm run dev

# 2. 開啟瀏覽器 Console
# 3. 點擊任意車站
# 4. 檢查 Console 輸出:

[L2_Live] Received data: {
    id: "node_xxx",
    hasL2: true,  // ⚠️ 如果是 false,問題在 API
    linesCount: 5,
    lines: [...]
}

# 5. 如果 hasL2 為 false:
#    → 問題在 /api/nodes/[nodeId]
#    → 需要檢查後端 API
```

### 測試 2: 驗證 L4 Knowledge

```bash
# 1. 點擊車站後切換到 "智能嚮導" Tab
# 2. 檢查 Console 輸出:

[L4_Dashboard] Knowledge: {
    nodeId: "node_xxx",
    hasKnowledge: true,  // ⚠️ 如果是 false,問題在資料庫
    trapsCount: 3,
    hacksCount: 2
}

# 3. 如果 hasKnowledge 為 false:
#    → 檢查資料庫 riding_knowledge 表
#    → 或使用 fallback 通用建議
```

### 測試 3: 驗證 Hub 節點圖示

```bash
# 1. 查看地圖
# 2. 找到上野站、東京站等大站
# 3. 應該看到:
#    ✅ 皇冠圖示 👑
#    ✅ 車站名稱
#    ✅ 成員數量徽章

# 4. 如果看到數字而非皇冠:
#    → 檢查 parent_hub_id 是否為 null
#    → 檢查 memberCount 是否 > 1
```

---

## 📋 執行檢查清單

### Phase 1: 加入 Debug 輸出 (15 分鐘)
- [ ] 在 `L2_Live.tsx` 加入 console.log
- [ ] 在 `L4_Dashboard_Optimized.tsx` 加入 console.log
- [ ] 重啟開發伺服器
- [ ] 點擊車站,檢查 Console 輸出

### Phase 2: 根據 Debug 結果修復 (30-60 分鐘)

**情境 A**: L2 資料存在但未顯示
```typescript
// 可能是 L2_Live 渲染邏輯問題
// 檢查 TrainLineItem 是否正確渲染
```

**情境 B**: L2 資料不存在
```typescript
// 問題在 API 層
// 需要檢查 /api/nodes/[nodeId]
// 或 /api/l2/status
```

**情境 C**: L4 Knowledge 存在但未顯示
```typescript
// 檢查 AIIntelligenceHub 渲染條件
// 確認 knowledgeFilter 狀態
```

**情境 D**: L4 Knowledge 不存在
```typescript
// 使用 fallback 通用建議
// 或提示使用者"目前無專家建議"
```

**情境 E**: Hub 節點判斷錯誤
```typescript
// 檢查 parent_hub_id 欄位
// 確認 isHub 邏輯
```

### Phase 3: 整合測試 (30 分鐘)
- [ ] 測試 5 個不同車站
- [ ] 驗證 L2 即時資訊正常
- [ ] 驗證 L4 專家建議正常
- [ ] 驗證 Hub 圖示正確顯示

---

## 🎯 預期成果

### 修復後應該看到:

**1. 點擊車站 → 即時資訊 Tab**
```
✅ 顯示列車路線列表
✅ 每條路線顯示:
   - 路線名稱 (如: 銀座線)
   - 營運商 (如: 東京メトロ)
   - 運行狀態 (正常/延遲/取消)
   - 延遲分鐘數 (如有)
```

**2. 點擊車站 → 智能嚮導 Tab**
```
✅ 顯示專家知識卡片
✅ 可篩選 All / Traps / Hacks
✅ 每張卡片顯示:
   - 標題
   - 內容
   - 類型標籤
```

**3. 查看地圖**
```
✅ Hub 節點 (上野、東京站):
   - 顯示 👑 皇冠圖示
   - 顯示車站名稱
   - 顯示成員數量徽章

✅ Spoke 節點 (小站):
   - 顯示數字或小圖示
   - 點擊後展開詳細資訊
```

---

## ⚠️ 如果問題仍存在

### 終極檢查:檢視 API 回應

```bash
# 1. 打開 Chrome DevTools → Network Tab
# 2. 點擊任意車站
# 3. 找到 /api/nodes/[nodeId] 請求
# 4. 檢查 Response:

{
    "id": "node_xxx",
    "name": {...},
    "l2_status": {  // ⚠️ 這個欄位必須存在
        "line_status": [  // ⚠️ 這個陣列必須有資料
            {
                "railway_id": "...",
                "name": "銀座線",
                "operator": "東京メトロ",
                "status": "normal",
                ...
            }
        ]
    },
    "riding_knowledge": {  // ⚠️ 這個欄位必須存在
        "traps": [...],
        "hacks": [...]
    }
}

# 5. 如果這些欄位不存在:
#    → 問題在後端 API
#    → 需要檢查資料庫查詢邏輯
```

---

## 📞 需要協助?

如果遇到以下情況,請提供詳細資訊:

1. **L2 資料無法載入**
   - 提供 Network Tab 中的 API 回應
   - 提供 Console 錯誤訊息

2. **L4 Knowledge 無法顯示**
   - 檢查資料庫是否有該節點的 riding_knowledge
   - 提供 `SELECT * FROM riding_knowledge WHERE node_id = 'xxx'` 結果

3. **Hub 節點圖示錯誤**
   - 提供該節點的 `parent_hub_id` 值
   - 提供 `hubDetails` 物件內容

---

**建立者**: Claude AI Assistant
**最後更新**: 2026-01-22
**預計修復時間**: 1-2 小時
