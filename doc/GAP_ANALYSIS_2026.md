# LUTAGU 2026 MaaS 1.0 產品理念與實現落差分析報告 (V2 - 技術深度版)

**文件日期**: 2026-01-24
**分析核心**: 針對「數據缺失」與「AI 學習機制斷鏈」的具體技術檢證

---

## 1. 核心大數據落差：即使有 ODPT，我們仍缺什麼？

目前系統雖已串接 ODPT (Open Data Public Transportation) API，但這僅提供了城市的「骨架」，缺乏支撐「判斷代行」所需的「血肉」。

### 1.1 缺失的 L3 空間拓撲數據 (The Missing L3 Topology)
*   **現狀**：ODPT 數據僅將車站視為一個「點 (Node)」。
*   **缺失細節**：現實中的車站是一個「立體迷宮」。目前系統**完全缺失**以下結構化數據：
    *   **站內路徑權重 (Intra-station Graph)**：從「山手線月台」到「京葉線月台」的實際距離是 500 米還是 50 米？目前的 Rust 路由引擎 (`l4-routing-rs`) 無此數據，導致無法計算真實轉乘痛苦指數 (TPI)。
    *   **垂直移動阻力 (Vertical Resistance)**：系統不知道「大江戶線六本木站」到地面需要搭 3 次長扶梯。這導致 AI 無法為攜帶嬰兒車的用戶做出正確的「避開」建議。
    *   **設施拓撲連通性**：知道「有電梯」與知道「電梯位於南口且直通改札口」是兩回事。目前的 `ACCESSIBILITY_GUIDE` 只是文字描述，機器無法讀懂並用於路徑規劃。

### 1.2 向量數據庫的「空殼」問題 (The "Hollow" Vector DB)
*   **檢證發現**：經檢查 `services/vector-search-rs/src/main.rs`，發現該服務在每次啟動時執行 `delete_collection`，這意味著它目前**不具備持久化記憶**。
*   **斷鏈事實**：主應用程式 (`src/`) 目前**沒有任何一行程式碼**呼叫此向量檢索服務。
*   **結論**：目前的「AI 知識庫」實際上是**依賴 LLM 的內部常識 (Hallucination)** 加上 `expertKnowledgeBase.ts` 的**硬編碼規則**。這導致系統無法動態利用新知識，也無法透過 RAG (Retrieval-Augmented Generation) 來修正 LLM 的錯誤幻覺。

---

## 2. 學習機制落差：為什麼「情境化學習」目前無法發生？

使用者提到的「需要用戶開始使用後才能訓練」，在目前的架構下**即使有用戶也無法訓練**，因為缺乏「回饋閉環 (Feedback Loop)」。

### 2.1 單向的信號收集 (Write-Only Memory)
*   **檢證發現**：`SignalCollector.ts` 雖然會將用戶的 Unmet Needs (例如：搜尋了某個冷門地點卻無結果) 寫入 Supabase 的 `demand_signals` 表。
*   **缺失機制**：
    *   **無權重調整機制**：沒有自動化腳本分析這些 Log 來調整 `routing_graph.json` 中的邊權重 (Edge Weight)。
    *   **無知識庫更新機制**：AI 發現自己答不出來的問題，目前只能躺在資料庫裡，沒有機制會自動觸發「網路爬蟲」去抓取解答並更新到向量庫。

### 2.2 冷啟動困境 (Cold Start Problem)
*   **現狀**：依賴用戶數據來訓練是「後見之明」。對於 2026 MaaS 1.0 發布初期，AI 若表現得像個白痴，用戶就會流失，根本搜集不到數據。
*   **必要補強**：不能等待用戶數據。必須先導入**「合成數據 (Synthetic Data)」**（模擬數萬次虛擬用戶在東京移動）與**「專家經驗預訓練」**（將旅遊書、部落格攻略轉化為向量），讓 AI 在見到第一位真實用戶前，就已經具備 L3 等級的判斷力。

### 2.3 路由引擎的「去個人化」 (Depersonalized Routing)
*   **技術落差**：Rust 寫的 `fetchL4Routes` 介面目前只接受 `(origin, dest)`。
*   **學習斷層**：即便前端收集了用戶偏好（如：`preference_weight: { speed: 0.2, comfort: 0.8 }`），這些權重**根本沒有傳遞給後端路由演算法**。
*   **結果**：AI 無法根據用戶的歷史選擇來「學習」推薦策略，因為底層的路徑計算邏輯是固定不變的。

---

## 3. 具體改進路徑圖 (Remediation Roadmap)

為了填補上述落差，建議優先執行以下技術修正：

1.  **L3 數據補完計畫**：
    *   不需等待官方數據，啟動「合成拓撲計畫」。利用 LLM 閱讀車站平面圖，轉譯為 `Graph Node (Exit A1) -> Edge (Walk 3min) -> Node (Platform)` 的簡易 JSON 結構。
2.  **激活向量大腦**：
    *   移除 `vector-search-rs` 的啟動清除邏輯，改為持久化存儲 (Qdrant/Milvus)。
    *   在 `HybridEngine.ts` 中實作真實的 `searchVectorDB()` 呼叫，取代現有的靜態規則。
3.  **建立閉環學習系統**：
    *   實作 `FeedbackLooper`：定時 (Cron Job) 分析 `demand_signals`，若某站點頻繁出現「找不到出口」的信號，自動生成工單或觸發爬蟲補充該站點資訊。
4.  **路由參數化**：
    *   重構 Rust API，使其接受 `UserProfile` 參數，讓演算法能根據用戶偏好動態調整 Edge Cost (例如：對老人來說，樓梯的 Cost * 10)。
