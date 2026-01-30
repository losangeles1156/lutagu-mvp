# LUTAGU MVP 技術優化方案與實施計畫 (Rev 2 - 2026-01-30)

> **版本修正說明**:
> 本計畫已根據用戶反饋進行戰略重構。優先級從「商業上線準備」轉向**「基礎功能修復」與「語言優勢架構最大化」**。
> *   **AI Gateway**: 修正為 **OpenRouter (主)** + Zeabur (備)，以支援 Function Calling。
> *   **Embedding**: 鎖定 **Voyage-4**，移除多餘模型，發揮 MoE 架構優勢。
> *   **架構策略**: 強化 **Go (Agent Orchestration)** 與 **Rust (Compute Services)** 的微服務分工。
> *   **時程**: 推遲商業化功能，優先解決 AI 對話與前端顯示異常。

---

## 1. 執行摘要 (Executive Summary)

目前的系統現狀是**「核心交互受損」**——AI 對話無法有效執行工具調用 (Function Calling)，且前端地圖與資訊顯示存在異常。在此基礎上談論商業化是不切實際的。

本計畫重新定義了優化方向，核心在於**「回歸微服務設計初衷」**：讓 Go 語言發揮高併發優勢處理 Agent 調度，讓 Rust 發揮計算優勢處理數據與路由，Next.js 則回歸純粹的 UI 呈現。

---

## 2. 關鍵問題與修正方向

### 🚨 P0: AI 核心功能修復 (AI Core Restoration)
*   **問題**: 目前的 AI 對話無法正常運作，主因是與模型的 Function Calling 協議匹配失效，以及 Vercel Serverless 的執行環境限制。
*   **修正**:
    *   **Gateway**: 確認 **OpenRouter** 為 Default Gateway，因其對 Function Calling 的支援最完整。Zeabur 僅作為 fallback 或處理無工具調用的簡單對話。
    *   **Orchestration**: 目前過度依賴 Next.js API Route 處理 Agent 循環。應將此邏輯**下沉至 Go (`adk-agent`)**，利用 Go 的 Goroutines 處理長連接與複雜的工具調度迴圈 (ReAct Loop)。

### � P0: 前端異常與數據流修復 (Frontend/Data Integrity)
*   **問題**: 前端資訊顯示異常（如時刻表空白、票價錯誤），顯示資料在 ETL 或 API 轉換層存在斷裂。
*   **修正**:
    *   **Data Pipeline**: 檢視 **Rust (`etl-pipeline-rs`)** 到前端的資料路徑。確保 Rust 服務輸出的資料結構與前端組件 (Zustand Stores) 的預期完全一致，減少中間層的邏輯干擾。

### 🔧 P1: Embedding 架構簡化 (Vector Search Optimization)
*   **問題**: 混合多個 Embedding 模型與複雜的 Padding 邏輯導致效能與精度雙輸。
*   **修正**:
    *   **Model**: 統一使用 **Voyage-4**。
    *   **Implementation**: 在 **Rust (`vector-search-rs`)** 中實作針對 Voyage 模型的最佳化，利用其檢索增強特性，移除相容性程式碼。

### 🚀 P2: 微服務架構效能最大化 (Performance via Microservices)
*   **問題**: 部分計算邏輯可能殘留在 Node.js 層，未充分利用 Rust/Go。
*   **修正**:
    *   **Routing**: 確保所有路線計算請求直通 **Rust (`l4-routing-rs`)**。
    *   **Concurrency**: 所有即時狀態推送 (SSE/WebSocket) 由 **Go** 服務接手。

---

## 3. 優化方案詳解

### [Solution 1] 重構 AI 交互層：Go Agent Orchestrator
*   **架構變更**: Next.js (UI) <--> **Go `adk-agent`** <--> OpenRouter
*   **實作重點**:
    *   **移轉邏輯**: 將目前的 Agent Tool Calling 邏輯從 TypeScript 遷移/強化至 Go 服務。
    *   **OpenRouter 整合**: 在 Go 層實作對 OpenRouter API 的完整支援，確保 `tools` 參數正確傳遞。
    *   **狀態管理**: 利用 Go 處理對話上下文 (Context) 的維持，避免 Vercel 端的 Stateless 限制導致對話中斷。
    *   **優勢**: 發揮 Go 語言在由 I/O 密集型任務 (API Proxy, Streaming) 的原生優勢。

