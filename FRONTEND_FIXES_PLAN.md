# 🔧 LUTAGU 前端功能修復計劃

**建立日期**: 2026-01-22
**問題來源**: 使用者截圖反饋
**優先級**: P0 (Critical) - 核心功能缺失

---

## 🚨 問題總覽

根據使用者提供的截圖,發現以下核心功能缺失或異常:

### 問題 1: L2 即時列車資訊未顯示 ❌
**現象**:
- 選擇節點後,沒有顯示列車運行狀態
- 沒有延遲資訊 (delay_minutes)
- 沒有異常通知 (halt, canceled, disruption)

**影響**:
- 使用者無法得知列車即時狀況
- 失去核心價值主張:"將冷數據轉化為共感指引"

**初步診斷**:
- `L2_Live.tsx` 元件存在,但可能未被正確渲染
- 可能是 API 呼叫失敗或數據未載入
- 可能是元件條件渲染邏輯問題

### 問題 2: L4 專家知識卡片未顯示 ❌
**現象**:
- 沒有 Traps (陷阱提示) 卡片
- 沒有 Hacks (通行技巧) 卡片
- 沒有行動策略建議 (Action Cards)

**影響**:
- 使用者只看到地圖,沒有獲得任何建議
- 核心 L4 決策引擎功能未發揮作用

**初步診斷**:
- L4_Dashboard 可能未被渲染或被隱藏
- AI Intelligence Hub 元件可能有條件渲染問題
- Knowledge API 可能未被呼叫

### 問題 3: Hub 節點顯示邏輯錯誤 ❌
**現象**:
- 上野站、東京站等大型樞紐站顯示為**數字**
- 應該顯示為特殊的 Hub 圖示 (皇冠或星形)
- 需要放大地圖層級才能看到節點細節

**影響**:
- Hub-Spoke 架構視覺化失效
- 使用者無法快速識別重要樞紐
- 地圖可讀性差

**初步診斷**:
- `NodeMarker.tsx` 的 Hub 圖示渲染邏輯有問題
- `parent_hub_id IS NULL` 的判斷可能失效
- 圖標樣式或 zIndex 設定錯誤

---

## 🔍 根因分析計劃

### Step 1: 檢查 L2 資料流
```typescript
// 需要驗證的流程
用戶點擊節點
→ NodeTabs.tsx 被觸發
→ L2_Live.tsx 被渲染
→ 呼叫 /api/l2/status?nodeId=xxx
→ 顯示列車狀態

// 檢查點
1. NodeTabs 是否正確傳遞 nodeId?
2. L2_Live 是否被條件隱藏?
3. API 是否返回正確數據?
4. 數據是否被正確渲染到 UI?
```

### Step 2: 檢查 L4 Dashboard 渲染
```typescript
// 需要驗證的流程
用戶選擇節點
→ L4_Dashboard_Optimized.tsx 被渲染
→ AIIntelligenceHub 顯示知識卡片
→ 呼叫 /api/l4/knowledge?nodeId=xxx
→ 顯示 Traps/Hacks

// 檢查點
1. L4_Dashboard 是否被渲染?
2. activeViewMode 是否正確?
3. l4Knowledge 數據是否載入?
4. AIIntelligenceHub 是否被條件隱藏?
```

### Step 3: 檢查 Hub 節點圖示渲染
```typescript
// 需要驗證的邏輯
HubNodeLayer 過濾節點
→ NodeMarker 判斷 isHub
→ 渲染不同圖示
  - Hub: 皇冠圖示 + 大尺寸
  - Spoke: 數字或小圖示

// 檢查點
1. parent_hub_id === null 判斷是否正確?
2. isHub 屬性是否正確傳遞?
3. 圖示樣式是否被覆蓋?
4. zIndex 層級是否正確?
```

---

## 📋 修復計劃

### Phase 1: 緊急診斷 (1 小時)

#### Task 1.1: 驗證 NodeTabs 與 L2_Live 整合
```bash
# 檢查檔案
src/components/node/NodeTabs.tsx
src/components/node/L2_Live.tsx

# 驗證點
- NodeTabs 是否正確引入 L2_Live?
- currentNodeId 是否正確傳遞?
- L2_Live 是否有條件渲染邏輯阻止顯示?
```

**預期結果**: 找出 L2 資訊未顯示的原因

