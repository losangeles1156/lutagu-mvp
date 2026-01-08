# 前端 UI/UX 改進計劃

> 基於 2026-01-07 用戶體驗審查報告

## 優先級矩陣

| 優先級 | 數量 | 說明 |
|--------|------|------|
| Critical | 1 | 系統崩潰風險，需要立即修復 |
| High | 4 | 核心功能障礙，影響用戶體驗 |
| Medium | 7 | 體驗優化，建議近期完成 |
| Low | 4 | 未來改進，可排入待辦 |

---

## Critical 問題

### C1: SystemMenu.tsx getSupabase() 缺少錯誤處理

**位置**: `src/components/ui/SystemMenu.tsx:47`

**問題**: `getSupabase()` 可能拋出異常，導致元件崩潰

**修正方案**:
```tsx
// 修正後 - 使用 useMemo 保持專案一致性（與 page.tsx:55-57, SubscriptionModal.tsx:28-34 一致）
const supabase = useMemo<SupabaseClient | null>(() => {
    try {
        return getSupabase();
    } catch {
        return null;
    }
}, []);

useEffect(() => {
    if (!supabase) return;
    // ... 載入 session
}, [supabase]);
```

**理由**:
- useMemo 模式已在專案中使用，保持一致性
- 避免 useEffect 內部的 try-catch 嵌套
- 可被多個 useEffect 共用

**影響範圍**: 用戶無法載入頁面時完全崩潰

**預估工時**: 0.5 小時

---

## High 優先級問題

### H1: AI 回應打字動畫效果

**位置**: `src/components/chat/ChatPanel.tsx`

**問題**: SSE 串流時沒有視覺回饋，用戶不知道 AI 正在回應

**修正方案**:
```tsx
interface StreamState {
    isStreaming: boolean;
    partialContent: string;
    thinkingPhase: 'connecting' | 'thinking' | 'writing' | 'done';
}

// 在 ChatPanel 中渲染
{msg.isLoading && (
    <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400">
            {thinkingPhase === 'thinking' ? '思考中...' : '輸入中...'}
        </span>
        <span className="animate-pulse">▌</span>
    </div>
)}
```

**實現細節**:
- 添加打字機動畫效果
- 顯示「思考中...」或「輸入中...」狀態
- 模擬逐字顯示效果 (typewriter effect)

**預估工時**: 3 小時

### H2: 為互動元件添加 aria-label

**位置**: 多處檔案

**問題**: 許多按鈕缺少無障礙標籤

**受影響元件**:
| 檔案 | 元件 | 數量 |
|------|------|------|
| `src/components/node/NodeTabs.tsx` | Tab 按鈕 | 4 |
| `src/components/map/MapContainer.tsx` | GPS/區域選擇按鈕 | 2+ |
| `src/app/[locale]/page.tsx` | 底部導航按鈕 | 3+1 |
| `src/components/map/WardSelector.tsx` | Ward 按鈕 | 1 |
| `src/components/chat/IntentSelector.tsx` | 意圖按鈕 | 6 |
| `src/components/chat/ContextSelector.tsx` | 情境按鈕 | 4 |

**修正方案**:
- 為每個互動元件添加 `aria-label`
- 使用翻譯鍵而非硬編碼文字
- 同時處理 Focus 樣式不明顯的問題

**預估工時**: 3 小時

### H3: ErrorBoundary 添加重試按鈕

**位置**: `src/components/error/ErrorBoundary.tsx`, `src/components/common/ErrorBoundary.tsx`

**問題**: 內部 ErrorBoundary 缺少「重試」按鈕

**注意**: 專案有兩個 ErrorBoundary：
- `src/components/ui/ErrorBoundary.tsx` - 全域（已有重試）
- `src/components/common/ErrorBoundary.tsx` - Tab 層級（缺少重試）

**修正方案**:
- 統一為一個檔案，或確保兩者行為一致
- 添加重試按鈕
- 提供錯誤詳細資訊
- 支援自定義重試動作

**預估工時**: 1.5 小時

### H4: 地圖無障礙描述

**位置**: `src/components/map/MapContainer.tsx`

**問題**: Leaflet 地圖缺少 screen reader 可讀的描述

**修正方案**:
- 添加 `aria-label="東京交通地圖，顯示車站和路線"`
- 為 marker 添加 `alt` 文字
- 考慮添加跳過地圖的快捷鍵

**預估工時**: 1 小時

---

## Medium 優先級問題

### M1: NodeTabs Tab 標籤 i18n 化

**位置**: `src/components/node/NodeTabs.tsx:133-137`

**問題**: `lutagu` tab 的 label 硬編碼

**修正方案**:
- 新增翻譯鍵
- 更新翻譯檔案

**預估工時**: 0.5 小時

### M2: Chat 輸入框字數限制

**位置**: `src/components/chat/ChatPanel.tsx:597-606`

