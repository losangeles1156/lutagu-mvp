# PLAN: Phase 13 擴充 - 極致離線與網頁韌性 (Web Resilience)

**Goal**: 針對「掃碼即用 (Scan & Go)」的場景，打造**不需安裝**但在斷網環境（如地鐵隧道）仍能順暢使用的網頁體驗。

> **Strategic Pivot**: 根據 MVP 需求，移除所有「引導安裝」、「主畫面圖示」等增加摩擦力的功能。專注於**隱形預載 (Silent Prefetch)** 與 **瞬間加載 (Instant Load)**。

---

## 🛑 Revised Strategy: Zero-Friction Offline

### 1. 核心概念：隱形預載 (Silent Prefetching)
當用戶透過 QR Code 打開網頁時，Service Worker 在背景**靜默下載**關鍵數據。
- **目的**: 用戶在地面 (有點) 掃碼，進入地下 (無網) 後，網頁依然能操作、查看車站詳情。
- **範圍**: 
    - 僅預載 **Tier 1 (超級樞紐)** 與 **Tier 2 (主要樞紐)** 的車站 DNA 與地圖拓撲。
    - **不強迫安裝**，不彈出 "Add to Home Screen"。

### 2. 離線體驗 (Resilient UI)
- **無網狀態**: 不顯示 "You are offline" 錯誤頁面，而是繼續顯示地圖與已快取的車站資訊。
- **未快取區域**: 若用戶點擊未快取的小站 (Tier 3-5)，則顯示優雅的「訊號微弱，僅顯示基礎資訊」提示，而非瀏覽器恐龍圖。

---

## Proposed Technical Changes

### 1. 智慧預載機制 (Smart Prefetch)
- **[NEW] `OfflineDataManager.ts`**: 
    - 在應用啟動 (`useEffect`) 後 5 秒，背景觸發 T1/T2 數據抓取。
    - 使用 `window.caches` API 存儲 JSON Response，不依賴瀏覽器快取策略。

### 2. Service Worker 調整 (Resilience Only)
- **[MODIFY] `next.config.js`**:
    - 移除 `register: true` 的強制設定（視情況改為手動註冊以控制時機）。
    - 確保 `routing_graph.json` 優先進入快取。

### 3. 用戶狀態感知
- **[NEW] `useNetworkStatus` Hook**: 
    - 僅在「嘗試獲取未快取數據失敗」時才提示離線，平時保持靜默。

---

## Verification Plan

### Manual Verification
1.  **隧道模擬測試**: 
    - 打開網頁 -> 等待 5 秒 -> 開啟飛航模式。
    - 點擊「新宿」、「上野」：**應正常顯示詳情**。
    - 點擊「某個偏僻小站」：**應顯示優雅降級 UI**。
2.  **無干擾測試**: 確保全程**沒有**彈出任何「安裝應用程式」的提示。
