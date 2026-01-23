# 樞紐站標籤顯示問題修正報告

## 問題描述

**使用者回報**：
> 實際測試看不到在地圖上顯示東京、上野、品川、澀谷、新宿等重要樞紐車站名稱，只有意義不明的數字，這樣是違反我設計的初衷。

**問題分析**：
- 地圖僅顯示 member count badge（+2, +3 等數字）
- 重要樞紐站的**站名標籤**（東京、上野、新宿等）未顯示
- 違反設計初衷：使用者無法快速識別重要轉乘樞紐

---

## 根本原因

### 原始邏輯（有問題的版本）

```typescript
const showLabel = isSelected ||                  // 僅選中時顯示
    (hasMembers && zoom >= 12) ||                // 有成員且 Zoom ≥ 12
    (isMajor && zoom >= 14) ||                   // 主要站且 Zoom ≥ 14
    (zoom >= 16);                                // 所有站 Zoom ≥ 16
```

**問題所在**：
1. **條件過於嚴格**：樞紐站需要 `hasMembers && zoom >= 12` 才顯示標籤
2. **Zoom 依賴性**：即使是重要樞紐，在低 Zoom 時也不顯示站名
3. **違反直覺**：使用者在城市視角（低 Zoom）最需要看到樞紐站名稱

**實際影響**：
- Zoom 11：樞紐站顯示但**沒有站名** ❌
- Zoom 12-15：部分樞紐站可能沒有站名 ⚠️
- Zoom 16+：所有站才顯示站名 ⚠️

---

## 解決方案

### 修正後邏輯（v2.0）

```typescript
const showLabel = isSelected ||                  // Priority 1: 選中節點
    hasMembers ||                                // Priority 2a: 有成員的樞紐站（永遠顯示）
    isExplicitHub ||                             // Priority 2b: 明確的樞紐站（永遠顯示）
    (isMajor && zoom >= 13) ||                   // Priority 3: 主要站（Zoom 13+）
    (zoom >= 15);                                // Priority 4: 所有站（Zoom 15+）
```

### 關鍵改進

#### 1. **樞紐站永遠顯示標籤** ✅
```typescript
hasMembers ||        // 有轉乘成員的樞紐站
isExplicitHub ||     // parent_hub_id === null 的樞紐站
```

**理由**：
- 樞紐站是主要導航地標，必須在**所有 Zoom 級別**顯示站名
- 確保東京、上野、新宿、澀谷等重要站點永遠可識別
- 符合使用者心智模型：城市視角更需要看到樞紐站名稱

#### 2. **雙重保險機制** ✅
- `hasMembers`：依賴 `hubDetails` 資料（最準確）
- `isExplicitHub`：依賴節點結構（`parent_hub_id === null`）作為備用
- **即使 hubDetails 缺失**，仍可透過 `isExplicitHub` 確保樞紐站顯示標籤

#### 3. **一般站仍維持漸進式顯示** ✅
- Major stations：Zoom 13+（調整為 13，更早顯示）
- All stations：Zoom 15+
- 避免低 Zoom 時過度雜亂

---

## 預期效果對比

### Before（有問題）

| Zoom 級別 | 樞紐站標籤 | 一般站標籤 | 問題 |
|-----------|-----------|-----------|------|
| 11-12 | ❌ 不顯示 | ❌ 不顯示 | **無法識別樞紐** |
| 13-14 | ⚠️ 部分顯示 | ❌ 不顯示 | 仍有遺漏 |
| 15+ | ✅ 顯示 | ✅ 顯示 | Zoom 太高才看到 |

### After（已修正）

| Zoom 級別 | 樞紐站標籤 | 一般站標籤 | 效果 |
|-----------|-----------|-----------|------|
| 11-12 | ✅ **永遠顯示** | ❌ 不顯示 | **清晰識別樞紐** ✅ |
| 13-14 | ✅ **永遠顯示** | ⚠️ Major 顯示 | 漸進式資訊揭露 |
| 15+ | ✅ **永遠顯示** | ✅ 全部顯示 | 完整細節 |

---

## 視覺效果改善

### Zoom 11-12（城市視角）

**Before**：
```
[M] [M] [M] [M]     ← 只有 marker，沒有站名
+2  +3  +5  +4      ← 只有數字，無法識別是哪個站
```

**After**：
```
[M]      [M]      [M]      [M]
上野     秋葉原    東京     新宿    ← 清楚顯示站名 ✅
+2       +3       +5       +4
```

### Zoom 13-14（街區視角）

**Before**：
```
[M]      [M]      [小站]   [小站]
上野     秋葉原    ?        ?       ← 部分站名缺失
+2       +3
```

**After**：
```
[M]      [M]      [小站]   [小站]
上野     秋葉原    後樂園   押上     ← 所有 Major 站都有站名 ✅
+2       +3       +2       +2
```

---

## 技術細節

### 修改檔案
- **檔案**：`src/components/map/NodeMarker.tsx`
- **位置**：Line 124-137

### 核心變更

#### 變更 1：移除 Zoom 門檻
```diff
- (hasMembers && zoom >= 12) ||    // 舊邏輯：需要 Zoom ≥ 12
+ hasMembers ||                     // 新邏輯：永遠顯示
```

