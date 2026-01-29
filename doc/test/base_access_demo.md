# Phase 1: 基礎訪問與演示模式 Test Cases

**Epic**: AI Chat / Onboarding
**Priority**: P0
**Status**: Draft

## 1. Context
驗證使用者在首次訪問系統時的基礎體驗，包含頁面載入穩定性、Onboarding 導引流程的正確性，以及如何從導覽流程順暢地進入 AI 演示模式 (Demo Mode)。

## 2. Test Scenarios

### Scenario 1: 首次訪問與 Onboarding 載入
- **Pre-condition**: 清除瀏覽器 LocalStorage 與 Cookie (模擬首次訪問)
- **Steps**:
  1. 訪問 URL `/zh-TW`
  2. 等待 DOMContentLoad
- **Expected Result**:
  - 頁面標題應包含 "LUTAGU"
  - 應自動彈出 Onboarding 視窗 (aria-labelledby="onboarding-title")
  - Onboarding 標題應顯示 "LUTAGU"

### Scenario 2: 演示模式觸發 (Overtourism)
- **Pre-condition**: 已在 Onboarding 視窗中
- **Steps**:
  1. 找到並點擊 ID 為 `overtourism` 的演示區塊
- **Expected Result**:
  - Onboarding 視窗應關閉
  - 系統狀態應轉換為 `fullscreen` (AI 聊天視窗全螢幕開啟)
  - 聊天輸入框應該被禁用 (演示模式預設行為)
  - 應自動開始播送關於「淺草寺」或相關過度旅遊問題的回應

### Scenario 3: 跳過導覽與地圖互動
- **Pre-condition**: 已在 Onboarding 視窗中
- **Steps**:
  1. 點擊「直接開始探索」(data-testid="onboarding-browse-btn")
- **Expected Result**:
  - Onboarding 視窗應關閉
  - 應能看到地圖介面
  - 檢查導覽按鈕 (`open-ai-chat`) 是否已出現在右下角 (電腦版)

### Scenario 4: 地標中心跳轉
- **Pre-condition**: 已在 Onboarding 視窗中
- **Steps**:
  1. 在「熱門轉乘站」區域點擊「東京」
- **Expected Result**:
  - Onboarding 視窗應關閉
  - 車站詳情面板 (BottomSheet) 應自動開啟
  - 標題應包含「東京」

## 3. Data Requirements
- Mock Data: 需確保 `/api/nodes/nearest` 能回傳資料 (若測試「附近車站」功能)
- Environment variables: 無特定要求

## 4. Implementation Notes
- Targeted files: `src/components/home/AppOverlays.tsx`, `src/components/home/HomeLogic.tsx`
- Playwright spec file: `e2e/base_access_demo.spec.ts`
