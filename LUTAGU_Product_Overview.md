# LUTAGU 產品介紹說明書

**版本**: v3.1
**日期**: 2026-02-01
**文件類型**: 產品架構與功能說明
**修訂說明**: 更新 AI 架構細節，反映實際程式碼實作

---

## 目錄

1. [產品定義與核心價值](#1-產品定義與核心價值)
2. [解決的社會課題](#2-解決的社會課題)
3. [目標用戶與使用場景](#3-目標用戶與使用場景)
4. [四層數據模型架構 (L1-L4)](#4-四層數據模型架構-l1-l4)
5. [核心功能模組](#5-核心功能模組)
6. [技術架構](#6-技術架構)
7. [AI 多模型編排系統](#7-ai-多模型編排系統)
8. [資料庫設計](#8-資料庫設計)
9. [商業模式](#9-商業模式)
10. [開發里程碑](#10-開發里程碑)
11. [安全性設計](#11-安全性設計)
12. [附錄：環境配置](#12-附錄環境配置)

---

## 1. 產品定義與核心價值

### 1.1 什麼是 LUTAGU？

LUTAGU 是一個基於 PWA (Progressive Web App) 的**城市感性導航服務 (Urban Empathy Navigation Service)**，專為東京設計。

### 1.2 核心價值主張

> **「擁有資訊 ≠ 知道該怎麼做」**

將冷冰冰的開放數據（ODPT、GTFS、OSM）轉譯為具備**同理心的行動建議 (Nudge)**，解決旅客在交通過程中的焦慮。

LUTAGU 不是被動的資料百科，而是**主動的在地嚮導 (Proactive Local Guide)**。

### 1.3 最高指導原則 (Prime Directives)

| 原則 | 說明 |
|------|------|
| **Guest-First（訪客優先）** | 90% 功能無需登入即可使用。註冊僅用於 Trip Guard 推播功能 |
| **Commercial Reality（商業現實）** | L4 行動建議優先提供可執行的替代方案，商業導流是核心變現邏輯 |
| **Inheritance Efficiency（繼承效率）** | 嚴守 10-15 個 Hub 母節點限制，子節點自動繼承人格 |
| **One Recommendation（一個建議）** | AI 輸出收斂為單一最佳建議 (Primary Card)，最多 2 張次要卡片 |
| **Dynamic Expansion（動態擴充）** | 架構支援動態新增任何地理圍欄內的節點 |
| **Multilingual（多語言支援）** | 預設繁體中文，支援英文、日文 UI 切換，其他語系透過 AI 對話支援 |

---

## 2. 解決的社會課題

### 2.1 過度旅遊 (Overtourism)

- 數據驅動的識別與分流
- 即時擁擠度監控
- 替代路線與時段建議

### 2.2 資訊斷層導致的決策癱瘓

| 焦慮類型 | 範例 | LUTAGU 解決方案 |
|---------|------|----------------|
| **等待焦慮** | 「電車還要多久？」 | 即時狀態 + 預估到達時間 |
| **異常焦慮** | 「列車延誤怎麼辦？」 | 異常偵測 + 替代方案建議 |
| **資源焦慮** | 「行李箱放哪？」 | 置物櫃搜尋 + Ecbo Cloak 導流 |
| **抵達焦慮** | 「出口怎麼走？」 | 出口策略 + 空間推理 |
| **知識斷層** | 「直通運轉是什麼？」 | 在地知識 + 情境解釋 |

### 2.3 多模式整合缺失

外國旅客需要在多個 App 之間切換（Google Maps、換乘案內、天氣 App、叫車 App）。LUTAGU 提供**單一入口的整合體驗**。

---

## 3. 目標用戶與使用場景

### 3.1 目標用戶

**Primary Persona**: 不熟悉日本交通邏輯的外國旅客

- 語言障礙不是主要問題（已有翻譯工具）
- **知識斷層**才是核心痛點（不了解「直通運轉」、「連結車廂」等概念）

### 3.2 用戶狀態

| 狀態 | 功能範圍 | 技術要求 |
|------|---------|---------|
| **Guest（訪客）** | 地圖、搜尋、AI 對話、商業導流 | 無需 GPS，手動選擇節點 |
| **Member（會員）** | Trip Guard 推播通知 | GPS 追蹤 + LINE Login |

### 3.3 核心使用場景

1. **路線規劃**: 「我要從上野去淺草，怎麼走最快？」
2. **異常應對**: 「銀座線延誤了，有替代方案嗎？」
3. **設施查詢**: 「附近有投幣置物櫃嗎？」
4. **情境建議**: 「下雨天，推薦室內景點」
5. **行程守護**: Trip Guard 主動推播列車異常

---

## 4. 四層數據模型架構 (L1-L4)

### 4.1 架構概覽

```
┌─────────────────────────────────────────────────────────────┐
│  L4: Mobility Strategy（行動策略層）- 決策                    │
│  AI 綜合 L1-L3 生成最終建議（Action Cards）                   │
├─────────────────────────────────────────────────────────────┤
│  L3: Micro-Facilities（環境機能層）- 細節                     │
│  供給標籤 + 適用標籤（置物櫃、廁所、無障礙設施）               │
├─────────────────────────────────────────────────────────────┤
│  L2: Live Status（即時狀態層）- 感知                          │
│  列車延誤、擁擠度、天氣（TTL 60 秒快取）                       │
├─────────────────────────────────────────────────────────────┤
│  L1: Location DNA（地點基因層）- 骨架                         │
│  Hub/Spoke 節點架構、靜態屬性、基礎設施能力                    │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 L1: 地點基因層 (Location DNA) - Backbone

**定義**: 節點的靜態屬性與基礎設施能力

**數據來源**:
- ODPT API（JR East、Tokyo Metro、Toei）
- OpenStreetMap（Overpass API）
- MLIT（國土交通省）
- GBFS（共享運具站點）

**Hub/Spoke 母子繼承架構**:

| 類型 | 數量 | 說明 |
|------|------|------|
| **Hub（母節點）** | 10-15 個 | 手工撰寫 Persona Prompt，代表區域特色 |
| **Spoke（子節點）** | 數百個 | 自動繼承最近 Hub 的人格與特徵 |

### 4.3 L2: 即時狀態層 (Live Status) - Perception

**定義**: 影響決策的動態變數

**數據來源**:
- ODPT API（TrainInformation、BusLocation）
- Open-Meteo API（天氣、溫度、風速）

**快取策略**:
- TTL: 60 秒（記憶體 LRU → Upstash Redis 可選）
- ODPT 請求去重：同一 operator 20 秒內

**異常偵測**:
- 觸發條件: `delay > 15min` 或 `status != "Normal"`
- 回應: 顯示擾亂 Banner + 觸發 L4 AI 生成替代方案

### 4.4 L3: 環境機能層 (Micro-Facilities) - Details

**定義**: 解決旅途中「微需求」的服務設施

**雙層標籤結構**:

| 標籤類型 | 範例 | 用途 |
|---------|------|------|
| **Supply Tags（供給）** | `has_locker`, `has_bench`, `has_wifi`, `has_elevator` | 客觀設施存在 |
| **Suitability Tags（適用）** | `good_for_waiting`, `work_friendly`, `quiet_zone`, `luggage_friendly` | 情境適用性 |

**數據來源**: OSM Overpass API、GBFS、商業 API（Ecbo）

### 4.5 L4: 行動策略層 (Mobility Strategy) - Decision

**定義**: AI 綜合 L1-L3 生成的最終建議

**運算核心**: HybridEngine + Deep Research Skills + LLM

**輸出格式**: Action Cards（最多 3 張）

| 優先序 | 類型 | 範例 | 導流目標 |
|--------|------|------|---------|
| 1 | 最佳大眾運輸 | 「搭銀座線，3 分鐘後發車」 | ODPT 數據 |
| 2 | 舒適/快速替代 | 「搭 GO Taxi，約 ¥1200，省 10 分鐘」 | Taxi 導流 |
| 3 | 微型移動/體驗 | 「騎 LUUP 滑板車，沿途風景好」 | LUUP 導流 |

---

## 5. 核心功能模組

### 5.1 互動式地圖

- **地圖引擎**: React Leaflet + OpenStreetMap
- **分層渲染**: 車站、設施、共享運具站點
- **聚合顯示**: MarkerCluster 處理高密度區域
- **地區識別**: GPS 可選；訪客預設手動選擇節點/區域

### 5.2 AI 對話介面

- **多語言輸入**: 支援任何語言的自然對話
- **串流回應**: 即時顯示 AI 思考過程
- **結構化輸出**: Action Cards 呈現建議
- **情境感知**: 結合用戶位置、時間、天氣

### 5.3 即時狀態監控 (L2 Live Status)

- **列車運行資訊**: ODPT TrainInformation API
- **天氣資訊**: Open-Meteo API（溫度、風速、天氣代碼）
- **異常警示**: 自動偵測延誤並觸發替代建議

### 5.4 Trip Guard 行程守護（會員功能）

- **LINE 推播**: 訂閱路線的異常通知
- **主動監控**: 系統自動追蹤訂閱路線
- **智慧建議**: 異常時主動推送替代方案

### 5.5 管理後台 (Admin Dashboard)

- **L1 Places**: POI 資料管理與審核
- **Nodes**: Hub/Spoke 節點管理
- **Partners**: 商業合作夥伴設定
- **Metrics**: 系統健康度與效能監控
- **Feedback**: 用戶回饋分析

---

## 6. 技術架構

### 6.1 系統架構圖

```
┌─────────────────────────────────────────────────────────────┐
│                       使用者介面層                            │
│  ┌──────────────────┐   ┌──────────────────┐                │
│  │ PWA Web App       │   │ Admin Dashboard  │                │
│  │ Next.js 14        │   │ /admin UI + API  │                │
│  │ App Router        │   └──────────────────┘                │
│  └──────────────────┘                                        │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│              TypeScript 應用層（Next.js 主服務）               │
│  Route Handlers:                                             │
│  - /api/agent/chat    : AI 對話（可代理至 Go 後端）            │
│  - /api/agent/hybrid  : HybridEngine 直接執行                 │
│  - /api/odpt/*        : 交通數據 API                          │
│  - /api/l1-l4/*       : 數據層 API                           │
│  AI Engine:                                                  │
│  - HybridEngine (L1-L5 決策流程)                              │
│  - Vercel AI SDK (ai@^6.0.57)                                │
│  - Deep Research Skills (10 skills)                          │
└─────────────────────────────────────────────────────────────┘
                     ↕ (CHAT_API_URL 代理)
┌─────────────────────────────────────────────────────────────┐
│                Go 微服務層（ADK Agent）                        │
│  services/adk-agent/ (獨立部署 :8080)                         │
│  - LayeredEngine (L0-L5 決策)                                │
│  - ReAct Loop (最多 5 步)                                    │
│  - Function Calling (OpenRouter)                             │
│  - FactChecker (後處理驗證)                                   │
│  - Skills Registry (7 skills)                                │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                    AI 模型層（多通道）                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Zeabur AI Hub (hnd1.aihub.zeabur.ai) - 東京節點       │    │
│  │  - Gemini 2.5 Flash Lite (Gatekeeper/分類)            │    │
│  │  - DeepSeek V3.2 (Brain/推理 + Synthesizer/對話)      │    │
│  │  - MiniMax M2.1 (備援)                                │    │
│  └─────────────────────────────────────────────────────┘    │
│  Embedding (統一):                                           │
│  - Voyage-4-lite (Query, 1024 dim)                          │
│  - Voyage-4-large (Document, 1024 dim)                      │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                      數據層（Supabase）                        │
│  PostgreSQL 15 + PostGIS + pgvector                          │
│  - L1/L3: nodes / station_facilities / shared_mobility       │
│  - L2: l2_cache / weather_cache（TTL 快取）                   │
│  - L4: knowledge vectors（HNSW cosine index）                │
│  快取: In-memory LRU → Redis/Upstash（可選）                  │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                        外部數據源                             │
│  - ODPT API（TrainInformation, Timetable 等）                 │
│  - OpenStreetMap（Overpass API）                             │
│  - GBFS（Docomo Cycle, LUUP）                                │
│  - Open-Meteo（天氣）                                        │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 技術棧詳解

#### 前端技術

```yaml
框架: Next.js 14.2.35 (App Router, React 18)
語言: TypeScript (strict mode)
樣式: Tailwind CSS 3.3 + shadcn/ui
狀態管理: Zustand 4.5.0
地圖: React Leaflet 4.2.1 + OpenStreetMap
國際化: next-intl 3.5.0
Markdown: react-markdown + remark-gfm
動畫: Framer Motion 12.x
PWA: next-pwa 5.6.0
```

#### 後端技術 (TypeScript - Next.js)

```yaml
Runtime: Node.js 20+ (Next.js App Router)
API Framework: Next.js Route Handlers
AI SDK: Vercel AI SDK (ai@^6.0.57, @ai-sdk/openai)
資料庫: Supabase (PostgreSQL 15 + PostGIS)
向量索引: pgvector + HNSW (cosine similarity)
快取: In-memory LRU (lru-cache@^11.2.4) → Upstash Redis（可選）
認證: Supabase Auth + LINE Login（Trip Guard）
檔案儲存: Supabase Storage
```

#### 後端技術 (Go - Google ADK Agent 微服務)

```yaml
語言: Go 1.23+
框架: Google ADK-Agent (Agent Development Kit)
位置: services/adk-agent/
部署: 獨立部署 (:8080)
功能:
  - LayeredEngine (L0-L5 決策流程)
  - ReAct Loop (最多 5 步迭代)
  - Function Calling (ADK Tools)
  - FactChecker (在地化事實驗證)
  - Skills Registry (7 個專業技能)
基礎設施:
  - Zeabur AI Hub Client (LLM Gateway)
  - Voyage AI Client (Embedding)
  - ODPT Client (交通數據)
  - Supabase VectorStore (RAG)
  - Redis Cache (可選)
HTTP 端點:
  - POST /api/chat       : 主對話端點
  - POST /agent/chat     : 別名
  - GET  /health         : 健康檢查
  - GET  /health/ready   : Readiness Probe
  - GET  /health/live    : Liveness Probe
  - GET  /metrics        : 監控指標
```

#### 開放數據整合

```yaml
ODPT API:
  - TrainInformation: 列車運行資訊
  - StationTimetable: 站點時刻表
  - Challenge API: JR East 等業者

OpenStreetMap (Overpass API):
  - POI / 設施 / 無障礙資訊（L3）

GBFS:
  - Docomo Cycle / LUUP 站點可用量

Open-Meteo:
  - 即時天氣（溫度/濕度/風速/天氣代碼）
```

### 6.3 快取策略

```yaml
L2 即時狀態快取:
  儲存位置: In-memory LRU → Upstash Redis（可選）
  TTL: 60 秒
  鍵格式: l2:status:{nodeId}

ODPT 請求去重:
  機制: In-memory + 時間戳記
  間隔: 同一 operator 20 秒內去重
  目的: 降低 ODPT API 負載

Embedding 快取:
  儲存位置: In-memory LRU
  TTL: 7 天
  鍵格式: emb:{provider}:v4:{type}:{sha256(text)}

天氣快取:
  儲存位置: weather_cache 表 + 即時補抓
  新鮮判定: 3 小時
```

---

## 7. AI 多模型編排系統

### 7.1 雙層架構概覽

LUTAGU 採用**前後端分離的雙層 AI 架構**：

```
┌─────────────────────────────────────────────────────────────┐
│                 TypeScript 前端 (Next.js)                    │
│  src/lib/ai/ + src/lib/l4/HybridEngine.ts                   │
│  - 主要用戶介面、快速回應                                      │
│  - Vercel AI SDK (@ai-sdk/openai + ai)                      │
│  - Direct Fetch (OpenAI-compatible REST)                    │
│  - Voyage AI (統一向量嵌入)                                   │
└─────────────────────────────────────────────────────────────┘
                              ↕ (可選代理)
┌─────────────────────────────────────────────────────────────┐
│              Go 後端微服務 (Google ADK Agent)                 │
│  services/adk-agent/ (獨立部署)                              │
│  - Google ADK-Agent Framework                               │
│  - 深度推理、ReAct Loop、Function Calling                    │
│  - Zeabur AI Hub (LLM Gateway)                              │
│  - 分層決策引擎 (L0-L5)                                       │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Trip Trinity 模型配置

#### 7.2.1 TypeScript 前端模型配置

**檔案**: `src/lib/ai/llmClient.ts`

| Task Type | 模型 | Timeout | Max Tokens |
|-----------|------|---------|------------|
| `classification`, `simple` | `gemini-2.5-flash-lite` | 20s | 200 |
| `reasoning`, `context_heavy` | `deepseek-v3.2` | 45s | 600 |
| `synthesis`, `chat` | `deepseek-v3.2` | 30s | 700 |
| Default | `gemini-2.5-flash-lite` | 30s | 400 |

**檔案**: `src/lib/agent/providers.ts` (Vercel AI SDK)

| 角色 | 模型 ID | Provider | 用途 |
|------|---------|----------|------|
| **Gatekeeper** | `gemini-2.5-flash-lite` | Zeabur | 快速路由 |
| **Brain** | `deepseek-v3.2` | Zeabur | 推理邏輯 |
| **Synthesizer** | `deepseek-v3.2` | Zeabur | 對話合成 |
| **Fallback** | `MiniMax-M2.1` | MiniMax API | 備援 |

#### 7.2.2 Go 後端模型配置

**框架**: Google ADK-Agent (Agent Development Kit)

**檔案**: `services/adk-agent/internal/config/config.go`

| Agent | 預設模型 | 用途 |
|-------|---------|------|
| **RootAgent** | `deepseek-v3.2` | 主代理 |
| **RouteAgent** | `deepseek-v3.2` | 路線規劃 |
| **StatusAgent** | `deepseek-v3.2` | 狀態查詢 |
| **GeneralAgent** | `deepseek-v3.2` | 一般推理 |
| **FastAgent** | `gemini-2.5-flash-lite` | 快速回應 (SLM) |

### 7.3 決策流程 (Layered Engine)

```
用戶查詢
    │
    ▼
┌──────────────┐
│ L0: Context  │ ← NodeResolver + L2 Injector + Weather
│  Resolution  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ L1: Template │ ← 快速模式比對（高頻 FAQ）
│    Engine    │   命中 → 直接回應
└──────┬───────┘
       │ Miss
       ▼
┌──────────────┐
│ L2: Algorithm│ ← 路線/狀態查詢
│   Provider   │   RouteAgent / StatusAgent
└──────┬───────┘
       │ Miss
       ▼
┌──────────────┐
│ L3/L4: Skill │ ← Tag-Driven Dispatch
│   + RAG      │   10 個 Deep Research Skills
└──────┬───────┘
       │ Miss
       ▼
┌──────────────┐
│ L5: LLM      │ ← 分層推理 (SLM vs Full LLM)
│   Fallback   │   + FactChecker 後處理
└──────────────┘
```

### 7.4 Deep Research Skills

專為特定問題領域設計的技能模組（共 10 個）：

#### TypeScript Skills (`src/lib/l4/skills/`)

| 技能 | 優先序 | 功能 | 使用模型 |
|------|--------|------|---------|
| **MedicalSkill** | 110 | 緊急醫療指引 | Gemini 3 (reasoning) |
| **FareRulesSkill** | 100 | 票價計算、折扣 | Gemini 3 (reasoning) |
| **ExitStrategistSkill** | 95 | 出口/轉乘優化 | Gemini 3 (reasoning) |
| **StandardRoutingSkill** | 92 | 標準路線規劃 | Algorithm Provider |
| **AccessibilitySkill** | 90 | 無障礙路線 | Gemini 2.5 Lite (classification) |
| **LocalGuideSkill** | 85 | 在地推薦 | Gemini 3 (chat) |
| **LuggageSkill** | 80 | 行李寄存 | Gemini 2.5 Lite |
| **LastMileSkill** | 70 | 最後一哩路 | Gemini 2.5 Lite |
| **CrowdDispatcherSkill** | 60 | 人潮迴避 | Gemini 3 (chat) |
| **SpatialReasonerSkill** | 10 | 空間推理 (Fallback) | Gemini 3 (reasoning) |

#### Go Skills (`services/adk-agent/internal/skill/`)

| 技能 | 功能 |
|------|------|
| **FareSkill** | 票價查詢 |
| **AccessibilitySkill** | 無障礙導引 |
| **MedicalSkill** | 醫療緊急 |
| **ExitStrategistSkill** | 出口策略 |
| **LocalGuideSkill** | 在地推薦 |
| **SpatialReasonerSkill** | 空間推理 |
| **InfoLinksSkill** | 資訊連結 |

### 7.5 嵌入模型配置（統一使用 Voyage AI）

#### TypeScript 前端

**檔案**: `src/lib/ai/embedding.ts`

```yaml
主要模型:
  提供者: Voyage AI
  模型: voyage-4-lite
  維度: 1024
  API: https://api.voyageai.com/v1/embeddings
  用途: Query embedding

文件模型:
  模型: voyage-4-large
  用途: Document embedding

備援:
  類型: 確定性雜湊 (Deterministic Hash)
  維度: 1024
  觸發: VOYAGE_API_KEY 未設定時
```

#### Go 後端

**檔案**: `services/adk-agent/internal/infrastructure/embedding/voyage.go`

```yaml
主要模型:
  提供者: Voyage AI
  模型: voyage-4-lite (預設)
  維度: 1024
  用途: Query embedding

文件模型:
  模型: voyage-4-large
  用途: Document embedding
```

### 7.6 API 端點與通信協議

#### Zeabur AI Hub (主要)

```yaml
端點: https://hnd1.aihub.zeabur.ai/v1
區域: 東京 (hnd1)
協議: OpenAI-compatible REST API
認證: Bearer Token (ZEABUR_API_KEY)
```

#### OpenRouter (Function Calling)

```yaml
端點: https://openrouter.ai/api/v1
用途: Go 後端 Function Calling 專用
```

#### MiniMax (備援)

```yaml
端點: https://api.minimax.io/v1
用途: 主模型失敗時的備援
```

### 7.7 SDK 與框架

| 層級 | 框架 | 用途 |
|------|------|------|
| **TypeScript Agent** | Vercel AI SDK (`ai@^6.0.57`, `@ai-sdk/openai`) | Agent 編排、串流回應 |
| **TypeScript LLM** | Direct Fetch (OpenAI-compatible) | 底層 LLM 呼叫 |
| **TypeScript Embedding** | Voyage AI SDK | 向量嵌入 |
| **Go Agent** | Google ADK-Agent (Agent Development Kit) | ReAct Loop、Function Calling |
| **Go LLM** | Zeabur AI Hub Client | LLM Gateway |
| **Go Embedding** | Voyage AI Client | 向量嵌入 |

---

## 8. 資料庫設計

### 8.1 核心表格

| 表格 | 用途 | 關鍵欄位 |
|------|------|---------|
| `nodes` | 節點主表（Hub/Spoke） | `id`, `name`(JSONB), `lat`, `lng`, `hub_id`, `ward` |
| `cities` | 城市/區域配置 | City Adapter 設定、地理圍欄 |
| `station_facilities` | L3 微設施 | `station_id`, `supply_tags`, `suitability_tags` |
| `shared_mobility_stations` | GBFS 共享運具 | 站點位置、可用數量 |
| `users` | 用戶資料 | LINE 整合、偏好設定 |
| `trip_subscriptions` | Trip Guard 訂閱 | 通知設定、訂閱路線 |
| `nudge_logs` | 意圖日誌 | 核心商業數據分析 |
| `feedback_hub` | 用戶回饋 | 評分、建議 |

### 8.2 多語系欄位結構

所有面向使用者的文字欄位採用 JSONB：

```sql
CREATE TABLE nodes (
  id uuid PRIMARY KEY,
  name jsonb NOT NULL,  -- {"zh-TW": "上野站", "ja": "上野駅", "en": "Ueno Station"}
  description jsonb,
  -- ...
);
```

### 8.3 向量索引

```sql
-- L4 知識庫向量索引
CREATE INDEX idx_knowledge_embedding
ON knowledge USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

---

## 9. 商業模式

### 9.1 價值定位

> **「焦慮解法的中介 (Broker of Anxiety Relief)」**

LUTAGU 在用戶產生焦慮的瞬間，提供可執行的解決方案，並從中獲得導流分潤。

### 9.2 營收來源

| 導流類型 | 情境 | 合作夥伴 | 變現方式 |
|---------|------|---------|---------|
| **移動導流** | 電車延誤 → 叫車 | GO Taxi、Uber | CPA 分潤 |
| **微型移動** | 最後一哩路 → 滑板車 | LUUP | CPA 分潤 |
| **空手觀光** | 找不到置物櫃 → 寄存服務 | Ecbo Cloak | 手續費分潤 |

### 9.3 Deep Link 整合

```yaml
Taxi:
  - GO Taxi: https://go.mo-t.com/...

Shared Mobility:
  - LUUP: https://luup.sc/...
  - Docomo Cycle: 深度連結（待整合）

Locker Service:
  - Ecbo Cloak: https://cloak.ecbo.io/...
```

### 9.4 商業模式九宮格

| 關鍵夥伴 | 關鍵活動 | 價值主張 |
|---------|---------|---------|
| ODPT、Open-Meteo、GBFS 供應商 | 數據整合、AI 建議生成 | 焦慮解法的中介 |
| GO Taxi、LUUP、Ecbo | 商業導流、分潤協商 | 單一入口體驗 |

| 關鍵資源 | | 客戶關係 |
|---------|---------|---------|
| 多模型 AI、知識庫、ETL Pipeline | | Guest-First 無摩擦體驗 |

| 通路 | | 目標客群 |
|---------|---------|---------|
| PWA（手機/桌面）、LINE | | 不熟悉日本交通的外國旅客 |

| 成本結構 | | 收入來源 |
|---------|---------|---------|
| AI 模型費用、基礎設施、數據授權 | | CPA 導流分潤、未來: 廣告、B2B 授權 |

---

## 10. 開發里程碑

### Phase 1：骨幹建置 ✅ 完成

- [x] 設定 Zeabur 環境變數（ODPT_API_KEY）
- [x] 建立 Hub/Spoke 資料庫結構（含 parent_hub_id）
- [x] n8n 建立 ODPT 自動抓取 Workflow
- [x] City Adapter 介面實作
- [x] 地圖分層渲染 (Layering)

### Phase 2：感知與細節 ✅ 完成

- [x] 定義 10 個核心 Hub 並撰寫 Persona Prompt
- [x] 實作 L3 供給/適用雙欄位結構
- [x] OSM 數據抓取，自動填入 Supply Tags
- [x] L2 即時狀態顯示

### Phase 3：決策與神經 ✅ 完成

- [x] 接入 GBFS 共享運具數據
- [x] AI 知識庫對接（HybridEngine + RAG）
- [x] L4 AI 對話建議功能
- [x] PWA Manifest 與 Action Cards UI
- [x] Deep Research Skills 實作

### Phase 4：商業整合（進行中）

- [ ] Deep Links 整合（待商業合作）
- [ ] Trip Guard LINE 推播完整流程
- [ ] 合作夥伴 Dashboard
- [ ] 轉換追蹤與 Analytics

---

## 11. 安全性設計

### 11.1 速率限制

```yaml
實現方式:
  - Token Bucket（記憶體 Map）
  - 環境變數 RATE_LIMIT_ENABLED 控制開關
  - 回應附 remaining / retry-after
```

### 11.2 輸入驗證

- **Schema 驗證**: 所有 API 輸入使用 Zod 驗證
- **XSS 防護**: HTML 內容清理
- **SQL 注入防護**: Supabase 參數化查詢

### 11.3 認證與授權

```yaml
Guest:
  - 無需認證
  - 基於 visitor ID 的匿名追蹤

Member:
  - Supabase Auth + LINE Login
  - JWT session 管理
  - Admin RBAC 角色控制
```

### 11.4 數據加密

```yaml
PII 加密:
  - 32-byte base64 金鑰 (PII_ENCRYPTION_KEY_BASE64)

活動雜湊:
  - ACTIVITY_HASH_SALT 匿名化處理
```

---

## 12. 附錄：環境配置

### 12.1 必要環境變數

```env
# =============================================
# ODPT API（公共交通開放數據）
# =============================================
ODPT_API_KEY_METRO=your_tokyo_metro_api_key
ODPT_API_KEY_JR_EAST=your_jr_east_challenge_key
ODPT_API_KEY_PUBLIC=optional_public_api_key

# =============================================
# Supabase
# =============================================
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# =============================================
# AI 模型 - TypeScript 前端
# =============================================
# Zeabur AI Hub (主要 - 東京節點)
ZEABUR_API_KEY=your_zeabur_api_key

# Gemini (備援 / 直連)
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key

# DeepSeek (可選 - 若不使用 Zeabur 代理)
DEEPSEEK_API_KEY=your_deepseek_api_key

# MiniMax (備援)
MINIMAX_API_KEY=your_minimax_api_key

# =============================================
# Embedding（統一使用 Voyage AI）
# =============================================
VOYAGE_API_KEY=your_voyage_api_key
VOYAGE_MODEL=voyage-4-lite
VOYAGE_MODEL_DOCUMENT=voyage-4-large

# =============================================
# AI 模型 - Go 後端 (Google ADK Agent)
# =============================================
# Zeabur AI Hub (Go 後端 LLM)
ZEABUR_BASE_URL=https://hnd1.aihub.zeabur.ai/v1

# 模型覆寫 (可選)
MODEL_ROOT_AGENT=deepseek-v3.2
MODEL_ROUTE_AGENT=deepseek-v3.2
MODEL_STATUS_AGENT=deepseek-v3.2
MODEL_GENERAL_AGENT=deepseek-v3.2
MODEL_FAST_AGENT=google/gemini-2.0-flash-001

# =============================================
# 服務代理
# =============================================
# Go 後端代理 (設定後 /api/agent/chat 會轉發至此)
CHAT_API_URL=http://localhost:8080/api
ADK_SERVICE_URL=http://localhost:8080

# n8n Webhook (可選)
N8N_WEBHOOK_URL=https://n8n.zeabur.app/webhook/lutagu-chat

# Redis (Go 後端快取)
REDIS_URL=redis://localhost:6379/0

# =============================================
# LINE（Trip Guard 推播）
# =============================================
LINE_CHANNEL_ACCESS_TOKEN=your_line_token
LINE_CHANNEL_SECRET=your_line_secret

# =============================================
# 安全性
# =============================================
PII_ENCRYPTION_KEY_BASE64=replace_with_32_byte_base64
ACTIVITY_HASH_SALT=replace_with_random_secret
RATE_LIMIT_ENABLED=true
```

### 12.2 常用指令

```bash
# 開發環境
npm install
npm run dev

# 類型檢查與 Lint
npm run typecheck
npm run lint

# 測試
npm test
npm run test:ui
npm run test:e2e

# 資料管線
npm run crawl:l1          # L1 車站資料
npm run crawl:l3          # L3 置物櫃
npm run crawl:l3:toilets  # L3 廁所
npm run crawl:l3:access   # L3 無障礙設施

# 建置與部署
npm run build
npm start
```

### 12.3 驗證場域 (Sandbox)

**地理圍欄**:
- 核心區：台東區（上野/淺草）、千代田區（東京車站/皇居）、中央區（銀座）
- Bounding Box: `[139.73, 35.65]` 至 `[139.82, 35.74]`

**數據獲取策略**: 「ODPT First, OSM Second」

---

## 參考文件

- **技術架構規格書**: v4.0
- **資料庫設計規格**: v4.1
- **CLAUDE.md**: AI 開發規則
- **ARCHITECTURE.md**: 系統架構與安全標準
- **ODPT API 文件**: https://developer.odpt.org/
- **GBFS 規格**: https://gbfs.org/
- **Open-Meteo API**: https://open-meteo.com/

---

*本文件為 LUTAGU MVP 的完整產品說明書。*
*最後更新：2026-02-01 | 版本：v3.1*

**本次更新重點 (v3.1)**:
- 詳細說明 TypeScript + Go 雙層 AI 架構
- **統一 Embedding 模型**: 前後端皆使用 Voyage AI (voyage-4)
- **統一 Brain 模型**: 使用 DeepSeek V3.2 取代舊版 Gemini
- **Go 後端框架**: 採用 Google ADK-Agent (Agent Development Kit)
- 更新環境變數配置（含 Go 後端參數）
- 完整列出 10 個 Deep Research Skills 及其優先序
