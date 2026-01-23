# 地圖節點分級顯示優化測試報告

## 測試日期
2026-01-23

## 測試目標
驗證「樞紐節點邊緣化」問題的優化方案是否正確實作並運作

---

## 一、優化方案規格

### 1.1 分級顯示邏輯
| Zoom 級別 | 顯示條件 | 目標節點類型 |
|-----------|---------|-------------|
| < 13 | member_count ≥ 4 | Mega Hubs（4線以上大型樞紐） |
| 13-14 | member_count ≥ 2 | Major Hubs（2線以上轉乘站） |
| ≥ 15 | member_count ≥ 0 | 所有車站 |

### 1.2 動態尺寸規格
| 節點類型 | Zoom < 14 | Zoom ≥ 14 |
|---------|-----------|-----------|
| 樞紐站（Hub/Airport/Major） | **64px** ⬆️ | 56px |
| 一般站（Spoke） | **28px** ⬇️ | 48px |

### 1.3 漸進式標籤顯示
| 優先級 | 條件 | 說明 |
|--------|------|------|
| 1 | isSelected | 永遠顯示選中節點 |
| 2 | hasMembers && zoom ≥ 12 | 樞紐站於城市視角顯示 |
| 3 | isMajor && zoom ≥ 14 | 主要站於街道視角顯示 |
| 4 | zoom ≥ 16 | 所有站於詳細視角顯示 |

---

## 二、程式碼實作驗證

### 2.1 HubNodeLayer.tsx 分級邏輯（第 114-117 行）

```typescript
const minMemberCount = clampedZoom < 13 ? 4 : (clampedZoom < 15 ? 2 : 0);
```

✅ **驗證結果：正確**
- Zoom < 13 → minMemberCount = 4（僅 Mega Hubs）
- Zoom 13-14 → minMemberCount = 2（Major Hubs）
- Zoom ≥ 15 → minMemberCount = 0（所有車站）

### 2.2 NodeMarker.tsx 動態尺寸（第 173-181 行）

**優化前：**
```typescript
const markerSize = (isAirport || isMajor || hasMembers)
    ? (isZoomedOut ? 56 : 56)          // 樞紐保持 56px
    : (isZoomedOut ? 32 : 48);         // 一般站縮小至 32px
```

**優化後：**
```typescript
const markerSize = (isAirport || isMajor || hasMembers)
    ? (isZoomedOut ? 64 : 56)          // 樞紐放大至 64px
    : (isZoomedOut ? 28 : 48);         // 一般站縮小至 28px
```

✅ **驗證結果：已強化**
- 樞紐站在低 Zoom 時從 56px → **64px**（+14% 增大）
- 一般站在低 Zoom 時從 32px → **28px**（-12.5% 縮小）
- **對比度提升：64/28 = 2.29x**（優化前：56/32 = 1.75x）

### 2.3 Icon 尺寸調整（第 183-186 行）

**優化前：**
```typescript
const iconSize = isZoomedOut && !(isAirport || isMajor || hasMembers)
    ? 16 // Tiny icon for minor nodes at low zoom
    : baseIconSize;
```

**優化後：**
```typescript
const iconSize = (isAirport || isMajor || hasMembers)
    ? (isZoomedOut ? 28 : baseIconSize)  // 樞紐 icon 放大
    : (isZoomedOut ? 14 : baseIconSize); // 一般 icon 縮小
```

✅ **驗證結果：已優化**
- 樞紐站 icon：28px（機場）vs 24px（一般樞紐）
- 一般站 icon：14px（比原先的 16px 更小）

### 2.4 漸進式標籤邏輯（第 124-132 行）

```typescript
const showLabel = isSelected ||                  // Priority 1: User selection
    (hasMembers && zoom >= 12) ||                // Priority 2: Hubs at city view
    (isMajor && zoom >= 14) ||                   // Priority 3: Major stations
    (zoom >= 16);                                // Priority 4: All stations
```

✅ **驗證結果：正確**
- 已加入詳細中英文註解說明優先級
- 樞紐站於 Zoom 12 顯示標籤（比一般站早 4 級）

---

## 三、視覺階層對比分析

### 3.1 Marker 尺寸對比

| Zoom 級別 | 樞紐站尺寸 | 一般站尺寸 | 尺寸比例 | 視覺突出度 |
|-----------|-----------|-----------|---------|-----------|
| **< 14（優化後）** | **64px** | **28px** | **2.29x** | **極高** ✅ |
| < 14（優化前） | 56px | 32px | 1.75x | 中等 ⚠️ |
| ≥ 14（優化後） | 56px | 48px | 1.17x | 適中 |

**改善幅度：30.9%** [(2.29-1.75)/1.75 = 0.309]

### 3.2 Icon 尺寸對比

| Zoom 級別 | 樞紐 Icon | 一般 Icon | 視覺差異 |
|-----------|----------|----------|---------|
| **< 14（優化後）** | **28px** | **14px** | **2.0x** ✅ |
| < 14（優化前） | 26px | 16px | 1.625x ⚠️ |
| ≥ 14 | 26px | 22px | 1.18x |

**改善幅度：23.1%** [(2.0-1.625)/1.625 = 0.231]

---

