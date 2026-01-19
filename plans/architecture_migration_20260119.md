# LUTAGU MVP 架構盤點與遷移計畫 (Architecture Inventory & Migration Plan)
**日期**: 2026-01-19
**狀態**: 規劃中 (Planning)
**版本**: v1.1 (含 Cloudflare 整合分析)

本文件盤點了截至 2026 年 1 月的專案架構狀態，並概述了將 AI 計算層遷移至獨立容器服務的計畫。

## 1. 現有架構盤點 (Current Architecture Inventory)

### 1.1 核心應用 (Core Application)
*   **名稱**: Lutagu MVP Core
*   **路徑**: 專案根目錄 (`/`)
*   **技術堆疊**:
    *   **Framework**: Next.js 14 (App Router)
    *   **Language**: TypeScript
    *   **UI**: Tailwind CSS, Radix UI, Framer Motion
    *   **Maps**: React Leaflet (OpenStreetMap)
*   **部署環境**: **Vercel** (Serverless Function / Edge)
*   **主要職責**:
    *   前端使用者介面渲染 (UI/UX)。
    *   **L1 (靜態資訊)**: 查詢車站基本資料、周邊設施。
    *   **L2 (即時資訊)**: 串接 ODPT API 顯示列車位置與天氣。
    *   **L3 (設施狀態)**: 顯示廁所、電梯、置物櫃狀態。
    *   **BFF (Backend-for-Frontend)**: 作為前端與資料庫/外部 API 的中介。

### 1.2 資料層 (Data Layer)
*   **資料庫**: **Supabase** (Managed PostgreSQL)
    *   **核心資料**: `nodes` (車站節點), `facilities` (設施), `users` (使用者)。
    *   **擴充功能**:
        *   `postgis`: 空間地理運算 (如距離排序、範圍查詢)。
        *   `pgvector`: 向量資料儲存 (RAG 知識庫)。
    *   **關鍵優化**:
        *   RPC `get_nearby_accessibility_graph`: 優化 KNN 空間查詢效能。
*   **快取 (Cache)**:
    *   **Redis**: 目前程式碼中包含 `ioredis`，用於 Session Store 與 Rate Limiting (主要在 Chat API 中使用)。

### 1.3 AI 微服務 (AI Chat Microservice)
*   **名稱**: Chat API Service
*   **路徑**: `services/chat-api/`
*   **技術堆疊**:
    *   **Runtime**: Node.js 20
    *   **Framework**: Express.js
    *   **AI SDK**: Vercel AI SDK, LangChain (部分)
*   **狀態**: **已容器化 (Dockerized)**
    *   包含獨立 `package.json`, `tsconfig.json`。
    *   `Dockerfile` 支援 Multi-stage builds (Builder -> Runner)。
    *   `build.sh` 支援 Google Cloud Run 部署。
*   **主要職責**:
    *   **L4 (專家策略)**: 執行 HybridEngine，結合 RAG 與規則引擎提供轉乘建議。
    *   **L5 (防災決策)**: 處理長上下文的防災避難邏輯 (Evacuation Plan)。
    *   **Agent 託管**: 處理需要長連線或超過 60 秒運算的 AI 任務。

---

## 2. 基礎設施遷移計畫 (Infrastructure Migration Plan)

為了提升效能、解決 Vercel Timeout 限制並優化成本，規劃將 `services/chat-api` 遷移至專用容器平台。在此版本中，我們加入了 **Cloudflare** 作為關鍵的網關層考量。

### 2.1 遷移目標選項比較

針對「成本」與「效率」的平衡，我們對主流方案進行綜合評估。

