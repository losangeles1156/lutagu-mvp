# LUTAGU 技術選型
# Tech Stack & Module Structure

---

## 🎯 本文件的使用方式

```
給 AI 開發代理的指引：

1. 使用指定的技術堆疊，除非有充分理由更換
2. 遵循模組結構，保持程式碼組織一致性
3. 環境變數命名遵循規範
4. 外部服務的 API Key 統一在 .env 管理
```

---

## 1. 技術堆疊總覽

```
┌─────────────────────────────────────────────────────────────────┐
│                      LUTAGU Tech Stack                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Frontend                                                      │
│   ─────────────────────────────────────────────────────────    │
│   • Framework: Next.js 14 (App Router)                          │
│   • Language: TypeScript                                        │
│   • Styling: Tailwind CSS                                       │
│   • UI Components: Radix UI + shadcn/ui                         │
│   • Map: Leaflet + React-Leaflet                                │
│   • State: Zustand                                              │
│   • Forms: React Hook Form + Zod                                │
│   • PWA: next-pwa                                               │
│                                                                 │
│   Backend                                                       │
│   ─────────────────────────────────────────────────────────    │
│   • Runtime: Next.js API Routes (Edge Runtime)                  │
│   • Database: Supabase (PostgreSQL + PostGIS)                   │
│   • Cache: Supabase Redis (Upstash)                             │
│   • Auth: Supabase Auth                                         │
│                                                                 │
│   AI                                                            │
│   ─────────────────────────────────────────────────────────    │
│   • LLM Orchestration: Dify                                     │
│   • LLM API: Google Gemini Flash                                │
│   • SLM: Ollama (Gemma 2B)                                      │
│   • Embeddings: OpenAI text-embedding-3-small (如需)            │
│                                                                 │
│   Automation                                                    │
│   ─────────────────────────────────────────────────────────    │
│   • Workflow: n8n (Self-hosted on Zeabur)                       │
│   • Scheduling: n8n Cron                                        │
│                                                                 │
│   External APIs                                                 │
│   ─────────────────────────────────────────────────────────    │
│   • Transit: ODPT API                                           │
│   • POI: OpenStreetMap Overpass API                             │
│   • Weather: Japan Meteorological Agency API                    │
│   • Translation: DeepL API                                      │
│   • Maps: Google Maps (導航連結)                                │
│                                                                 │
│   Deployment                                                    │
│   ─────────────────────────────────────────────────────────    │
│   • Platform: Vercel (Frontend)                                 │
│   • Platform: Zeabur (n8n, Ollama)                              │
│   • Domain: Cloudflare                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. 技術選型理由

### 2.1 Frontend

| 技術 | 選擇理由 | 替代方案 |
|------|----------|----------|
| **Next.js 14** | App Router 支援 Server Components，SEO 友善，Vercel 原生支援 | Remix, Nuxt |
| **TypeScript** | 型別安全，減少 runtime 錯誤 | JavaScript |
| **Tailwind CSS** | 快速開發，無 CSS 命名困擾，Bundle 小 | CSS Modules, styled-components |
| **Radix UI** | 無障礙支援完整，headless 可自訂樣式 | Headless UI, Ariakit |
| **Leaflet** | 開源免費，輕量，不需 Google Maps 費用 | Google Maps, Mapbox |
| **Zustand** | 輕量、TypeScript 友善、無 boilerplate | Redux, Jotai, Recoil |

### 2.2 Backend

| 技術 | 選擇理由 | 替代方案 |
|------|----------|----------|
| **Supabase** | PostgreSQL + Auth + Realtime 一站式，免費額度充足 | Firebase, PlanetScale |
| **PostGIS** | 地理空間查詢必需，Supabase 原生支援 | MongoDB GeoJSON |
| **Upstash Redis** | Serverless Redis，與 Vercel 整合佳 | Redis Cloud, Supabase Edge Functions Cache |

### 2.3 AI

| 技術 | 選擇理由 | 替代方案 |
|------|----------|----------|
| **Dify** | LLM 編排簡單，支援 Prompt 版本管理，有 UI | LangChain, Flowise |
| **Gemini Flash** | 成本低（$0.075/1M tokens），速度快，多語言佳 | Claude Haiku, GPT-4o-mini |
| **Ollama + Gemma** | 本地免費，延遲低，隱私安全 | LM Studio, vLLM |

### 2.4 Automation

| 技術 | 選擇理由 | 替代方案 |
|------|----------|----------|
| **n8n** | 開源自架，視覺化 Workflow，支援自訂程式碼 | Zapier, Make, Pipedream |
| **Zeabur** | 台灣團隊，中文支援，部署簡單 | Railway, Render |

---

## 3. 專案結構

```
lutagu/
├── app/                          # Next.js App Router
│   ├── (main)/                   # 主要頁面群組
│   │   ├── page.tsx              # Home (/)
│   │   ├── node/[id]/page.tsx    # Node Detail
│   │   ├── chat/page.tsx         # Chat
│   │   ├── search/page.tsx       # Search
│   │   └── settings/page.tsx     # Settings
│   ├── api/                      # API Routes
│   │   ├── nodes/route.ts
│   │   ├── facilities/route.ts
│   │   ├── l2/route.ts
│   │   ├── chat/route.ts
│   │   └── nudge/route.ts
│   ├── layout.tsx
│   ├── globals.css
│   └── manifest.json             # PWA Manifest
│
├── components/                   # React Components
│   ├── ui/                       # shadcn/ui 基礎元件
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── ...
│   ├── map/                      # 地圖相關
│   │   ├── Map.tsx
│   │   ├── NodeMarker.tsx
│   │   └── ZoneOverlay.tsx
│   ├── node/                     # 節點相關
│   │   ├── NodeCard.tsx
│   │   ├── FacilityList.tsx
│   │   └── POIList.tsx
│   ├── chat/                     # 對話相關
│   │   ├── ChatWindow.tsx
│   │   ├── MessageBubble.tsx
│   │   └── ActionCard.tsx
│   └── layout/                   # 佈局相關
│       ├── Header.tsx
│       ├── BottomSheet.tsx
│       └── SidePanel.tsx
│
├── lib/                          # 核心邏輯
│   ├── ai/                       # AI 處理
│   │   ├── intentRouter.ts       # 意圖路由
│   │   ├── templates.ts          # 模板回應
│   │   ├── businessRules.ts      # 商業導流
│   │   ├── slm.ts                # SLM 呼叫
│   │   ├── llm.ts                # LLM 呼叫
│   │   ├── processor.ts          # 主處理流程
│   │   └── fallback.ts           # 降級策略
│   ├── db/                       # 資料庫
│   │   ├── supabase.ts           # Supabase Client
│   │   ├── redis.ts              # Redis Client
│   │   └── queries.ts            # 常用查詢
│   ├── nodes/                    # 節點處理
│   │   ├── resolver.ts           # 節點解析（含繼承）
│   │   ├── batchResolver.ts      # 批次解析
│   │   └── cache.ts              # 節點快取
│   ├── zone/                     # 圈層判定
│   │   ├── detector.ts           # 圈層偵測
│   │   └── boundaries.ts         # 邊界定義
│   ├── i18n/                     # 多語系
│   │   ├── locales.ts            # 語系定義
│   │   ├── ui-strings.ts         # UI 文字
│   │   └── translate.ts          # 翻譯工具
│   └── utils/                    # 工具函數
│       ├── geo.ts                # 地理計算
│       ├── format.ts             # 格式化
│       └── constants.ts          # 常數
│
├── hooks/                        # React Hooks
│   ├── useLocation.ts            # 位置追蹤
│   ├── useNode.ts                # 節點資料
│   ├── useL2Status.ts            # 即時狀態
│   ├── useChat.ts                # 對話狀態
│   └── useLocale.ts              # 語系
│
├── stores/                       # Zustand Stores
│   ├── appStore.ts               # 全域狀態
│   ├── chatStore.ts              # 對話狀態
│   └── settingsStore.ts          # 設定狀態
│
├── types/                        # TypeScript 型別
│   ├── node.ts
│   ├── facility.ts
│   ├── l2.ts
│   ├── chat.ts
│   └── api.ts
│
├── public/                       # 靜態資源
│   ├── icons/
│   ├── images/
│   └── locales/                  # 靜態翻譯檔
│
├── .env.example                  # 環境變數範例
├── .env.local                    # 本地環境變數（不進版控）
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## 4. 環境變數

