# Main Chat Panel Test Cases

**Epic**: AI Chat
**Priority**: P0
**Status**: Draft

## 1. Context
驗證 `ChatPanel` 組件的核心功能與互動流程。主對話面板是用戶與 AI Agent 溝通的核心入口，需確保從首次開啟（空狀態）、示範引導、到正式對話的過程，UI 狀態切換與資料呈現皆符合預期。

## 2. Test Scenarios

### Scenario 1: Empty State & Quick Questions [P0]
- **Pre-condition**: 用戶首次進入網頁並展開對話面板
- **Steps**:
  1. 訪問 `/` 並點擊 AI 指導按鈕開啟面板
  2. 檢查 `EmptyState` 畫面是否顯示（標題、描述、建議標籤）
  3. 點擊其中一個「建議問題」按鈕（如：運行狀態）
- **Expected Result**:
  - `EmptyState` 元素應正確渲染
  - 點擊按鈕後，該問題應出現在對話框中並自動送出
  - AI 應開始回應，且歡迎畫面應消失

### Scenario 2: Multi-Round Demo Mode (Overtourism) [P0]
- **Pre-condition**: 進入 Demo Mode 並啟動 "overtourism" 腳本
- **Steps**:
  1. 透過 UI 狀態觸發 `isDemoMode` 為 true 且 `activeDemoId` 為 "overtourism"
  2. 觀察自動播放過程
- **Expected Result**:
  - 訊息氣泡應按腳本順序出現（一輪對話：User -> Assistant）
  - 應包含多輪互動內容
  - 最後一輪結束後應出現對應的 `ActionCard`（導航至根津神社）
  - 示範播放期間輸入框應為禁用狀態

### Scenario 3: Input Validation & Messaging [P0]
- **Pre-condition**: 對話面板已開啟
- **Steps**:
  1. 嘗試發送空白字串或僅含空格的字串
  2. 檢查發送按鈕狀態
  3. 輸入超過 500 個字符
  4. 發送一則正常訊息
- **Expected Result**:
  - 空白訊息時發送按鈕應為 `disabled`
  - 輸入框應有 `maxLength="500"` 限制
  - 送出訊息後，輸入框應清空，且 Loading 圖標應出現

### Scenario 4: Markdown Rendering & Formatting [P1]
- **Pre-condition**: AI 回傳包含 Markdown 格式的內容
- **Steps**:
  1. 攔截 `/api/agent/v2` 並回傳帶有加粗、列表、程式碼塊的內容
- **Expected Result**:
  - 加粗文字應以 `<strong>` 或對應樣式渲染
  - 列表應正確排列
  - URL 連結應可點擊

### Scenario 5: Feedback System [P1]
- **Pre-condition**: AI 已完成一段回應
- **Steps**:
  1. 點擊對話氣泡下方的「好評」或「負評」圖標
- **Expected Result**:
  - 應觸發 `/api/feedback` POST 請求
  - 成功後應顯示 Toast 通知 "Feedback sent!"

### Scenario 6: Auto-scroll & Loading Indicators [P1]
- **Pre-condition**: 對話內容長度超過面板高度
- **Steps**:
  1. 發送多則訊息或產生長回應
  2. 檢查 `ThinkingBubble` 與 `SkeletonMessageBubble` 是否顯示
- **Expected Result**:
  - 視圖應當自動滾動到底部以顯示最新訊息
  - 在串流回應開始前應顯示 `SkeletonMessageBubble`
  - 若包含思考過程，應顯示 `ThinkingBubble`

## 3. Data Requirements
- **Mock Service**: 使用 Playwright `route` 攔截 `/api/agent/v2`
- **Performance Threshold**: 回應首字時間 (TTFT) 應小於 2s

## 4. Implementation Notes
- 目標組件：`src/components/chat/ChatPanel.tsx`
- Playwright 測試文件：`e2e/main_chat_panel.spec.ts`
- 核心 Selector：`input[data-testid="chat-input"]`, `[data-testid="chat-message-text"]`
