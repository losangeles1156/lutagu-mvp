# LUTAGU MVP - AI Agent Development Rules
# AI 代理人開發規則手冊
# 版本：v1.0
# 適用對象：Claude Code、Cursor、Trae 及其他 AI 輔助開發工具

---

## 目錄

1. [安全風險防範](#1-安全風險防範-security-risk-prevention)
2. [程式碼編寫規範](#2-程式碼編寫規範-coding-standards)
3. [效率與快取策略](#3-效率與快取策略-efficiency--caching)
4. [專案架構規則](#4-專案架構規則-project-architecture)
5. [API 開發規範](#5-api-開發規範-api-development)
6. [資料庫操作規則](#6-資料庫操作規則-database-operations)
7. [AI/LLM 整合規則](#7-aillm-整合規則-ai-integration)
8. [測試與品質保證](#8-測試與品質保證-testing--qa)
9. [禁止事項清單](#9-禁止事項清單-prohibited-actions)
10. [快速參考](#10-快速參考-quick-reference)

---

## 1. 安全風險防範 (Security Risk Prevention)

### 1.1 機密資訊處理 (CRITICAL)

#### 絕對禁止
```typescript
// ❌ 禁止：硬編碼任何 API 密鑰
const apiKey = "app-abc123xyz789";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";

// ❌ 禁止：在日誌中輸出敏感資訊
console.log(`Using API key: ${process.env.DIFY_API_KEY}`);

// ❌ 禁止：在錯誤訊息中暴露內部資訊
throw new Error(`Database connection failed: ${connectionString}`);
```

#### 正確做法
```typescript
// ✅ 正確：從環境變數讀取
const apiKey = process.env.DIFY_API_KEY;
if (!apiKey) {
  throw new Error('DIFY_API_KEY is not configured');
}

// ✅ 正確：安全的日誌記錄
console.log('API request initiated');

// ✅ 正確：通用錯誤訊息
throw new Error('Database connection failed. Check server logs for details.');
```

### 1.2 環境變數清單

以下環境變數為機密，**絕不可**出現在程式碼或文檔中：

| 變數名稱 | 用途 | 風險等級 |
|---------|------|---------|
| `SUPABASE_SERVICE_KEY` | 資料庫完整存取權 | 🔴 極高 |
| `PII_ENCRYPTION_KEY_BASE64` | PII 加密金鑰 | 🔴 極高 |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE 訊息 API | 🔴 極高 |
| `MISTRAL_API_KEY` | LLM API | 🟠 高 |
| `ODPT_API_KEY_*` | 交通數據 API | 🟡 中 |
| `ACTIVITY_HASH_SALT` | 活動日誌鹽值 | 🟠 高 |

### 1.3 SQL 注入防護

```typescript
// ❌ 禁止：字串拼接 SQL
const query = `SELECT * FROM nodes WHERE id = '${userId}'`;

// ✅ 正確：使用參數化查詢
const { data } = await supabase
  .from('nodes')
  .select('*')
  .eq('id', userId);

// ✅ 正確：使用 RPC 函數
const { data } = await supabase.rpc('get_nearby_nodes', {
  lat: latitude,
  lon: longitude,
  radius_meters: 500
});
```

### 1.4 XSS 防護

```typescript
// ❌ 禁止：直接渲染用戶輸入
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ 正確：使用 React 自動轉義
<div>{userInput}</div>

// ✅ 正確：需要 HTML 時使用安全套件
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />
```

### 1.5 API 速率限制

所有公開 API 端點必須實作速率限制：

```typescript
import { checkRateLimit } from '@/lib/security/rateLimit';

export async function GET(request: NextRequest) {
  const ctx = getRequestContext(request);

  // 檢查速率限制
  const limitResult = await checkRateLimit(ctx.visitorId, {
    capacity: 100,
    refillRate: 10, // 每秒 10 個請求
  });

  if (!limitResult.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }

  // 繼續處理請求...
}
```

### 1.6 審計日誌

所有敏感操作必須記錄審計日誌：

```typescript
import { logAuditEvent } from '@/lib/security/audit';

// 記錄管理員操作
await logAuditEvent({
  actorUserId: userId,
  action: 'UPDATE',
  resourceType: 'node',
  resourceId: nodeId,
  changes: { before: oldData, after: newData },
  ipHash: ctx.ipHash,
});
```

---

## 2. 程式碼編寫規範 (Coding Standards)

### 2.1 命名慣例

| 類型 | 格式 | 範例 |
|------|------|------|
| 檔案 | kebab-case | `city-adapter.ts`, `rate-limit.ts` |
| 函數/變數 | camelCase | `resolveNodePersona`, `visitorId` |
| 常數 | UPPER_SNAKE_CASE | `ODPT_API_KEY`, `MAX_RETRY_COUNT` |
| 型別/介面 | PascalCase | `NodePersona`, `ActionCard` |
| React 元件 | PascalCase | `MapContainer`, `ChatInterface` |
| CSS 類別 | kebab-case | `action-card`, `nav-button` |

### 2.2 TypeScript 嚴格模式

```typescript
// ✅ 必須明確定義型別
interface NodeResponse {
  id: string;
  name: LocalizedText;
  location: GeoJSON.Point;
  node_type: 'hub' | 'spoke';
}

// ✅ 禁止使用 any
function processNode(node: NodeResponse): ProcessedNode {
  // ...
}

// ❌ 禁止
function processNode(node: any) { ... }
```

### 2.3 多語系處理

所有面向用戶的文字必須支援多語系：

```typescript
// ✅ 正確：使用多語系結構
interface LocalizedText {
  'zh-TW': string;
  'ja'?: string;
  'en'?: string;
}

function getLocalizedName(
  name: LocalizedText,
  locale: 'zh-TW' | 'ja' | 'en'
): string {
  return name[locale] || name['zh-TW'] || Object.values(name)[0];
}

// ❌ 禁止：硬編碼單語系文字
const title = "上野車站"; // 錯誤
```

### 2.4 錯誤處理

```typescript
// ✅ 正確：具體且有意義的錯誤處理
try {
  const result = await fetchODPTData(stationId);
  return result;
} catch (error) {
  // 記錄詳細錯誤（內部）
  console.error('[ODPT] Fetch failed:', {
    stationId,
    error: error instanceof Error ? error.message : 'Unknown error',
  });

  // 返回通用錯誤（外部）
  throw new APIError('Unable to fetch station data', 503);
}

// ❌ 禁止：吞掉錯誤
try {
  await riskyOperation();
} catch (e) {
  // 什麼都不做
}
```

### 2.5 檔案組織

```
src/
├── app/
│   ├── [locale]/          # 多語系頁面
│   └── api/               # API 路由
│       ├── l1/            # L1 地點 API
│       ├── l2/            # L2 即時狀態 API
│       ├── l3/            # L3 設施 API
│       └── l4/            # L4 策略 API
├── components/
│   ├── ui/                # 通用 UI 元件
│   ├── map/               # 地圖相關元件
│   └── chat/              # 聊天介面元件
├── lib/
│   ├── security/          # 安全模組
│   ├── cache/             # 快取服務
│   ├── ai/                # AI 服務
│   └── odpt/              # ODPT 客戶端
└── types/                 # 全局型別定義
```

---

## 3. 效率與快取策略 (Efficiency & Caching)

### 3.1 快取層級結構

```
┌─────────────────────────────────────────────────────┐
│              快取層級 (Cache Tiers)                  │
├─────────────────────────────────────────────────────┤
│ L1: 記憶體快取 (In-Memory)                          │
│     TTL: 15 秒 | 用途: 視口節點、即時狀態           │
├─────────────────────────────────────────────────────┤
│ L2: Redis 分散式快取                                │
│     TTL: 5 分鐘 | 用途: API 回應、中間結果          │
├─────────────────────────────────────────────────────┤
│ L3: Supabase KV                                     │
│     TTL: 20 分鐘 | 用途: L2 即時狀態、向量嵌入     │
├─────────────────────────────────────────────────────┤
│ L4: 資料庫 (PostgreSQL)                             │
│     永久 | 用途: 主數據、歷史記錄                   │
└─────────────────────────────────────────────────────┘
```

### 3.2 快取使用規則

```typescript
import { cacheService } from '@/lib/cache/cacheService';

// ✅ 正確：先查快取，再查資料庫
async function getNodeData(nodeId: string): Promise<Node> {
  const cacheKey = `node:${nodeId}`;

  // 1. 嘗試從快取讀取
  const cached = await cacheService.get<Node>(cacheKey);
  if (cached) {
    return cached;
  }

  // 2. 從資料庫查詢
  const node = await fetchFromDatabase(nodeId);

  // 3. 寫入快取
  await cacheService.set(cacheKey, node, { ttl: 300 });

  return node;
}

// ❌ 禁止：每次都查詢資料庫
async function getNodeData(nodeId: string): Promise<Node> {
  return await fetchFromDatabase(nodeId); // 無快取
}
```

### 3.3 批次處理

```typescript
// ✅ 正確：批次查詢
async function getMultipleNodes(nodeIds: string[]): Promise<Node[]> {
  const { data } = await supabase
    .from('nodes')
    .select('*')
    .in('id', nodeIds);
  return data;
}

// ❌ 禁止：迴圈逐一查詢
async function getMultipleNodes(nodeIds: string[]): Promise<Node[]> {
  const results = [];
  for (const id of nodeIds) {
    const node = await getNodeById(id); // N+1 查詢問題
    results.push(node);
  }
  return results;
}
```

### 3.4 防止重複 API 調用

```typescript
// ✅ 正確：使用 Promise 去重
const pendingRequests = new Map<string, Promise<any>>();

async function fetchWithDedup<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  // 如果已有相同請求在進行中，直接返回該 Promise
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key) as Promise<T>;
  }

  const promise = fetcher().finally(() => {
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, promise);
  return promise;
}
```

### 3.5 外部 API 調用規則

| API 類型 | 最大頻率 | 快取 TTL | 備註 |
|---------|---------|----------|------|
| ODPT 即時狀態 | 1 次/分鐘 | 60 秒 | 使用批次端點 |
| OpenWeather | 1 次/10分鐘 | 600 秒 | 單一區域 |
| GBFS 共享單車 | 1 次/分鐘 | 60 秒 | 位置敏感 |
| Mistral LLM | 依預算 | 不快取 | 追蹤成本 |
| Dify Agent | 依預算 | 不快取 | 追蹤成本 |

---

## 4. 專案架構規則 (Project Architecture)

### 4.1 四層標籤系統 (LUTAGU Tagging Engine)

**理解並遵守四層分離原則：**

```
┌─────────────────────────────────────────────────────┐
│ L4: 行動策略層 (Strategy)                           │
│     AI 綜合 L1-L3 生成最終建議                      │
│     輸出: Action Cards (最多 3 張)                  │
├─────────────────────────────────────────────────────┤
│ L3: 環境機能層 (Micro-Facilities)                   │
│     供給標籤: has_locker, has_wifi, has_elevator    │
│     適用標籤: good_for_waiting, luggage_friendly    │
├─────────────────────────────────────────────────────┤
│ L2: 即時狀態層 (Live Status)                        │
│     動態變數: 延誤、擁擠度、天氣                    │
│     TTL: 20 分鐘                                    │
├─────────────────────────────────────────────────────┤
│ L1: 地點基因層 (Location DNA)                       │
│     靜態屬性: 位置、類型、路線                      │
│     Hub/Spoke 繼承架構                              │
└─────────────────────────────────────────────────────┘
```

### 4.2 Hub/Spoke 繼承規則

```typescript
// Hub 節點 (10-15 個核心節點)
interface HubNode {
  id: string;
  node_type: 'hub';
  personality: string;  // 手工撰寫的 Persona Prompt
  // ...
}

// Spoke 節點 (數百個子節點)
interface SpokeNode {
  id: string;
  node_type: 'spoke';
  parent_hub_id: string;  // 繼承最近 Hub 的人格
  // personality 由系統自動繼承
}

// ✅ 正確：透過演算法找最近 Hub
function findNearestHub(spokeLocation: GeoJSON.Point): string {
  // 使用 PostGIS 空間查詢
  return nearestHubId;
}

// ❌ 禁止：手動指定每個 Spoke 的 Hub
```

### 4.3 商業邏輯優先

L4 建議必須考慮商業導流：

```typescript
interface ActionCard {
  type: 'transit' | 'taxi' | 'shared_mobility';
  title: LocalizedText;
  description: LocalizedText;
  deepLink?: string;  // 商業夥伴連結
  confidence: number;
}

// ✅ 正確：提供商業替代方案
const cards: ActionCard[] = [
  { type: 'transit', title: {...}, deepLink: null },
  { type: 'taxi', title: {...}, deepLink: 'https://go.mo-t.com/...' },  // GO Taxi
  { type: 'shared_mobility', title: {...}, deepLink: 'https://luup.sc/...' }, // LUUP
];
```

---

## 5. API 開發規範 (API Development)

### 5.1 路由結構

```typescript
// src/app/api/[layer]/[resource]/route.ts

// 範例: /api/l1/nodes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@/lib/security/requestContext';
import { checkRateLimit } from '@/lib/security/rateLimit';

export async function GET(request: NextRequest) {
  try {
    // 1. 安全檢查
    const ctx = getRequestContext(request);
    await checkRateLimit(ctx.visitorId);

    // 2. 參數驗證
    const searchParams = request.nextUrl.searchParams;
    const nodeId = searchParams.get('id');
    if (!nodeId) {
      return NextResponse.json({ error: 'Missing node ID' }, { status: 400 });
    }

    // 3. 業務邏輯
    const data = await fetchNodeData(nodeId);

    // 4. 成功回應
    return NextResponse.json({
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        cached: false,
      }
    });

  } catch (error) {
    // 5. 錯誤處理
    console.error('[API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 5.2 回應格式標準

```typescript
// 成功回應
interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    timestamp: string;
    cached: boolean;
    pagination?: {
      page: number;
      limit: number;
      total: number;
    };
  };
}

// 錯誤回應
interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, string[]>;
}
```

### 5.3 API 端點命名

```
GET    /api/l1/nodes          # 列出節點
GET    /api/l1/nodes/[id]     # 取得單一節點
POST   /api/l1/nodes          # 建立節點 (需認證)
PATCH  /api/l1/nodes/[id]     # 更新節點 (需認證)
DELETE /api/l1/nodes/[id]     # 刪除節點 (需認證)

GET    /api/l2/status         # 取得即時狀態
GET    /api/l3/facilities     # 取得設施資訊
POST   /api/l4/recommend      # 取得 AI 建議
```

---

## 6. 資料庫操作規則 (Database Operations)

### 6.1 Supabase 客戶端使用

```typescript
// ✅ 正確：使用服務端客戶端（需要完整權限時）
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// ✅ 正確：使用公開客戶端（前端或公開 API）
import { supabase } from '@/lib/supabase';
```

### 6.2 查詢優化

```typescript
// ✅ 正確：只選取需要的欄位
const { data } = await supabase
  .from('nodes')
  .select('id, name, location')
  .eq('node_type', 'hub');

// ❌ 禁止：選取所有欄位（除非必要）
const { data } = await supabase
  .from('nodes')
  .select('*');

// ✅ 正確：使用空間查詢 RPC
const { data } = await supabase.rpc('get_nearby_nodes', {
  lat: 35.7,
  lon: 139.77,
  radius_meters: 1000,
});
```

### 6.3 交易處理

```typescript
// ✅ 正確：使用 RPC 進行交易
const { data, error } = await supabase.rpc('transfer_node_ownership', {
  node_id: nodeId,
  new_owner_id: newOwnerId,
});

// 在 SQL 中定義交易邏輯
// CREATE FUNCTION transfer_node_ownership(...)
// BEGIN
//   UPDATE nodes SET owner_id = new_owner_id WHERE id = node_id;
//   INSERT INTO audit_logs (...) VALUES (...);
// END;
```

### 6.4 多語系欄位

```sql
-- ✅ 正確：JSONB 多語系結構
CREATE TABLE nodes (
  id text PRIMARY KEY,
  name jsonb NOT NULL,  -- {"zh-TW": "上野站", "ja": "上野駅", "en": "Ueno Station"}
  description jsonb
);

-- 查詢特定語系
SELECT name->>'zh-TW' as name_zh FROM nodes WHERE id = 'ueno';
```

---

## 7. AI/LLM 整合規則 (AI Integration)

### 7.1 成本控制

```typescript
// ✅ 正確：追蹤 LLM 成本
import { trackLLMUsage } from '@/lib/ai/costTracker';

async function callLLM(prompt: string): Promise<string> {
  const startTime = Date.now();

  const response = await mistralClient.chat({
    model: process.env.AI_LLM_MODEL,
    messages: [{ role: 'user', content: prompt }],
  });

  // 追蹤使用量
  await trackLLMUsage({
    model: process.env.AI_LLM_MODEL,
    inputTokens: response.usage.prompt_tokens,
    outputTokens: response.usage.completion_tokens,
    latencyMs: Date.now() - startTime,
  });

  return response.choices[0].message.content;
}
```

### 7.2 混合引擎策略

```typescript
// ✅ 正確：遵循分層決策
async function processQuery(query: string): Promise<Response> {
  // 1. 模板匹配層 (50% 命中率，0.1ms)
  const templateMatch = matchTemplate(query);
  if (templateMatch) {
    return templateMatch;
  }

  // 2. 演算法層 (26% 命中率，1-5ms)
  const algorithmResult = await runAlgorithm(query);
  if (algorithmResult) {
    return algorithmResult;
  }

  // 3. LLM 回退 (24% 命中率，100-500ms)
  return await callLLM(query);
}
```

### 7.3 Prompt 管理

```typescript
// ✅ 正確：集中管理 Prompt
// src/lib/ai/prompts/index.ts
export const PROMPTS = {
  NAVIGATION_ADVISOR: `你是 LUTAGU 智慧導航員...`,
  INTENT_CLASSIFIER: `分析用戶意圖...`,
  STRATEGY_GENERATOR: `根據以下情境生成建議...`,
};

// ❌ 禁止：在程式碼中散落硬編碼 Prompt
```

### 7.4 向量嵌入

```typescript
// ✅ 正確：批次處理嵌入
async function embedDocuments(docs: string[]): Promise<number[][]> {
  // 批次處理，避免逐一調用
  const response = await mistralClient.embeddings({
    model: 'mistral-embed',
    input: docs,
  });
  return response.data.map(d => d.embedding);
}
```

---

## 8. 測試與品質保證 (Testing & QA)

### 8.1 測試檔案命名

```
src/
├── lib/
│   ├── tagging/
│   │   ├── TagEngine.ts
│   │   └── TagEngine.test.ts     # 單元測試
├── tests/
│   ├── integration/
│   │   └── api.test.ts           # 整合測試
│   └── e2e/
│       └── navigation.test.ts    # 端對端測試
```

### 8.2 測試覆蓋要求

| 類型 | 覆蓋率目標 | 優先級 |
|------|-----------|--------|
| 安全模組 | 90%+ | 🔴 必要 |
| API 路由 | 80%+ | 🔴 必要 |
| 核心業務邏輯 | 80%+ | 🔴 必要 |
| 工具函數 | 70%+ | 🟡 建議 |
| UI 元件 | 60%+ | 🟢 可選 |

### 8.3 執行測試

```bash
# 單元測試
npm test

# 整合測試
npm run qa:upgrade

# 類型檢查
npm run typecheck

# 程式碼檢查
npm run lint
```

---

## 9. 禁止事項清單 (Prohibited Actions)

### 9.1 安全相關 (CRITICAL)

- ❌ **絕對禁止**在程式碼中硬編碼任何 API 密鑰或機密
- ❌ **絕對禁止**在日誌中輸出 PII（個人識別資訊）
- ❌ **絕對禁止**使用字串拼接 SQL 查詢
- ❌ **絕對禁止**直接渲染未消毒的用戶輸入
- ❌ **絕對禁止**在錯誤訊息中暴露內部實作細節
- ❌ **絕對禁止**停用速率限制
- ❌ **絕對禁止**跳過身份驗證檢查

### 9.2 效能相關

- ❌ **禁止**在迴圈中執行資料庫查詢 (N+1 問題)
- ❌ **禁止**忽略快取直接查詢資料庫
- ❌ **禁止**同步阻塞主線程
- ❌ **禁止**無限制地調用外部 API
- ❌ **禁止** SELECT * 查詢（除非確實需要所有欄位）

### 9.3 架構相關

- ❌ **禁止**繞過四層標籤系統架構
- ❌ **禁止**手動指定 Spoke 節點的 Hub（應使用演算法）
- ❌ **禁止**在 L4 建議中省略商業替代方案
- ❌ **禁止**使用硬編碼的單語系文字
- ❌ **禁止**在前端暴露 SUPABASE_SERVICE_KEY

### 9.4 程式碼品質

- ❌ **禁止**使用 `any` 型別（除非有充分理由並註解）
- ❌ **禁止**吞掉例外（空的 catch 區塊）
- ❌ **禁止**提交未通過測試的程式碼
- ❌ **禁止**提交含有 `console.log` 除錯輸出的程式碼
- ❌ **禁止**忽略 TypeScript 編譯錯誤

---

## 10. 快速參考 (Quick Reference)

### 10.1 專案技術棧

```
前端: Next.js 14 + TypeScript + Tailwind CSS + Zustand
後端: Next.js API Routes + Supabase (PostgreSQL + PostGIS)
快取: Redis + Supabase KV
AI:   Mistral + Dify + Gemini
認證: Supabase Auth
通知: LINE Messaging API
```

### 10.2 重要檔案位置

```
設定檔:
├── .env.example              # 環境變數範本
├── next.config.js            # Next.js 設定
├── tsconfig.json             # TypeScript 設定
└── tailwind.config.ts        # Tailwind 設定

核心邏輯:
├── src/lib/ai/               # AI 服務
├── src/lib/security/         # 安全模組
├── src/lib/cache/            # 快取服務
├── src/lib/odpt/             # 交通數據
└── src/lib/l4/               # L4 策略引擎

規則文件:
├── CLAUDE.md                 # 本文件
├── rules/lutagu_project_rules.md
├── SECURITY.md
└── DEVELOPMENT_GUIDE.md
```

### 10.3 常用指令

```bash
# 開發
npm run dev              # 啟動開發伺服器
npm run build            # 生產構建
npm run typecheck        # 類型檢查
npm run lint             # 程式碼檢查
npm test                 # 執行測試
npm run qa:upgrade       # 整合測試

# 資料
npm run crawl:l1         # 抓取 ODPT 數據
npm run crawl:l3         # 抓取設施數據
```

### 10.4 聯絡與問題回報

發現安全問題請立即通知專案負責人。

---

*本文件為 AI 代理人開發的核心規則檔*
*版本 v1.0 | 最後更新: 2026-01-11*
