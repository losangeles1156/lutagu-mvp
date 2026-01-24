# LUTAGU 產品介紹說明書（技術架構現況更新補丁）

此檔案用來把 `/Users/zhuangzixian/Documents/LUTAGU_Product_Overview拷貝.md` 內「技術架構說明」與相關段落，更新為目前專案實作現況。

> 目前 IDE 限制無法直接寫入工作目錄以外的檔案，因此我提供可直接貼上的替換文本與精準替換清單。你可以把以下區塊複製回原檔對應位置。

---

## A. 文件頭部更新

把原本：

```
**版本**: v2.0
**日期**: 2026-01-14
```

替換為：

```
**版本**: v2.1
**日期**: 2026-01-24
```

---

## B. 需要同步修正的非技術章節（小幅）

### B1. 互動式地圖（GPS 描述）

在「互動式地圖」段落，將：

```
- 地區自動識別（GPS）
```

替換為：

```
- 地區自動識別（GPS 可選；訪客預設不強制開啟定位，採手動選擇節點/區域）
```

### B2. L2 天氣供應商

任何出現 OpenWeather 的地方，改為 Open-Meteo（MVP 預設）。

### B3. 第 4 章 L2（資料來源 + 快取）

在「#### L2: Live Status（即時狀態層）- Perception」段落，把：

```
- OpenWeather API：天氣、溫度、降雨機率
```

替換為：

```
- Open-Meteo API：天氣、溫度、風速、天氣代碼
```

並把：

```
- TTL 20 分鐘（Supabase KV / Redis）
```

替換為：

```
- TTL 60 秒（記憶體 LRU → Upstash Redis（可選））
```

### B4. 第 4.3 節嵌入模型（維度與供應商）

在「### 4.3 AI 多模型架構」的 **嵌入模型** 區塊，把：

```
- 主要：Gemini text-embedding-004（768 維 → zero-pad 至 1536）
- 備用：MiniMax Embo-01（速率限制時切換）
```

替換為：

```
- 主要：Voyage AI（voyage-4, 1024 維；document: voyage-4-large / query: voyage-4-lite）
- 備援：Gemini text-embedding-004（768 維 → zero-pad 至 1024）
```

### B5. 第 6 章 L2 Live Status 天氣文字

在「#### D. 即時狀態監控（L2 Live Status）」段落，把：

```
- 天氣資訊（OpenWeather API）
```

替換為：

```
- 天氣資訊（Open-Meteo API）
```

### B6. City Adapter 範例 YAML 的 weather 欄位

在第 7 章的 City Adapter 範例 YAML 中，把：

```
weather: OpenWeather
```

替換為：

```
weather: Open-Meteo
```

### B7. 商業模式九宮格的資料源名稱

在「商業模式九宮格」中把：

```
- OpenWeather
```

替換為：

```
- Open-Meteo
```

---

## C. 技術架構章節（第 7 章）整體更新

### C1. 修正章節編號（可選但建議）

原檔同時存在兩個「7.2」。建議改成：

- 7.2 系統架構圖
- 7.3 技術棧詳解
- 7.4 資料庫設計
- 7.5 快取策略
- 7.6 安全性設計
- 7.7 效能優化

如果你不想動編號，也可以只套用以下內容更新。

---

### C2. 7.2 系統架構圖（替換整段）

用以下內容替換原本「### 7.2 系統架構圖」區塊：

```
### 7.2 系統架構圖（現況）

```

```
┌─────────────────────────────────────────────────────────────┐
│                         使用者介面層                          │
│  ┌──────────────────┐   ┌──────────────────┐                │
│  │ PWA Web App       │   │ Admin (Next.js)  │                │
│  │ Next.js 14        │   │ /admin UI + API  │                │
│  │ App Router        │   └──────────────────┘                │
│  └──────────────────┘                                         │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                        API / 應用層（主服務）                  │
│  Next.js Route Handlers (App Router)                          │
│  - Chat / Agent / L4 Recommend / Stations / Nodes / L2 Status │
│  - Rate Limit（Token Bucket） / Auth（Supabase + LINE）        │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                         AI 編排層                             │
│  HybridEngine + PreDecisionEngine + Skills                    │
│  - Template → Algorithm → LLM/Tools（依情境路由）              │
│  - One Recommendation：主卡 1 + 次卡最多 2                     │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                         AI 模型層（Zeabur AI Hub）             │
│  - Gemini 2.5 Flash Lite：快速分類/路由                        │
│  - Gemini 3 Flash Preview：推理/高精度策略（偏好）             │
│  - DeepSeek V3.2：長輸出/對話/整合                             │
│  - MiniMax M2.1：備援                                         │
│  Embedding：Voyage-4（1024）/ Gemini 004（768→1024 padding）   │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                         數據層（Supabase）                     │
│  Postgres 15 + PostGIS + pgvector                             │
│  - L1/L3：stations/nodes/places/facilities                     │
│  - L2：cache tables（l2_cache, weather_cache 等）              │
│  - L4：knowledge + vectors（HNSW cosine index）                │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                         外部數據源                             │
│  - ODPT（TrainInformation 等） + Yahoo/JR Web（補強）           │
│  - OpenStreetMap（Overpass）                                  │
│  - GBFS（共享移動工具）                                       │
│  - Open-Meteo（天氣）                                         │
└─────────────────────────────────────────────────────────────┘
```