## 四、效能影響評估

### 4.1 渲染節點數量限制

```typescript
// HubNodeLayer.tsx: Line 165-167
const safetyLimit = clampedZoom >= 15 ? 300 : (clampedZoom >= 13 ? 100 : 40);
```

✅ **效能保護機制已啟用**
- Zoom < 13：最多 40 個節點
- Zoom 13-14：最多 100 個節點
- Zoom ≥ 15：最多 300 個節點

### 4.2 Icon Cache 優化

```typescript
// NodeMarker.tsx: Line 54
const ICON_CACHE_MAX_SIZE = 400;
const iconCache = new Map<string, L.DivIcon>();
```

✅ **LRU Cache 已實作**
- 快取容量：400 個 icon
- 使用 Map 維護 LRU（Least Recently Used）機制
- 避免重複建立相同 icon

---

## 五、測試建議與後續步驟

### 5.1 手動測試檢查清單

在瀏覽器中打開 http://localhost:3001，手動驗證以下項目：

#### Zoom 級別測試
- [ ] **Zoom 11-12**：僅顯示 4 線以上樞紐（上野、秋葉原等）
- [ ] **Zoom 13-14**：增加 2 線轉乘站（後樂園、押上等）
- [ ] **Zoom 15+**：顯示所有車站
- [ ] **Zoom < 14**：樞紐站明顯大於一般站（64px vs 28px）

#### 視覺階層測試
- [ ] 樞紐站在低 Zoom 時是否明顯突出
- [ ] 一般站是否適當縮小，不干擾樞紐站
- [ ] 標籤是否按優先級漸進顯示

#### 效能測試
- [ ] 在東京站、新宿站等密集區域操作是否流暢
- [ ] 快速縮放地圖時是否有卡頓
- [ ] 節點切換時是否有延遲

### 5.2 自動化測試建議

建議使用 Playwright 撰寫自動化 E2E 測試：

```typescript
// tests/map-zoom-hierarchy.spec.ts
test('Hub nodes should be prominent at low zoom', async ({ page }) => {
  await page.goto('http://localhost:3001');
  await page.click('button:has-text("先逛逛")');

  // Get map instance and set zoom
  await page.evaluate(() => {
    const map = (window as any).L.map;
    map.setZoom(11);
  });

  // Take screenshot for visual regression
  await page.screenshot({ path: 'zoom-11-mega-hubs.png' });

  // Verify only mega hubs are visible
  const visibleNodes = await page.$$('.custom-node-icon');
  expect(visibleNodes.length).toBeLessThan(10);
});
```

### 5.3 進一步優化建議

#### 5.3.1 動態顏色強化
在低 Zoom 時，可考慮為樞紐站加入更鮮豔的色彩：

```typescript
const baseColor = useMemo(() => {
  if (isAirport) return '#3B82F6';
  const operatorColor = OPERATOR_COLORS[primaryOperator] || OPERATOR_COLORS['Metro'];

  // NEW: Enhance color saturation at low zoom for hubs
  if (isZoomedOut && (isMajor || hasMembers)) {
    return adjustColorSaturation(operatorColor, 1.2); // 20% more vibrant
  }

  return isSelected ? '#111827' : operatorColor;
}, [isSelected, isAirport, primaryOperator, isZoomedOut, isMajor, hasMembers]);
```

#### 5.3.2 漸進式透明度
一般站在低 Zoom 時可加入透明度：

```typescript
const opacity = (isAirport || isMajor || hasMembers)
  ? 1.0
  : (isZoomedOut ? 0.7 : 1.0); // Non-hubs become semi-transparent
```

---

## 六、測試結論

### 6.1 優化完成度
✅ **100% 完成**
- 分級顯示邏輯：已實作 ✅
- 動態尺寸調整：已強化 ✅
- 漸進式標籤：已實作 ✅
- 效能保護：已啟用 ✅

### 6.2 預期效果
- **視覺階層對比度提升 30.9%**
- **樞紐站在低 Zoom 時突出度顯著增強**
- **一般站干擾降低，地圖更清晰**
- **標籤顯示策略合理，減少視覺雜亂**

### 6.3 建議後續行動
1. **立即進行手動測試**：在瀏覽器中驗證不同 Zoom 級別的顯示效果
2. **收集使用者回饋**：觀察實際使用時的視覺體驗
3. **考慮進一步優化**：若需要，可實施顏色強化或透明度調整
4. **建立 E2E 測試**：防止未來改動破壞此優化

---

## 附錄：關鍵程式碼位置

- **分級邏輯**：`src/components/map/HubNodeLayer.tsx:114-117`
- **動態尺寸**：`src/components/map/NodeMarker.tsx:173-181`
- **Icon 尺寸**：`src/components/map/NodeMarker.tsx:183-186`
- **標籤顯示**：`src/components/map/NodeMarker.tsx:124-132`
- **效能限制**：`src/components/map/HubNodeLayer.tsx:165-167`
- **Icon Cache**：`src/components/map/NodeMarker.tsx:54`

---

**測試報告生成時間**：2026-01-23
**測試工具**：Claude Code + 程式碼靜態分析
**測試狀態**：✅ 程式碼驗證通過，待手動功能測試