#### Task 1.2: 驗證 L4_Dashboard 渲染狀態
```bash
# 檢查檔案
src/components/node/L4_Dashboard_Optimized.tsx
src/components/node/dashboard/AIIntelligenceHub.tsx

# 驗證點
- L4_Dashboard 是否在 NodeTabs 中被渲染?
- l4Knowledge 是否被正確載入?
- AIIntelligenceHub 顯示條件是什麼?
```

**預期結果**: 找出專家知識卡片未顯示的原因

#### Task 1.3: 檢查 Hub 節點圖示邏輯
```bash
# 檢查檔案
src/components/map/NodeMarker.tsx
src/components/map/HubNodeLayer.tsx

# 驗證點
- isHub 如何判斷?
- Hub 圖示樣式定義在哪?
- 是否有 CSS 覆蓋問題?
```

**預期結果**: 找出 Hub 節點顯示為數字的原因

### Phase 2: 緊急修復 (2-3 小時)

#### Fix 1: 修復 L2 即時資訊顯示

**方案 A**: 如果是條件渲染問題
```typescript
// src/components/node/NodeTabs.tsx
// 確保 L2_Live 總是顯示

<TabsContent value="live">
  <L2_Live
    nodeId={currentNodeId}
    nodeName={currentNode?.name}
    locale={locale}
    // 移除任何阻止渲染的條件
  />
</TabsContent>
```

**方案 B**: 如果是 API 問題
```typescript
// 檢查 /api/l2/status 是否正常運作
// 加入錯誤處理與 fallback UI

if (error) {
  return <ErrorMessage>無法載入即時資訊</ErrorMessage>;
}
if (loading) {
  return <Skeleton />;
}
if (!data || data.length === 0) {
  return <EmptyState>目前無列車資訊</EmptyState>;
}
```

**方案 C**: 如果是數據格式問題
```typescript
// 檢查 L2 API 返回的數據結構
// 確認 L2_Live 元件預期的數據格式一致
```

**測試驗證**:
```bash
# 啟動開發伺服器
npm run dev

# 點擊任意車站節點
# 應該看到:
# - 列車路線列表
# - 運行狀態 (正常/延遲/取消)
# - 延遲分鐘數 (如有)
```

#### Fix 2: 修復 L4 專家知識卡片顯示

**方案 A**: 檢查 l4Knowledge API 呼叫
```typescript
// src/components/node/L4_Dashboard_Optimized.tsx

useEffect(() => {
  if (!currentNodeId) return;

  // 確認此 API 呼叫存在且正常
  fetch(`/api/l4/knowledge?nodeId=${currentNodeId}`)
    .then(res => res.json())
    .then(data => setL4Knowledge(data))
    .catch(err => console.error('Failed to load knowledge:', err));
}, [currentNodeId]);
```

**方案 B**: 確保 AIIntelligenceHub 正確渲染
```typescript
// 檢查 activeViewMode
// 確保 'recommendations' 模式下顯示 AIIntelligenceHub

{activeViewMode === 'recommendations' && l4Knowledge && (
  <AIIntelligenceHub
    l4Knowledge={l4Knowledge}
    knowledgeFilter={knowledgeFilter}
    onFilterChange={setKnowledgeFilter}
    onStartChat={handleStartChat}
    t={tL4}
  />
)}
```

**方案 C**: 檢查 knowledge 數據是否為空
```typescript
// 如果 l4Knowledge 為空,可能需要:
// 1. 檢查資料庫是否有該節點的知識數據
// 2. 使用 fallback 數據或顯示"目前無建議"
```

**測試驗證**:
```bash
# 點擊上野站或淺草站
# 應該看到:
# - Traps 卡片 (如: 出口容易走錯)
# - Hacks 卡片 (如: 從後車廂較不擁擠)
# - 可篩選 All/Traps/Hacks
```

#### Fix 3: 修復 Hub 節點圖示顯示

**方案 A**: 修正 isHub 判斷邏輯
```typescript
// src/components/map/NodeMarker.tsx

const isHub = node.parent_hub_id === null;
const memberCount = hubDetails?.[node.id]?.member_count || 0;

// Hub 節點應該:
// - 顯示皇冠圖示 👑
// - 較大的尺寸
// - 不同的顏色
// - 較高的 zIndex
```