---

### C3. 技術棧詳解（替換整段 YAML）

把原本「前端技術 / 後端技術 / AI/ML 技術 / 開放數據整合」四段 YAML，替換為下列版本。

#### 前端技術

```yaml
框架: Next.js 14.2.35 (App Router, React 18)
語言: TypeScript
樣式: Tailwind CSS 3.3 + shadcn/ui
狀態管理: Zustand 4.5.0
地圖: React Leaflet 4.2.1 + OpenStreetMap
國際化: next-intl 3.5.0
Markdown: react-markdown + remark-gfm
PWA: next-pwa 5.6.0
```

#### 後端技術

```yaml
Runtime: Node.js 20+
API Framework: Next.js Route Handlers (App Router)
資料庫: Supabase (PostgreSQL 15 + PostGIS)
向量索引: pgvector + HNSW (cosine)
快取: In-memory LRU → Upstash Redis（可選）
認證: Supabase Auth + LINE Login（Trip Guard 用）
檔案儲存: Supabase Storage
```

#### AI/ML 技術

```yaml
整合方式:
  - Vercel AI SDK (ai, @ai-sdk/*)
  - Zeabur AI Hub (OpenAI-compatible endpoint)

LLM (Trinity):
  - Router/Gatekeeper: Gemini 2.5 Flash Lite
  - Brain/Reasoning: Gemini 3 Flash Preview（API 路由）/ Gemini 1.5 Flash（Agent 主模型）
  - Synthesizer/Chat: DeepSeek V3.2（API 路由）/ DeepSeek V3（Agent）
  - Fallback: Gemini 2.5 Flash Lite（通用）/ MiniMax M2.1（Agent 備援）

嵌入模型:
  - 主要: Voyage AI (voyage-4, 1024 dims)
  - 備援: Gemini text-embedding-004 (768 dims → 1024 padding)
```

#### 開放數據整合

```yaml
ODPT API:
  - TrainInformation 等即時運行資訊
  - Challenge API（部分業者）

OpenStreetMap (Overpass API):
  - POI / 設施 / 無障礙資訊（L3）

GBFS:
  - 共享移動工具站點/可用量（依供應商）

Open-Meteo:
  - 即時天氣（溫度/濕度/風速/天氣代碼）
```

---

### C4. 7.4 快取策略（更新重點）

把快取章節中「Supabase KV / Redis」調整為「記憶體 LRU → Upstash Redis（可選）」，並同步 TTL。

建議替換為：

```yaml
L2 即時狀態快取:
  儲存位置: In-memory LRU → Upstash Redis（可選）
  TTL: 60 秒
  鍵格式: l2:status:{nodeId}

ODPT 即時狀態快取:
  儲存位置: In-memory 去重 + Upstash Redis（可選）
  TTL: 60 秒
  備註: 同一 operator 20 秒內請求去重，降低 ODPT 壓力

Embedding 快取:
  儲存位置: In-memory LRU → Upstash Redis（可選）
  TTL: 7 天
  鍵格式: emb:{provider}:v4:{type}:{sha256(text)}

天氣快取:
  儲存位置: Supabase weather_cache + Open-Meteo 即時補抓
  新鮮判定: 3 小時
```

---

### C5. 7.6 安全性設計（速率限制更新）

把原本：

```yaml
實現方式:
  - @upstash/ratelimit (Supabase KV)
  - 滑動窗口演算法
  - Header: X-RateLimit-Remaining
```

替換為：

```yaml
實現方式:
  - Token Bucket（記憶體 Map）
  - 可用環境變數 RATE_LIMIT_ENABLED 切換
  - 回應可附 remaining / retry-after（依端點需要）
```

---

## D. 其他現況補充（建議新增小節，放在第 7 章末）

```
### 7.x 資料管線與自動化（現況）

- ETL/爬取：以 TypeScript + tsx scripts 為主（L1/L3/L4 pipeline）
- 工作流：n8n（ODPT alerts sync、weather sync）
- 自動化測試：node:test（單元測試 + 輕量 UI 測試）
```

---

## E. 原檔快速搜尋替換清單（避免漏改）

在原檔用搜尋（Find）依序找出並修正下列關鍵字：

- OpenWeather → Open-Meteo
- Supabase KV → In-memory LRU → Upstash Redis（可選）或改寫為「Supabase Table-based Cache」
- @upstash/ratelimit → Token Bucket（記憶體 Map）
- Gemini text-embedding-004（768 → 1536）→ Gemini 004（768 → 1024 padding）
- MiniMax Embo-01 → （移除，改為 Voyage AI + Gemini fallback）

原檔目前出現位置（供你快速定位）：

- L2（第 4 章）快取 TTL 20 分鐘（需改為 L2 60 秒、天氣 3 小時）
- 互動式地圖段落的「地區自動識別（GPS）」
- 城市配置範例（City Adapter）weather 欄位
- 系統架構圖中的 OpenWeather
- 技術棧詳解、快取策略、速率限制段落
