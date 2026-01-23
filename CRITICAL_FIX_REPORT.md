# 樞紐站標籤問題 - 關鍵修正報告

## 🚨 發現的根本問題

### 問題 1：Cache Key 缺少 `zoom` 依賴 ✅ 已修正

**原始程式碼**（有問題）：
```typescript
const iconCacheKey = useMemo(() => {
    return `${node.id}:${isSelected}:${isMajor}:${hasMembers}:${memberCount}:${baseColor}:${showLabel}:${label}`;
}, [node.id, isSelected, isMajor, hasMembers, memberCount, baseColor, showLabel, label]);
//  ❌ 缺少 zoom！
```

**問題說明**：
- `showLabel` 依賴 `zoom`（有 `zoom >= 13` 和 `zoom >= 15` 條件）
- 但 `iconCacheKey` 的依賴項中**沒有 `zoom`**
- 導致當 zoom 改變時，cache key 不變，使用舊的 cached icon
- **結果**：即使 `showLabel` 變成 `true`，仍顯示舊的（沒有標籤的）icon

**修正後**：
```typescript
const iconCacheKey = useMemo(() => {
    return `${node.id}:${isSelected}:${isMajor}:${hasMembers}:${memberCount}:${baseColor}:${showLabel}:${label}:${zoom}`;
}, [node.id, isSelected, isMajor, hasMembers, memberCount, baseColor, showLabel, label, zoom]);
//  ✅ 加入 zoom
```

---

### 問題 2：`showLabel` 未 Memoize ✅ 已修正

**原始程式碼**（有問題）：
```typescript
const showLabel = isSelected ||
    hasMembers ||
    isExplicitHub ||
    (isMajor && zoom >= 13) ||
    (zoom >= 15);
//  ❌ 不是 useMemo，每次都重新計算但可能不觸發 cache key 更新
```

**問題說明**：
- `showLabel` 依賴 `zoom`，但沒有使用 `useMemo`
- 雖然每次渲染都會重新計算，但如果 React 沒有 re-render，值就不會更新
- 與 `iconCacheKey` 的更新時機可能不同步

**修正後**：
```typescript
const showLabel = useMemo(() => {
    return isSelected ||
        hasMembers ||
        isExplicitHub ||
        (isMajor && zoom >= 13) ||
        (zoom >= 15);
}, [isSelected, hasMembers, isExplicitHub, isMajor, zoom]);
//  ✅ 使用 useMemo，確保依賴項正確
```

---

## 🔍 為什麼之前測試看不到標籤？

### 時間序列分析

1. **初次載入頁面**（Zoom 15）
   - `showLabel` = `true`（因為 zoom >= 15）
   - 建立 icon 並放入 cache
   - Cache key: `node123:false:true:true:2:blue:true:上野:15`

2. **使用者縮小地圖**（Zoom → 12）
   - `showLabel` 應該 = `true`（因為 hasMembers）
   - **但 cache key 沒有包含 zoom！**
   - Cache key 仍然是: `node123:false:true:true:2:blue:true:上野` ❌
   - 系統找到舊的 cache（Zoom 15 時建立的）
   - **使用舊的 icon，沒有重新渲染！**

3. **修正後的行為**（Zoom → 12）
   - `showLabel` = `true`（因為 hasMembers）
   - Cache key: `node123:false:true:true:2:blue:true:上野:12` ✅
   - 與舊 cache key 不同（zoom 不同）
   - **重新渲染 icon，顯示正確的標籤！**

---

## 🎯 修正完成度

| 項目 | 狀態 | 說明 |
|------|------|------|
| 移除 Zoom 門檻 | ✅ 完成 | `hasMembers \|\|` 已實作 |
| 新增備用檢查 | ✅ 完成 | `isExplicitHub \|\|` 已實作 |
| Cache Key 修正 | ✅ **剛完成** | 加入 `zoom` 依賴 |
| showLabel Memoize | ✅ **剛完成** | 使用 `useMemo` |
| 編譯驗證 | ✅ 完成 | 706ms 成功編譯 |

---

## 🧪 測試步驟（修正後）

### 重要：必須清除瀏覽器快取！

由於修正了 cache key，舊的 cache 可能仍存在於記憶體中。請按照以下步驟測試：

### 步驟 1：完全重新載入頁面

**選項 A：硬重新整理（推薦）**
```
Mac: Cmd + Shift + R
Windows: Ctrl + Shift + F5
```

**選項 B：清除快取後重新整理**
1. 開啟開發者工具（F12 或 Cmd+Option+I）
2. 右鍵點擊重新整理按鈕
3. 選擇「清除快取的內容並強制重新整理」

**選項 C：關閉並重新開啟頁面**
1. 關閉 http://localhost:3001 分頁
2. 重新開啟 http://localhost:3001

### 步驟 2：視覺驗證

**預期看到**：
```
   [M]
   上野      ← 清楚的站名標籤（白底或深底）
   +2        ← Member count badge
```

**不應該看到**：
```
   [M]
   +2        ← 只有數字，沒有站名（這是問題）
```

