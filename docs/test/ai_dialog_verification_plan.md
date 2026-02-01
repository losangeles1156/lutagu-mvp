# AI 對話系統驗證計畫 (AI Dialog System Verification Plan)

## 1. 測試目標 (Objectives)
本計畫旨在驗證 AI 對話系統是否能滿足以下關鍵需求：
1.  **動態與靜態數據處理**：系統能否區分並有效處理即時交通數據（動態）與一般資訊（靜態），並在 UI 上給予適當的回饋（如延遲等待時的狀態）。
2.  **回應品質與準確度**：驗證 `FactChecker` 機制是否能攔截已知的交通幻覺（如羽田直達東京車站）。
3.  **用戶問題解答能力**：確認基本問答流程順暢。

## 2. 測試範圍 (Scope)
- **Service**: `services/chat-api`
- **Modules**: `llmClient.ts` (模型路由), `FactChecker.ts` (事實查核)
- **UI**: 前端聊天介面 (Playwright E2E)

## 3. 測試方法與實作 (Referenced Workflow: @[/gen_test_cases])

### Method 1: 準確度驗證 (Accuracy Verification)
針對 `FactChecker.ts` 建立專門的測試腳本，驗證其對「幻覺聲稱」的攔截能力。
- **Action**: 建立 `scripts/verify_fact_checker.ts`
- **Test Cases**:
    - [x] Input: "羽田機場直達東京車站" -> Expect: `hasHallucination: true`, Correction provided.
    - [x] Input: "東京塔在哪裡" -> Expect: `hasHallucination: false`.
    - [x] Input: "京急線去東京車站" -> Expect: `hasHallucination: true` (if claiming direct).

### Method 2: 響應時間與 UX 驗證 (Latency & UX Verification)
使用 Playwright 模擬不同類型的資料請求，驗證 UI 對於「快回應（靜態）」與「慢回應（動態）」的處理表現。
- **Action**: 建立/更新 `e2e/ai_chat_workflow.spec.ts`
- **Test Cases**:
    - [x] **靜態資訊情境**：模擬 500ms 回應。驗證：訊息快速顯示。
    - [x] **動態數據情境**：模擬 4000ms 回應。驗證：UI 應保持 loading 狀態或顯示 "Thinking..."，且不應 timeout。
    - [x] **錯誤復原**：模擬網路中斷或 API 錯誤。

### Method 3: 真實串接驗證 (Real-world Integration Check)
(Optional) 若環境變數允許，執行一次真實請求以記錄實際 API 延遲。

## 4. 驗證報告 (Reporting)
測試完成後，將產出 `docs/test/ai_verification_final_report.md`，包含：
- 測試執行結果摘要。
- 靜態 vs 動態數據的響應時間對比數據。
- 事實查核的通過率。
- 綜合評估與優化建議。

## 5. 執行步驟 (Execution Steps)
1. 建立 `scripts/verify_fact_checker.ts` 並執行。
2. 建立 `e2e/ai_chat_workflow.spec.ts` 並執行 Playwright 測試。
3. 彙整數據，撰寫報告。