**問題**: 無法阻止過長輸入

**修正方案**:
- 添加 `maxLength` 屬性
- 顯示剩餘字數
- 輸入時即時驗證

**預估工時**: 1 小時

### M3: SubscriptionModal 即時表單驗證

**位置**: `src/components/guard/SubscriptionModal.tsx`

**問題**: 表單驗證僅在提交時

**修正方案**:
- 添加即時驗證
- 行內錯誤提示
- 禁用提交按鈕直到驗證通過

**預估工時**: 2 小時

### M4: L1 Places 載入骨架屏

**位置**: `src/components/node/L1_DNA.tsx:68`

**問題**: `placesLoading` 狀態未渲染任何 UI

**修正方案**:
- 添加骨架屏元件
- 佔位動畫
- 載入完成後淡入

**預估工時**: 1.5 小時

### M5: MainLayout 分隔線觸控支援

**位置**: `src/components/layout/MainLayout.tsx:65-100`

**問題**: 只有 mousedown，缺少 touchstart

**修正方案**:
- 添加 touch 事件支援
- 統一路由邏輯
- 防止滾動衝突

**預估工時**: 1 小時

### M6: 離線狀態 UI

**位置**: 全域

**問題**: 缺少統一的離線狀態 UI

**修正方案**:
- 建立 OfflineBanner 元件
- 監聽 navigator.onLine 狀態
- 提供重連選項

**預估工時**: 1.5 小時

### M7: 硬編碼文字 i18n 化

**位置**: SubscriptionModal.tsx, 多處

**問題**: 部分中文未翻譯 (如 "处理中…"、"订阅失败")

**修正方案**:
- 識別所有硬編碼文字
- 新增翻譯鍵
- 更新翻譯檔案

**預估工時**: 2 小時

### M8: 顏色對比度修復

**問題**: text-slate-400 對比度約 3.5:1，未達 WCAG AA

**修正方案**:
- 將 text-slate-400 改為 text-slate-500 或更高對比度
- 檢查所有輔助文字的色彩對比

**預估工時**: 1 小時

---

## Low 優先級問題

### L1: Onboarding 跳過確認對話框

**位置**: `src/app/[locale]/page.tsx:209`

**問題**: 首次關閉 Onboarding 應詢問是否確認跳過

### L2: 深層連結 URL 參數支援

**位置**: `src/app/[locale]/page.tsx:62-75`

**問題**: 缺少對 L1-L4 Tab 切換的 URL 參數支援

### L3: Feedback 按鈕確認 Toast

**位置**: `src/components/chat/ChatPanel.tsx:556-578`

**問題**: 點擊後應有 toast 確認

### L4: 地圖節點為 0 時的說明文字

**位置**: `src/components/map/MapContainer.tsx`

**問題**: 只有 spinner，無說明文字

---

## 執行順序建議

### 第一天 (4.5h) - Critical + High

1. **C1**: SystemMenu.tsx 錯誤處理 (0.5h) ✅ 先確保頁面可載入
2. **H3**: ErrorBoundary 重試按鈕 (1h)
3. **H2**: 為互動元件添加 aria-label (3h)

### 第二天 (5h) - High + Medium

4. **M1**: NodeTabs i18n (0.5h) ← 移前，簡單快速
5. **H1**: AI 回應打字動畫 (3h)
6. **M2**: Chat 輸入框字數限制 (1.5h)

### 第三天 (5.5h) - Medium

7. **M4**: L1 Places 骨架屏 (1.5h)
8. **M3**: SubscriptionModal 即時驗證 (2h)
9. **M5**: MainLayout 觸控支援 (1h)
10. **H4**: 地圖無障礙描述 (1h)

### 第四天 (4.5h) - Medium

11. **M6**: 離線狀態 UI (2h)
12. **M7**: 硬編碼文字 i18n (2h)
13. **M8**: 顏色對比度修復 (1h) ← 新增

### Buffer / Low 項目

- L1: Onboarding 跳過確認對話框
- L2: 深層連結 URL 參數支援
- L3: Feedback 按鈕確認 Toast
- L4: 地圖節點為 0 時的說明文字

---

## 驗收標準

1. 所有 Critical 問題已修復
2. Lighthouse Accessibility 分數 ≥ 90
3. 觸控目標符合 WCAG 44x44px 規範
4. 所有文字已國際化
5. 載入狀態有明確視覺回饋
6. 所有 `getSupabase()` 調用已包裝 try-catch
7. 手機和平板觸控分隔線正常
8. 網路斷線時顯示離線 Banner
9. 無控制台錯誤 (console.error)
10. SSE 串流時有視覺回饋

---

## 相關檔案

- 原始審查報告: `docs/l1_display_verification_report_v2.md`
- 翻譯檔案: `messages/*.json`
- 設計規範: `06_UI_SPEC.md`