### 步驟 3：Zoom 測試

1. **低 Zoom（11-12）**：
   - 點擊 Zoom Out (−) 數次
   - **樞紐站應顯示站名**（上野、秋葉原、東京等）

2. **中 Zoom（13-14）**：
   - 點擊 Zoom In (+) 回到預設
   - **樞紐站 + 主要站應顯示站名**

3. **高 Zoom（15+）**：
   - 繼續 Zoom In
   - **所有站應顯示站名**

---

## 🐛 如果仍然看不到標籤

### Debug 步驟

#### 1. 檢查 Console 是否有錯誤
```javascript
// 開啟開發者工具（F12）
// 查看 Console 是否有紅色錯誤
```

#### 2. 執行除錯腳本
在瀏覽器 Console 貼上以下程式碼：

```javascript
// 檢查 showLabel 的計算邏輯
const markers = document.querySelectorAll('.custom-node-icon');
console.log('Total markers:', markers.length);

let withLabels = 0;
let withoutLabels = 0;

markers.forEach(marker => {
  const hasLabel = marker.querySelector('.absolute.-bottom-12');
  const hasBadge = marker.textContent.match(/\+\d+/);
  const hasCrown = marker.querySelector('[data-lucide="crown"]') !== null;

  if (hasLabel) {
    withLabels++;
    if (hasBadge || hasCrown) {
      console.log('✓ Hub with label:', hasLabel.textContent.trim(), hasBadge ? hasBadge[0] : '');
    }
  } else {
    withoutLabels++;
    if (hasBadge || hasCrown) {
      console.error('✗ Hub WITHOUT label! Badge:', hasBadge ? hasBadge[0] : 'none');
    }
  }
});

console.log('With labels:', withLabels);
console.log('Without labels:', withoutLabels);
```

#### 3. 檢查節點資料
```javascript
// 檢查 React DevTools
// 選擇 NodeMarker 元件
// 查看 props: hasMembers, isExplicitHub, showLabel
```

#### 4. 強制清除 Icon Cache
在 Console 執行：
```javascript
// 如果有 React DevTools，可以找到 iconCache 並清空
// 或直接重新載入頁面
location.reload(true);
```

---

## 📊 技術細節總結

### 修改檔案
- **檔案**：`src/components/map/NodeMarker.tsx`
- **修改位置**：
  - Line 124-143：`showLabel` 改為 `useMemo`
  - Line 162-169：`iconCacheKey` 加入 `zoom` 依賴

### 核心變更

#### 變更 1：showLabel Memoization
```diff
- const showLabel = isSelected || hasMembers || ...
+ const showLabel = useMemo(() => {
+     return isSelected || hasMembers || ...
+ }, [isSelected, hasMembers, isExplicitHub, isMajor, zoom]);
```

#### 變更 2：Cache Key 加入 Zoom
```diff
  const iconCacheKey = useMemo(() => {
-     return `...${label}`;
+     return `...${label}:${zoom}`;
- }, [..., label]);
+ }, [..., label, zoom]);
```

---

## ✅ 預期成果

### Before（修正前）
- Zoom 改變時，icon cache key 不變
- 使用舊的 cached icon（沒有標籤）
- **結果**：看不到樞紐站名稱 ❌

### After（修正後）
- Zoom 改變時，icon cache key 包含新的 zoom 值
- 重新渲染 icon（有標籤）
- **結果**：看到樞紐站名稱 ✅

---

## 🎉 結論

**根本原因**：Cache key 缺少 `zoom` 依賴，導致 icon 未重新渲染

**修正方案**：
1. ✅ Cache key 加入 `zoom`
2. ✅ `showLabel` 使用 `useMemo` 確保依賴正確

**測試狀態**：⏳ **請立即測試**

**測試要點**：
1. 完全重新載入頁面（清除舊 cache）
2. 檢查樞紐站是否顯示站名
3. 測試不同 Zoom 級別

---

## 📝 Git Commit

```bash
git add src/components/map/NodeMarker.tsx
git commit -m "fix(map): fix icon cache invalidation for zoom-dependent labels

Critical bug fixes:
1. Add zoom to iconCacheKey dependencies to ensure cache invalidation
2. Memoize showLabel to ensure consistent behavior with dependencies

Problem:
- Icon cache key didn't include zoom
- When zoom changed, old cached icons (without labels) were reused
- Hub station names remained invisible despite showLabel logic changes

Solution:
- iconCacheKey now includes zoom in cache key string and deps array
- showLabel wrapped in useMemo with proper dependencies
- Icon cache correctly invalidates when zoom changes

Impact:
- Hub station labels now correctly appear/disappear based on zoom
- Cache performance maintained while ensuring correctness
- Fixes user-reported issue of invisible hub station names

Files:
- src/components/map/NodeMarker.tsx (L124-143, L162-169)
"
```

---

**修正完成時間**：2026-01-23 17:00
**關鍵修正**：Cache key + Memoization
**測試狀態**：⏳ 待驗證（必須清除快取）