**方案 B**: 修正 Hub 圖示樣式
```typescript
// Hub 節點渲染邏輯
if (isHub && memberCount > 1) {
  return (
    <div className="hub-marker">
      <Crown size={24} /> {/* 或使用 👑 emoji */}
      <span className="hub-name">{nodeName}</span>
    </div>
  );
}

// Spoke 節點渲染邏輯
return (
  <div className="spoke-marker">
    <span className="facility-count">{memberCount}</span>
  </div>
);
```

**方案 C**: 調整 Hub 顯示優先級
```typescript
// 確保 Hub 節點:
// 1. 在任何 zoom level 都可見
// 2. zIndex 高於 Spoke 節點
// 3. 不被 clustering 聚合

const hubZIndex = isHub ? 1000 : 100;
```

**測試驗證**:
```bash
# 查看地圖
# 應該看到:
# - 上野站、東京站顯示為 👑 或特殊圖示
# - 其他小站顯示為數字或小圖示
# - Hub 節點在較遠 zoom level 也可見
```

### Phase 3: 整合測試與優化 (1 小時)

#### Test 1: 完整流程測試
```
1. 開啟地圖
2. 點擊上野站 (Hub)
   ✅ 顯示 Hub 專屬圖示
   ✅ 右側面板顯示節點資訊
   ✅ L2 即時資訊顯示列車狀態
   ✅ L4 專家知識卡片顯示 Traps/Hacks

3. 點擊小站 (Spoke)
   ✅ 顯示數字或小圖示
   ✅ L2 資訊正常顯示
   ✅ L4 知識正常顯示

4. 切換 Tab (Live/Planner/AI)
   ✅ 各 Tab 內容正常顯示
```

#### Test 2: 邊界情況測試
```
1. 節點無 L2 資訊
   ✅ 顯示友善的 Empty State

2. 節點無 L4 知識
   ✅ 顯示"目前無專家建議"

3. API 請求失敗
   ✅ 顯示錯誤訊息與重試按鈕
```

---

## 🎯 成功標準

### 必須達成 (P0)
1. ✅ 點擊任意節點後,L2 即時列車資訊正常顯示
2. ✅ L4 專家知識卡片 (Traps/Hacks) 正常顯示
3. ✅ Hub 節點顯示為特殊圖示,Spoke 節點顯示為數字

### 應該達成 (P1)
1. ⭕ Hub 節點在任何 zoom level 都清晰可見
2. ⭕ L2/L4 資訊載入有 Loading 狀態
3. ⭕ API 錯誤有友善的錯誤訊息

### 可以達成 (P2)
1. 🔲 L2 資訊自動刷新 (20 秒)
2. 🔲 L4 卡片有動畫效果
3. 🔲 Hub 節點有 tooltip 顯示成員數量

---

## 📊 實施時程

### 今天 (2026-01-22)
- [x] 診斷問題根因 (1 小時)
- [ ] 修復 L2 即時資訊顯示 (1 小時)
- [ ] 修復 L4 專家知識卡片 (1 小時)
- [ ] 修復 Hub 節點圖示 (0.5 小時)
- [ ] 整合測試 (0.5 小時)

**預計完成時間**: 今天晚上 18:00

---

## 🔧 技術債務記錄

### 需要重構的部分
1. **NodeTabs 元件**: 過於複雜,建議拆分
2. **L2_Live 元件**: 條件渲染邏輯過多,建議簡化
3. **HubNodeLayer**: 效能優化後,可讀性下降,需要加註解

### 未來改善方向
1. 加入自動化 E2E 測試,避免 UI 功能回歸
2. 建立 Storybook,隔離測試各元件
3. 加入效能監控,追蹤 L2/L4 API 回應時間

---

## 📎 相關文件

- **元件位置**:
  - `src/components/node/NodeTabs.tsx`
  - `src/components/node/L2_Live.tsx`
  - `src/components/node/L4_Dashboard_Optimized.tsx`
  - `src/components/map/NodeMarker.tsx`
  - `src/components/map/HubNodeLayer.tsx`

- **API 端點**:
  - `/api/l2/status` - L2 即時狀態
  - `/api/l4/knowledge` - L4 專家知識
  - `/api/nodes/[nodeId]` - 節點詳細資訊

---

**建立者**: Claude AI Assistant
**優先級**: P0 (Critical)
**預計完成**: 2026-01-22 18:00