### [Solution 2] 數據流直通車：Rust-Powered Data Services
*   **架構變更**: Next.js (UI) <--> **Rust Backend** (gRPC/REST)
*   **實作重點**:
    *   **ETL 驗證**: 檢查 `etl-pipeline-rs` 對於 ODPT 資料的處理邏輯，確保 null/empty 值被正確過濾。
    *   **Schema 強制**: 前端 TypeScript Type 定義必須由 Rust 的 Struct 自動生成 (TypeGen) 或嚴格對齊，消除顯示異常。
    *   **L4 Engine**: 路線規劃請求直接由 `l4-routing-rs` 處理，Node.js 層不應介入計算，僅做轉發。

### [Solution 3] Embedding 系統重構：Voyage-4 & MoE
*   **配置**: 僅使用 Voyage-4 模型。
*   **實作重點**:
    *   **Rust `vector-search-rs`**: 更新 Qdrant Client 設定，適配 Voyage-4 的維度與特性。
    *   **MoE 嵌入空間**: 若 Voyage 提供特定領域的優化 (Domain-specific embedding) 或共享嵌入空間特性，在 Rust 層實作相應的查詢路由。
    *   **清理**: 移除所有 Gemini Text Embedding 相關的 fallback 與 padding 程式碼。

### [Solution 4] 分散式快取 (Redis)
*   **定位**: 作為 Go 微服務與 Rust 微服務之間的**高速資料交換層**。
*   **實作**:
    *   Go Agent 將對話狀態存入 Redis。
    *   Rust 服務將計算熱點 (Hot Routes) 存入 Redis。
    *   Next.js 僅從 Redis 讀取快取結果，不進行寫入回填 (Write-back)，職責單純化。

---

## 4. 實施路徑 (4-Week Repair Roadmap)

### 📅 Week 1: 止血與修復 (Fix the Basics)
*核心目標：讓 AI 能說話，讓畫面有資料*
*   [P0] **AI Gateway 切換**: 將 AI 請求全面導向 OpenRouter，並在 Go Agent 層驗證 Function Calling (e.g., 查詢天氣、路線) 是否成功觸發。
*   [P0] **前端 bug 排除**: 追蹤 `station_stats` 與 `timetable` 的資料流，修復 Rust ETL 輸出的 JSON 格式問題。

### 📅 Week 2: 微服務架構落實 (Microservice Enforcement)
*核心目標：各司其職 (Go for Agent, Rust for Compute)*
*   [P1] **Go Agent 強化**: 將對話狀態管理完全移交給 `adk-agent`，Next.js 僅負責渲染 Stream。
*   [P1] **Voyage-4 整合**: 重建 Qdrant Index，全面切換至 Voyage-4 Embedding。

### 📅 Week 3: 效能與快取 (Performance & Caching)
*核心目標：引入 Redis 串聯服務*
*   [P2] **Redis 整合**: 在 Go 與 Rust 服務中引入 Redis client，實作跨語言的狀態共享。
*   [P2] **Web Vitals 優化**: 基於正確的資料流，進行 LCP/Lighthouse 的前端優化。

### 📅 Week 4: 壓力測試與準備 (Stability & Pre-Commercial)
*核心目標：確認系統穩定*
*   [P2] **整合測試**: 測試 "前端 -> Go Agent -> OpenRouter -> Go Agent -> Rust Service" 的完整調用鏈路。
*   [P3] **商業化評估**: 在系統修復完成後，重新評估商業功能的接入點 (此時再考慮支付與深度連結)。

---

## 5. 結論

本次優化方案的核心在於**「承認現狀，回歸基礎」**。透過將邏輯下沉至 Go (調度) 與 Rust (計算)，我們不僅能解決當前的功能異常，更能建立一個真正具備擴展性的微服務架構，為未來的商業化打下堅實的地基。