| 特性 | **Google Cloud Run (GCP)** | **Zeabur** | **Cloudflare Workers** |
| :--- | :--- | :--- | :--- |
| **部署模式** | Container (Serverless) | Container (PaaS) | Edge Function (V8 Isolate) |
| **擴展性** | 極高 (0 to N) | 高 | 極高 (Global Edge) |
| **冷啟動** | 有 (可透過 Min Instances 優化) | 無 (Always on) / 有 (Serverless) | 極快 (< 10ms) |
| **成本模型** | 按 CPU/記憶體使用時間計費 | 訂閱制 / 資源用量 | 請求次數 / CPU 時間 (極低廉) |
| **代碼相容性** | **高 (原生 Docker)** | **高 (原生 Docker)** | **低 (需重寫 Express -> Hono)** |
| **適用場景** | **高彈性/間歇性流量** | **穩定流量/快速開發** | **極致效能/輕量邏輯** |

### 2.2 Cloudflare 技術適配性分析
*   **優勢 (Pros)**: Cloudflare Workers 擁有最低的延遲與成本。
*   **阻礙 (Cons)**:
    *   `services/chat-api` 使用 **Express.js**，這與 Workers Runtime 不完全相容，需要重構為 Hono 或標準 Fetch API。
    *   目前使用的 `ioredis` 依賴 TCP Socket，雖然 Workers 新版支援 `connect()`，但遷移有潛在的不穩定風險 (建議改用 Upstash REST API)。
*   **結論**: 短期內將整個 Chat API 遷移至 Cloudflare Workers 成本過高 (需重寫)，不建議作為第一階段目標。即使如此，Cloudflare 的 **Gateway/CDN** 功能仍是不可或缺的。

### 2.3 最佳平衡配置建議 (Recommended Balanced Architecture)

綜合考量遷移風險、成本與效能，建議採用 **Cloudflare + GCP Cloud Run** 的混合架構：

```
┌─────────────────────────────┐
│   Cloudflare Edge Network   │
│  (DNS / WAF / CDN / Proxy)  │
└──────────────┬──────────────┘
               │
      ┌────────┴────────┐
      ▼                 ▼
┌─────────────┐   ┌─────────────┐
│    Vercel   │   │  Cloud Run  │
│ (Frontend)  │   │  (Backend)  │
└─────────────┘   └─────────────┘
```

#### 配置亮點：
1.  **前置防護 (Cloudflare)**: 由 Cloudflare 擋下惡意爬蟲與攻擊流量，**大幅節省 Cloud Run 的運算費用** (避免無效流量觸發計費)。
2.  **彈性運算 (Cloud Run)**: 維持 Docker 部署，享受 Serverless 的彈性。將 Min Instances 設為 0 以節省閒置成本；若需極致效能可設為 1 (每月約 $6-10 USD)。
3.  **全球加速**: 利用 Cloudflare CDN 加速靜態資源與 TLS 握手。

### 2.4 執行步驟 (Execution Steps)

1.  **Containerize**: 確認 Chat API 的 `Dockerfile` 可在本地成功建置。
    *   *Action*: 執行 `docker build` 測試。
2.  **Deploy to Cloud Run**: 使用 `gcloud` CLI 與 `build.sh` 部署至 GCP，並初始設定 `Allow unauthenticated` 以供 Cloudflare 存取。
3.  **Setup Cloudflare**:
    *   將網域 NS 託管至 Cloudflare。
    *   設定 DNS `A/CNAME` 紀錄指向 Vercel (Frontend) 與 Cloud Run (Backend API)。
    *   開啟 **Orange Cloud (Proxy)** 模式。
4.  **Integration**: 更新 Next.js 前端環境變數，將 `/api/chat` 指向新的 API 網域。

## 3. 決策總結

**建議方案**: **Cloudflare Gateway + Google Cloud Run**

*   **成本**:
    *   Cloudflare (Free Tier): $0
    *   Cloud Run: 按量計費 (低流量時接近 $0)
*   **效率**:
    *   Cloudflare Edge 處理連線交握。
    *   Cloud Run 處理複雜 AI 運算 (不受 Vercel 10s 限制)。
*   **遷移成本**: **低** (沿用 Docker，無需改 code)。

若您同意此方案，我們將開始執行 `gcloud` 部署腳本的測試與執行。