### 4.1 必要環境變數

```bash
# .env.example

# ─────────────────────────────────────────────
# Supabase
# ─────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx

# ─────────────────────────────────────────────
# Redis (Upstash)
# ─────────────────────────────────────────────
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx

# ─────────────────────────────────────────────
# AI - Dify
# ─────────────────────────────────────────────
DIFY_API_KEY=app-xxx
DIFY_BASE_URL=https://api.dify.ai/v1

# ─────────────────────────────────────────────
# AI - Gemini (Direct)
# ─────────────────────────────────────────────
GOOGLE_AI_API_KEY=xxx

# ─────────────────────────────────────────────
# AI - Ollama (SLM)
# ─────────────────────────────────────────────
OLLAMA_BASE_URL=http://localhost:11434
# 或 Zeabur 部署的 URL

# ─────────────────────────────────────────────
# External APIs
# ─────────────────────────────────────────────
ODPT_API_KEY=xxx
DEEPL_API_KEY=xxx
JMA_API_KEY=xxx  # 如需要

# ─────────────────────────────────────────────
# App Config
# ─────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=https://lutagu.app
NEXT_PUBLIC_DEFAULT_LOCALE=zh-TW
NEXT_PUBLIC_DEFAULT_CITY=tokyo

# ─────────────────────────────────────────────
# Feature Flags
# ─────────────────────────────────────────────
NEXT_PUBLIC_ENABLE_TRIP_GUARD=true
NEXT_PUBLIC_ENABLE_COMMERCIAL_NUDGE=true
NEXT_PUBLIC_ENABLE_AI_PERSONA=true
```