#### 變更 2：新增 Explicit Hub 檢查
```diff
+ isExplicitHub ||                  // 新增：確保所有樞紐站顯示
```

#### 變更 3：調整一般站門檻
```diff
- (isMajor && zoom >= 14) ||        // 舊邏輯：Zoom 14+
+ (isMajor && zoom >= 13) ||        // 新邏輯：Zoom 13+（更早顯示）
```

```diff
- (zoom >= 16);                     // 舊邏輯：所有站 Zoom 16+
+ (zoom >= 15);                     // 新邏輯：所有站 Zoom 15+（更早顯示）
```

### 定義檢查（確保正確）

```typescript
// Line 79-80
const isExplicitHub = node.is_hub === true || node.parent_hub_id === null;
const hasMembers = hubDetails && hubDetails.member_count > 0;
```

---

## 測試驗證

### 手動測試步驟

1. **開啟開發環境**
   ```bash
   # 如果伺服器已啟動，直接前往 http://localhost:3001
   # 否則執行：npm run dev
   ```

2. **強制重新整理頁面**
   - Mac: `Cmd + Shift + R`
   - Windows/Linux: `Ctrl + Shift + R`

3. **測試各 Zoom 級別**

   **Zoom 11-12（城市視角）**：
   - [ ] 點擊 Zoom Out (-) 按鈕 5-6 次
   - [ ] 確認樞紐站（藍色 M 標記）是否顯示站名
   - [ ] 預期看到：**上野**、**秋葉原**、**東京**、**新宿** 等站名

   **Zoom 13-14（街區視角）**：
   - [ ] 點擊 Zoom In (+) 按鈕 2-3 次
   - [ ] 確認更多站點出現，主要站是否顯示站名
   - [ ] 預期看到：樞紐站 + 主要站（如後樂園、押上）站名

   **Zoom 15+（詳細視角）**：
   - [ ] 繼續點擊 Zoom In (+) 直到 Zoom 15+
   - [ ] 確認所有站點是否顯示站名
   - [ ] 預期看到：所有車站標籤

4. **視覺檢查**
   - [ ] 站名標籤是否清楚可讀
   - [ ] 標籤是否與 marker 對齊
   - [ ] 標籤是否有重疊（若有，需調整間距）
   - [ ] member count badge (+2, +3) 是否仍正常顯示

---

## 預期成果

### 使用者體驗改善

✅ **立即識別樞紐站**
- 使用者可在任何 Zoom 級別看到重要樞紐站名稱
- 不再需要點擊才能知道是哪個站

✅ **符合設計初衷**
- 樞紐站作為主要導航地標，永遠清晰可見
- 站名 > 數字，資訊層次正確

✅ **減少認知負擔**
- 不需記憶「+3 是秋葉原」
- 直接看到「秋葉原 +3」

✅ **保持地圖清晰**
- 一般站仍維持漸進式顯示
- 避免低 Zoom 時過度雜亂

---

## 後續建議

### 1. 標籤重疊處理（若需要）

如果樞紐站密集區域出現標籤重疊，可考慮：

**選項 A：動態定位**
```typescript
// 根據相鄰節點調整標籤位置
const labelPosition = hasNearbyNodes
  ? 'absolute -top-12'     // 上方顯示
  : 'absolute -bottom-12'; // 下方顯示（預設）
```

**選項 B：碰撞檢測**
使用 Leaflet Tooltip 或 Label Collision Detection 外掛

**選項 C：優先級淡出**
```typescript
const labelOpacity = hasMembers ? 1.0 : 0.8; // 樞紐站標籤更清晰
```

### 2. 字體大小動態調整（可選）

```typescript
const labelSize = hasMembers
  ? 'text-sm font-black'   // 樞紐站：14px 粗體
  : 'text-xs font-bold';   // 一般站：12px 粗體
```

### 3. 標籤背景強化（可選）

```typescript
const labelBg = hasMembers
  ? 'bg-white/95 shadow-xl'  // 樞紐站：更不透明、更強陰影
  : 'bg-white/85 shadow-lg'; // 一般站：標準樣式
```

---

## 修正總結

| 項目 | 狀態 |
|------|------|
| 問題診斷 | ✅ 完成 |
| 程式碼修正 | ✅ 完成 |
| 邏輯驗證 | ✅ 完成 |
| 測試文件 | ✅ 完成 |
| 待手動測試 | ⏳ 待驗證 |

---

## Git Commit 建議

```bash
git add src/components/map/NodeMarker.tsx
git commit -m "fix(map): ensure hub station names always visible

BREAKING: Hub stations now show labels at all zoom levels

Changes:
- Remove zoom threshold for hub station labels (hasMembers)
- Add isExplicitHub fallback for stations without hubDetails
- Lower zoom thresholds: major stations 14→13, all stations 16→15

Impact:
- Major hubs (Tokyo, Ueno, Shibuya, Shinjuku) now always show names
- Fixes user-reported issue: only numbers visible, no station names
- Aligns with design intent: hub stations as primary navigation landmarks

Closes: Hub station name visibility issue
"
```

---

**修正完成時間**：2026-01-23
**測試狀態**：⏳ 待使用者手動驗證
**預期效果**：✅ 樞紐站名稱在所有 Zoom 級別清晰可見
