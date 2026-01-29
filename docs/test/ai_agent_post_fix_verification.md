# Test Plan: AI Agent Post-Fix Verification

## 1. 測試目標 (Objective)
驗證 **AI SDK v6 Tool Calling 序列化修復** 是否有效，確保所有 Agent Tools 在 OpenRouter 環境下能正常運作，不再出現 `Invalid type: 'None'` 錯誤。

## 2. 測試範圍 (Scope)
- **回歸測試 (Regression)**: 針對所有已定義的工具 (`findRoute`, `getWeather`, `getStationInfo`, `searchPOI`) 進行單元/整合測試。
- **前端整合測試 (Frontend Integration)**: 在真實 Chat UI 中進行多輪對話，驗證上下文保持與工具調用流程。

## 3. 測試環境 (Environment)
- **Frontend**: Local Dev Server (`http://localhost:3000`)
- **Backend/API**: OpenRouter (`https://openrouter.ai/api/v1`)
- **Model**: `openai/gpt-4o-mini` (via OpenRouter)

## 4. 測試案例 (Test Cases)

### T1: 核心工具回歸測試 (Core Tools Regression)
驗證各種類型的 Schema 是否都能正確序列化並被 Provider 接收。

| ID | 工具 | Schema 特性 | 輸入範例 | 預期結果 |
|----|------|-------------|----------|----------|
| T1.1 | `findRoute` | 必填欄位 + 數字/字串 | "從東京到新宿" | 成功調用，返回路線資訊 |
| T1.2 | `getWeather` | 簡單物件 | "東京天氣如何" | 成功調用，返回天氣資訊 |
| T1.3 | `getStationInfo` | Enum + Optional | "查詢新宿站是否有置物櫃" | 成功調用 `infoType: 'facilities'` |
| T1.4 | `searchPOI` | 多個 Optional | "東京站附近的拉麵店" | 成功調用，`category: 'food'` |

### T2: 前端整合測試 (Frontend E2E)
驗證使用者在 UI 操作時的真實體驗。

| ID | 場景 | 步驟 | 預期結果 |
|----|------|------|----------|
| T2.1 | 簡易路線查詢 | 1. 輸入 "澀谷到原宿" | AI 顯示 "Thinking..." -> 顯示 Tool Call -> 顯示路線卡片 |
| T2.2 | 多輪對話 | 1. 輸入 "明天新宿天氣"<br>2. 輸入 "那邊有什麼好吃的" | 1. AI 回報天氣<br>2. AI 記住上下文("新宿")並調用 `searchPOI` |

## 5. 自動化測試實作計劃
將建立 Playwright 測試腳本 `e2e/agent_post_fix_verification.spec.ts`：

1. **Setup**: 使用 `useAgentChat` Hook 或模擬 API Response。
2. **Execution**:
   - 模擬使用者輸入。
   - 攔截 API Request 驗證 Schema 完整性 (二次確認)。
   - 驗證 UI 是否渲染正確的工具結果 (Route Card, Weather Info)。

## 6. 驗收標準 (Success Criteria)
- 所有 T1, T2 測試案例 Pass。
- OpenRouter API Log 或本地 Capture 中無 `invalid type: None` 錯誤。
- 工具調用參數 (Arguments) 解析正確。