### 4.2 開發環境 vs 生產環境

| 變數 | 開發環境 | 生產環境 |
|------|----------|----------|
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Zeabur URL |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | `https://lutagu.app` |
| `DIFY_BASE_URL` | Dify Cloud / Self-hosted | Dify Cloud |

---

## 5. 資料流架構

### 5.1 請求處理流程

```
┌─────────────────────────────────────────────────────────────────┐
│                        請求處理流程                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   User Request                                                  │
│        │                                                        │
│        ▼                                                        │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │                    Next.js Edge                          │  │
│   │  ┌─────────┐    ┌─────────┐    ┌─────────┐             │  │
│   │  │Middleware│───▶│  API    │───▶│ Response│             │  │
│   │  │(Auth,i18n)│    │ Routes  │    │         │             │  │
│   │  └─────────┘    └─────────┘    └─────────┘             │  │
│   └─────────────────────────────────────────────────────────┘  │
│                           │                                     │
│        ┌──────────────────┼──────────────────┐                 │
│        ▼                  ▼                  ▼                 │
│   ┌─────────┐       ┌─────────┐       ┌─────────┐            │
│   │Supabase │       │  Redis  │       │   AI    │            │
│   │(冷/溫)  │       │(熱數據) │       │ Engine  │            │
│   └─────────┘       └─────────┘       └─────────┘            │
│                                             │                   │
│                          ┌──────────────────┤                   │
│                          ▼                  ▼                   │
│                    ┌─────────┐       ┌─────────┐              │
│                    │  Rule   │       │SLM/LLM  │              │
│                    │ Engine  │       │         │              │
│                    └─────────┘       └─────────┘              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 快取策略

```typescript
// lib/cache/strategy.ts

export const CACHE_STRATEGY = {
  // 節點資料（冷數據）
  node: {
    source: 'supabase',
    ttl: 5 * 60,  // 5 分鐘本地快取
    staleWhileRevalidate: true,
  },

  // L2 即時狀態（熱數據）
  l2Status: {
    source: 'redis',
    ttl: 0,  // 不快取，直接讀 Redis
    staleWhileRevalidate: false,
  },

  // L3 設施（溫數據）
  facilities: {
    source: 'supabase',
    ttl: 10 * 60,  // 10 分鐘
    staleWhileRevalidate: true,
  },

  // AI 回應
  aiResponse: {
    source: 'none',  // 不快取
    ttl: 0,
    staleWhileRevalidate: false,
  },
};
```

---

## 6. API 設計

### 6.1 API 端點

| 端點 | 方法 | 說明 |
|------|------|------|
| `/api/nodes` | GET | 取得節點列表 |
| `/api/nodes/[id]` | GET | 取得單一節點（含繼承） |
| `/api/nodes/nearest` | GET | 取得最近節點 |
| `/api/facilities` | GET | 取得設施列表 |
| `/api/l2/[nodeId]` | GET | 取得即時狀態 |
| `/api/chat` | POST | AI 對話 |
| `/api/nudge/click` | POST | 記錄導流點擊 |

### 6.2 API 回應格式

```typescript
// 統一回應格式
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    timestamp: string;
    requestId: string;
    zone?: 'core' | 'buffer' | 'outer';
  };
}

