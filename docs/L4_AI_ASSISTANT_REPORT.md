# L4 AI 助手運作與位置判斷機制調查報告

## 1. 調查結論
經測試與代碼分析，L4 功能介面的 AI 助手目前**可正常回應**。系統已建立完整的參數傳遞鏈路，能將當前節點（車站）的位置參數傳遞給後端 Agent。

---

## 2. 串接架構分析
### 2.1 串接對象
L4 AI 助手（`L4_Chat` 與 `L4_Bambi` 組件）是透過後端 API `[route.ts](/src/app/api/agent/chat/route.ts)` 串接 **Dify Agent 平台**。
*   **前端組件**：使用 `useDifyChat` Hook 管理對話狀態。
*   **後端轉發**：將請求轉發至 Dify 的 `/chat-messages` 串流端點。

### 2.2 位置參數傳遞機制
系統已實作「位置感知 (Location Awareness)」的基礎設施，參數傳遞流程如下：
1.  **Frontend**：在 `L4_Chat` 組件中，將當前節點的 `stationId` (例如 `odpt.Station:TokyoMetro.Ginza.Ueno`) 傳入 `useDifyChat`。
2.  **Hook**：`useDifyChat` 將其封裝為 `nodeId` 放在 Request Body 中發送。
3.  **Backend**：`route.ts` 接收 `nodeId` 並將其映射至 Dify 的 `inputs` 對象：
    *   `current_station`: 對應 `nodeId` (車站 ID)
    *   `station_name`: 對應車站顯示名稱 (例如「上野」)

---

## 3. 測試與運作狀況
### 3.1 回應正常性
*   **驗證結果**：✅ **正常**。AI 助手能針對通用問題提供交通、旅遊建議，並支援多語系切換與思考日誌顯示。

### 3.2 位置判斷準確性
*   **驗證結果**：⚠️ **有優化空間**。
*   **詳細分析**：雖然程式碼已成功將 `current_station` 傳給 Dify，但目前的 Dify Agent 在收到參數後，若用戶提問過於模糊（如「這裡有什麼推薦？」），Agent 有時仍會詢問用戶所在地。
*   **原因判斷**：這屬於 **Dify 側的 Prompt Engineering (提示工程) 設定問題**。Dify Agent 的系統提示詞 (System Prompt) 可能尚未被告知要優先使用 `inputs.current_station` 作為當前上下文。

---

## 4. 改善建議
1.  **強化 Dify Prompt**：在 Dify 平台的系統提示詞中加入指令：「*如果用戶詢問關於『這裡』或『目前位置』的問題，請參考 inputs.current_station 與 inputs.station_name 提供資訊。*」
2.  **自動化語境注入**：若 Dify 側不便修改，可考慮在 `route.ts` 中，當 `nodeId` 存在時，於用戶問題前自動注入隱形語境（例如：`[目前位置：上野站] 用戶提問：這裡有什麼好吃的？`）。

---
**調查日期**：2026-01-10
**狀態**：功能已接通，位置感知需 Dify 側優化。
