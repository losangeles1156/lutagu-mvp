# 樞紐站標籤顯示 - 快速測試指南

## ⚡ 快速驗證（2 分鐘）

### 1. 強制重新整理頁面
```
Mac: Cmd + Shift + R
Windows/Linux: Ctrl + Shift + R
```

### 2. 視覺檢查（無需點擊）

在預設 Zoom 級別下，您應該**立即看到**：

✅ **重要樞紐站名稱清晰可見**：
- 上野（Ueno）
- 秋葉原（Akihabara）
- 東京（Tokyo）
- 新宿（Shinjuku）
- 澀谷（Shibuya）
- 等其他藍色 M 標記的樞紐站

✅ **站名格式正確**：
```
   [M]
   上野      ← 站名標籤（白底黑字或深底白字）
   +2        ← Member count badge
```

❌ **不應該看到**：
```
   [M]
   +2        ← 只有數字，沒有站名（這是問題）
```

### 3. Zoom 測試

**低 Zoom（城市視角）**：
- 點擊 Zoom Out (-) 5-6 次
- 樞紐站應**仍然顯示站名** ✅

**中 Zoom（街區視角）**：
- 預設 Zoom 或 Zoom 13-14
- 樞紐站 + 主要站顯示站名 ✅

**高 Zoom（詳細視角）**：
- 點擊 Zoom In (+) 多次
- 所有站點顯示站名 ✅

---

## 🐛 問題排查

### 如果仍然看不到站名

#### 檢查 1：確認頁面已重新載入
```
1. 開啟瀏覽器開發者工具（F12 或 Cmd+Option+I）
2. 勾選「Disable cache」
3. 重新整理頁面（Cmd+Shift+R）
```

#### 檢查 2：確認開發伺服器已重啟
```bash
# 停止舊伺服器（若還在執行）
# 然後重新啟動
npm run dev
```

#### 檢查 3：檢查 Console 錯誤
```
1. 開啟開發者工具（F12）
2. 切換到 Console 分頁
3. 查看是否有紅色錯誤訊息
4. 若有錯誤，複製錯誤訊息以便除錯
```

#### 檢查 4：驗證節點資料
在瀏覽器 Console 中貼上以下程式碼：
```javascript
// 檢查地圖上的節點
const markers = document.querySelectorAll('.custom-node-icon');
console.log('Total markers:', markers.length);

// 檢查有標籤的節點
let withLabels = 0;
markers.forEach(m => {
  const label = m.querySelector('span');
  if (label && label.textContent) {
    console.log('Label:', label.textContent);
    withLabels++;
  }
});
console.log('Markers with labels:', withLabels);
```

---

## ✅ 成功標準

### 必須滿足
- [ ] 樞紐站（藍色 M 標記）顯示站名
- [ ] 站名使用正確語言（繁體中文/日文/英文）
- [ ] 站名與 marker 對齊
- [ ] 所有 Zoom 級別都能看到樞紐站名

### 預期體驗
- [ ] 一眼就能識別重要樞紐站
- [ ] 不需點擊就知道是哪個站
- [ ] 地圖資訊清晰，不雜亂

---

## 📸 預期視覺效果

### Before（問題）
```
地圖上只有：
[M] +2    [M] +3    [M] +5
 ↑         ↑         ↑
不知道    不知道    不知道
是哪站    是哪站    是哪站
```

### After（已修正）
```
地圖上顯示：
[M]       [M]       [M]
上野      秋葉原    東京
+2        +3        +5
 ↑         ↑         ↑
清楚      清楚      清楚
```

---

## 🚀 如果測試通過

恭喜！修正已成功。您可以：

1. **提交程式碼**
   ```bash
   git add src/components/map/NodeMarker.tsx
   git commit -m "fix(map): ensure hub station names always visible"
   git push
   ```

2. **繼續使用**
   - 地圖現在符合設計初衷
   - 樞紐站作為主要導航地標，清晰可見

3. **回饋改進**（可選）
   - 若有標籤重疊問題，可參考 `LABEL_FIX_SUMMARY.md` 的後續建議
   - 若需要調整字體大小或樣式，可進一步優化

---

## 📞 需要協助

如果測試後仍有問題，請提供：
1. 截圖（顯示問題狀態）
2. 瀏覽器 Console 錯誤訊息
3. 使用的 Zoom 級別

---

**測試指南版本**：v1.0
**最後更新**：2026-01-23
**預期測試時間**：2 分鐘