// 範例
const response: ApiResponse<Node> = {
  success: true,
  data: {
    id: 'ueno',
    name: { 'zh-TW': '上野站', ... },
    // ...
  },
  meta: {
    timestamp: '2025-12-22T10:00:00Z',
    requestId: 'req_abc123',
    zone: 'core',
  },
};
```

---

## 7. 外部服務整合

### 7.1 ODPT API

```typescript
// lib/external/odpt.ts

const ODPT_BASE_URL = 'https://api.odpt.org/api/v4';

export async function getTrainInformation(lineId?: string) {
  const url = new URL(`${ODPT_BASE_URL}/odpt:TrainInformation`);
  url.searchParams.set('acl:consumerKey', process.env.ODPT_API_KEY!);

  if (lineId) {
    url.searchParams.set('odpt:railway', `odpt.Railway:${lineId}`);
  }

  const response = await fetch(url.toString());
  return response.json();
}

export async function getStationInfo(stationId: string) {
  const url = new URL(`${ODPT_BASE_URL}/odpt:Station`);
  url.searchParams.set('acl:consumerKey', process.env.ODPT_API_KEY!);
  url.searchParams.set('owl:sameAs', `odpt.Station:${stationId}`);

  const response = await fetch(url.toString());
  return response.json();
}
```

### 7.2 Overpass API

```typescript
// lib/external/overpass.ts

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

export async function queryNearbyPOIs(
  lat: number,
  lng: number,
  radius: number = 200,
  categories: string[]
) {
  const categoryQueries = categories.map(cat =>
    `node["${cat}"](around:${radius},${lat},${lng});`
  ).join('\n');

  const query = `
    [out:json][timeout:30];
    (
      ${categoryQueries}
    );
    out body;
  `;

  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    body: query,
  });

  return response.json();
}
```

### 7.3 DeepL API

```typescript
// lib/external/deepl.ts

const DEEPL_URL = 'https://api.deepl.com/v2/translate';

export async function translate(
  text: string,
  sourceLang: string,
  targetLang: string
) {
  const response = await fetch(DEEPL_URL, {
    method: 'POST',
    headers: {
      'Authorization': `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: [text],
      source_lang: sourceLang.toUpperCase(),
      target_lang: mapToDeepLLang(targetLang),
    }),
  });

  const data = await response.json();
  return data.translations[0].text;
}

function mapToDeepLLang(locale: string): string {
  const mapping: Record<string, string> = {
    'zh-TW': 'ZH',
    'ja': 'JA',
    'en': 'EN-US',
  };
  return mapping[locale] || locale.toUpperCase();
}
```

---

## 8. 開發指令

### 8.1 Package Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:e2e": "playwright test",
    "db:generate": "supabase gen types typescript --local > types/database.ts",
    "db:push": "supabase db push",
    "db:reset": "supabase db reset"
  }
}
```

### 8.2 開發流程

```bash
# 1. Clone & Install
git clone https://github.com/xxx/lutagu.git
cd lutagu
pnpm install

# 2. 設定環境變數
cp .env.example .env.local
# 編輯 .env.local

# 3. 啟動 Supabase Local
supabase start

# 4. 產生 DB 型別
pnpm db:generate

# 5. 啟動開發伺服器
pnpm dev

# 6. 啟動 Ollama (另一個終端)
ollama serve
ollama pull gemma2:2b
```

---

## 9. 部署流程

### 9.1 Vercel 部署

```bash
# 安裝 Vercel CLI
npm i -g vercel

# 連結專案
vercel link

# 設定環境變數
vercel env add SUPABASE_SERVICE_ROLE_KEY
# ... 其他變數

# 部署
vercel --prod
```

### 9.2 Zeabur 部署 (n8n, Ollama)

```yaml
# zeabur.yaml
services:
  n8n:
    image: n8nio/n8n
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=${N8N_USER}
      - N8N_BASIC_AUTH_PASSWORD=${N8N_PASSWORD}
    ports:
      - 5678:5678

  ollama:
    image: ollama/ollama
    ports:
      - 11434:11434
    volumes:
      - ollama_models:/root/.ollama
```

---

## 10. 效能最佳化

### 10.1 Bundle 優化

```javascript
// next.config.js
module.exports = {
  experimental: {
    optimizePackageImports: ['@radix-ui/react-icons', 'lodash'],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
  },
};
```

### 10.2 API 路由優化

```typescript
// 使用 Edge Runtime
export const runtime = 'edge';

// 設定快取
export const revalidate = 60; // 60 秒 ISR
```

---

*版本：v3.0 | 最後更新：2025-12-22*
