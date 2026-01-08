# AI Agent 決策核心建置方案評估報告

> **評估日期**: 2026-01-05  
> **專案名稱**: LUTAGU(ルタグ) - 東京交通 AI 導航助手  
> **評估範圍**: L4 Strategy Agent（策略決策層）大腦建置方案比較

---

## 1. 專案現況總覽

### 1.1 專案定位與核心價值

LUTAGU 是一個專注於東京交通決策支援的 AI 導航服務，定位為「城市感性導航服務」。與傳統地圖應用（如 Google Maps 或乘換案內）的最大差異在於：不僅提供「查得到」的資訊，更提供「知道該怎麼做」的判斷與決策建議。目標用戶是**不熟悉日本交通邏輯的外國旅客**，解決的核心問題是填補「知識門檻」——台灣沒有「直通運轉」、「並結運行」、「振替輸送」等概念，即便查得到資料，也不知道該查什麼、怎麼判斷。

### 1.2 技術架構全景

| 層級 | 技術選型 | 說明 |
|------|----------|------|
| **前端框架** | Next.js 14 (App Router) + TypeScript | React 18，生態系成熟，SSR/ISR 支援完善 |
| **UI 組件庫** | Radix UI + Tailwind CSS | 可訪問性優先，響應式設計 |
| **地圖引擎** | React Leaflet + OpenStreetMap | 無須 Google Maps API 費用，開源免費 |
| **狀態管理** | Zustand | 輕量級，無 boilerplate |
| **資料庫** | Supabase (PostgreSQL + PostGIS) | 地理空間查詢能力強，支援 Row Level Security |
| **AI 整合** | Dify API (現況) / 自建 Agent (評估中) | RAG + Agents 混合模式 |
| **LLM 提供商** | Google Generative AI + Mistral AI | 多模型備援策略 |
| **部署平台** | Vercel (前端) + Zeabur (規劃中) | Vercel 與 Next.js 原生整合，Zeabur 支援 Docker 部署 |
| **自動化工具** | n8n + Puppeteer | 工作流程自動化與網頁爬蟲 |

### 1.3 四層數據架構

```
┌─────────────────────────────────────────────────────────────────┐
│                    L4 Strategy Agent (大腦)                       │
│              綜合決策 + 感性建議 + 策略推薦                        │
├─────────────────────────────────────────────────────────────────┤
│                    L3 Facility Graph                             │
│           車站設施 + 無障礙路徑 + 站內步行網絡                      │
├─────────────────────────────────────────────────────────────────┤
│                    L2 Live Sense                                 │
│           即時運行狀況 + 天氣 + 擁擠度 + 異常事件                   │
├─────────────────────────────────────────────────────────────────┤
│                    L1 Location DNA                               │
│         靜態地理資訊 + POI + 站點標籤 + 設施標註                   │
└─────────────────────────────────────────────────────────────────┘
```

L4 Agent 的職責是將 L1-L3 的結構化數據與使用者情境結合，產生**具有判斷力的建議**。例如：當用户詢問「如何從上野去迪士尼」時，系統需綜合即時運行狀況（L2）、推車/行李需求（L3）、替代路線選項（L1），給出「建議預留 15-20 分鐘，地下通道拖行李會很累」的具體建議。

---

## 2. 現有 Dify 整合狀態診斷

### 2.1 已完成的 Dify 整合工作

基於專案文件分析，團隊已投入相當資源建立 Dify 整合基礎：

| 整合面向 | 檔案/資源 | 完成度 | 備註 |
|----------|----------|--------|------|
| **Agent Prompt 設計** | [`dify/lutagu_agent_prompt.md`](dify/lutagu_agent_prompt.md) | ✅ 完整 | 包含角色定義、工具調用原則、常見問題範本 |
| **工具定義** | [`dify/lutagu_tools_v2.json`](dify/lutagu_tools_v2.json) | ✅ 完整 | 6 個工具：車站資訊、路徑搜尋、氣象警報、專家知識等 |
| **API 工具定義** | [`dify/openapi_tools_v5.yaml`](dify/openapi_tools_v5.yaml) | ✅ 完整 | OpenAPI 格式，可直接匯入 Dify |
| **Dify App 配置** | [`dify_import/lutagu_agent.yml`](dify_import/lutagu_agent.yml) | ✅ 完整 | 包含 RAG 知識庫變數、對話提示模板 |
| **RAG 知識庫** | [`dify_import/station_wisdom_rag.txt`](dify_import/station_wisdom_rag.txt) | ⚠️ 需擴充 | 站點智慧知識待持續積累 |

### 2.2 現有 Agent 設計特色

從 [`dify/lutagu_agent_prompt.md`](dify/lutagu_agent_prompt.md) 可看出，Agent 設計已考慮多個關鍵議題：

1. **Lazy Calling 原則**：能不調用工具就不調用，優先用已知資訊回答
2. **Token Guard 機制**：回覆控制在 50-150 tokens，避免冗長
3. **工具數量限制**：禁止一次調用 3 個以上工具，控制延遲
4. **範本化回答**：常見問題直接使用預設範本，不浪費 LLM 調用
5. **情境感知**：支援輪椅/嬰兒推車/行李等用戶情境注入

### 2.3 現況評估結論

- **優勢**：已完成約 60-70% 的 Dify 整合工作，團隊熟悉 Dify 操作
- **痛點**：目前使用 Dify Cloud API，存在供應商依賴與隱私顧慮
- **需求**：考慮將 Dify 部署遷移至本地（Zeabur）以獲得更大控制權

---

## 3. 方案 A：自行建置 Agent 決策核心

### 3.1 技術實現方案

**3.1.1 核心架構設計**

```
                    ┌─────────────────────────────────────┐
                    │         API Gateway (Next.js)        │
                    │      認證、流量控制、請求路由          │
                    └─────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
            ┌───────────┐   ┌───────────┐   ┌───────────┐
            │ Context   │   │ Agent     │   │ Response  │
            │ Builder   │──▶│ Engine    │──▶│ Generator │
            │ (L1-L3)   │   │ (LangChain│   │           │
            │           │   │  /LlamaIndex)          │
            └───────────┘   └───────────┘   └───────────┘
                    │               │
                    ▼               ▼
            ┌───────────┐   ┌───────────┐
            │ Cache     │   │ Tool      │
            │ (Redis)   │   │ Executor  │
            └───────────┘   └───────────┘
```

**3.1.2 推薦技術棧**

| 元件 | 選型建議 | 理由 |
|------|----------|------|
| **Agent Framework** | LangChain.js 或 LlamaIndex | 生態系完整，工具調用機制成熟 |
| **LLM 調用層** | Vercel AI SDK | 與 Next.js 整合最佳，支援流式輸出 |
| **向量資料庫** | Supabase pgvector | 善用現有 Supabase，降低維運負擔 |
| **快取層** | Vercel KV (Redis) | Agent 對話狀態快取，TTL 控制 |
| **工作流程** | In-house DSL | 完全客製化，符合 LUTAGU 特定需求 |

**3.1.3 核心模組設計**

```typescript
// Agent Engine 核心介面 (示例)
interface AgentEngine {
  // 對話理解與意圖分類
  understand(input: UserMessage): Promise<Intent>;
  
  // 上下文建構 (L1-L3 數據聚合)
  buildContext(intent: Intent, session: Session): Promise<AgentContext>;
  
  // 工具調用協調
  executeTools(tools: ToolCall[]): Promise<ToolResult[]>;
  
  // 回覆生成 (含 RAG 檢索)
  generate(context: AgentContext, tools: ToolResult[]): Promise<Response>;
}

// LUTAGU 特有決策邏輯
class LutaguDecisionEngine implements AgentEngine {
  private decisionRules: DecisionRule[];
  private personaPrompts: Map<StationID, string>;
  
  async makeDecision(
    context: AgentContext, 
    options: RouteOption[]
  ): Promise<Recommendation> {
    // 根據用戶類型 (輪椅/行李/推車) 過濾選項
    // 結合即時狀態 (L2) 調整權重
    // 注入站點特定智慧 (L3 + RAG)
    // 產出結構化建議
  }
}
```

### 3.2 自行建置方案優勢

| 維度 | 評估 | 說明 |
|------|------|------|
| **架構契合度** | ⭐⭐⭐⭐⭐ | 完全針對 LUTAGU 需求設計，L1-L4 整合最佳化 |
| **擴展性** | ⭐⭐⭐⭐⭐ | 無供應商限制，可任意擴充工具與模型 |
| **定制化程度** | ⭐⭐⭐⭐⭐ | Agent 行為、決策邏輯、Prompt 完全可控 |
| **數據控制** | ⭐⭐⭐⭐⭐ | 所有對話數據存在自有基礎設施 |
| **長期成本** | ⭐⭐⭐⭐ | 規模化後邊際成本趨於零 |
| **部署彈性** | ⭐⭐⭐⭐⭐ | 可部署至任何支援 Docker 的平台 |

### 3.3 自行建置方案劣勢

| 維度 | 評估 | 說明 |
|------|------|------|
| **初期開發成本** | ⭐⭐ | 需要 4-6 週全職開發 (含測試、文件) |
| **人力需求** | ⭐⭐ | 需要至少 1 名資深全端工程師 + 1 名 ML/AI 工程師 |
| **維運複雜度** | ⭐⭐ | 需自行管理 LLM API、配額、版本更新 |
| **除錯困難度** | ⭐⭐ | Agent 行為異常時，診斷工具不如 Dify 完善 |
| **上線速度** | ⭐⭐ | 從零建置需 8-12 週才能達到 Dify 同等功能 |
| **技術風險** | ⭐⭐⭐ | 自建系統可能有未預期的邊緣案例 |

### 3.4 自行建置成本估算

| 成本項目 | 初期建置 (一次性) | 年度維運 (持續性) |
|----------|-------------------|-------------------|
| **人力成本** | NT$800,000 - 1,200,000 (4-6 週) | NT$1,200,000 - 1,800,000 |
| **雲端資源** | NT$20,000 (開發環境) | NT$120,000 - 240,000/年 |
| **LLM API 費用** | 包含在維運中 | NT$200,000 - 500,000/年 (依使用量) |
| **監控/日誌** | NT$10,000 | NT$36,000 - 60,000/年 |
| **培訓成本** | NT$50,000 - 100,000 | - |
| **總計** | **NT$880,000 - 1,330,000** | **NT$1,556,000 - 2,600,000/年** |

---

## 4. 方案 B：Dify 本地部署 (Zeabur)

### 4.1 部署架構設計

```
                        ┌─────────────────────────────────┐
                        │         Zeabur Service          │
                        │    (Dify All-in-One Docker)     │
                        └─────────────────────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          │                         │                         │
          ▼                         ▼                         ▼
   ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
   │  API Server │          │   Worker    │          │  Web UI     │
   │  (FastAPI)  │◄────────►│  (Celery)   │◄────────►│  (React)    │
   └─────────────┘          └─────────────┘          └─────────────┘
          │                         │                         │
          └─────────────────────────┼─────────────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          │                         │                         │
          ▼                         ▼                         ▼
   ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
   │  PostgreSQL │          │  Weaviate   │          │  Redis      │
   │  (Dify DB)  │          │  (Vector)   │          │  (Queue)    │
   └─────────────┘          └─────────────┘          └─────────────┘

                        ┌─────────────────────────────────┐
                        │       LUTAGU Frontend           │
                        │      (Vercel - Next.js)         │
                        └─────────────────────────────────┘
                                    │
                                    ▼
                        ┌─────────────────────────────────┐
                        │      Nginx Reverse Proxy        │
                        │    (SSL Termination, CORS)      │
                        └─────────────────────────────────┘
                                    │
                                    ▼
                        ┌─────────────────────────────────┐
                        │      Zeabur Dify Service        │
                        └─────────────────────────────────┘
```

**4.1.1 Zeabur 部署配置**

```yaml
# zeabur-dify.yml
services:
  dify-api:
    image: langgenius/dify-api:latest
    environment:
      - SECRET_KEY=your-secret-key
      - DB_USERNAME=postgres
      - DB_PASSWORD=your-password
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_DATABASE=dify
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - REDIS_PASSWORD=
      - WEAVIATE_URL=http://weaviate:8080
      - MODEL_PROVIDER_CONFIGURE=./model_providers.yaml
    depends_on:
      - postgres
      - redis
      - weaviate
  
  dify-web:
    image: langgenius/dify-web:latest
    environment:
      - API_URL=http://dify-api:5001
      - CONSOLE_WEB_URL=http://localhost:3000/
  
  postgres:
    image: postgres:15-alpine
    volumes:
      - dify-pgdata:/var/lib/postgresql/data
    environment:
      - POSTGRES_PASSWORD=your-password
      - POSTGRES_USER=postgres
      - POSTGRES_DB=dify
  
  weaviate:
    image: semitechnologies/weaviate:latest
    environment:
      - QUERY_DEFAULTS_LIMIT=25
      - AUTHENTICATION_ANONYMOUS_ACCESS_ENABLED=true
      - PERSISTENCE_DATA_PATH=/var/lib/weaviate
      - ENABLE_MODULES=text2vec-openai
  
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - dify-redis:/data
```

**4.1.2 與 LUTAGU 前端整合**

```typescript
// src/lib/dify/client.ts
import { createApiClient } from '@difyAI/nodejs-api-client';

const difyClient = createApiClient({
  baseURL: process.env.DIFY_API_URL, // Zeabur endpoint
  apiKey: process.env.DIFY_API_KEY,
});

export async function chatWithAgent(
  query: string,
  context: AgentContext
): Promise<AgentResponse> {
  const response = await difyClient.createChatMessage({
    inputs: {
      current_station: context.currentStation,
      realtime_status: context.l2Status,
      route_info: context.routeInfo,
      weather: context.weather,
      user_context: context.userProfile,
    },
    query,
    response_mode: 'streaming',
    user: context.sessionId,
  });

  return streamToResponse(response);
}
```

### 4.4 Dify 本地部署方案優勢

| 維度 | 評估 | 說明 |
|------|------|------|
| **部署速度** | ⭐⭐⭐⭐⭐ | 利用現有 Dify 配置，1-2 天可上線 |
| **開發效率** | ⭐⭐⭐⭐⭐ | Prompt 迭代無須重新部署，可線上調整 |
| **維運簡化** | ⭐⭐⭐⭐ | 官方維護的容器映像，升级方便 |
| **除錯工具** | ⭐⭐⭐⭐⭐ | 內建對話歷史、Token 監控、Prompt 測試介面 |
| **團隊熟悉度** | ⭐⭐⭐⭐⭐ | 已有 Dify 使用經驗，學習曲線低 |
| **Agent 類型支援** | ⭐⭐⭐⭐⭐ | ReAct、Function Calling、MoA 等多種模式 |
| **RAG 整合** | ⭐⭐⭐⭐⭐ | 內建向量檢索、分塊、排序機制 |
| **版本迭代** | ⭐⭐⭐⭐⭐ | 開源專案活躍，新功能持續釋出 |

### 4.5 Dify 本地部署方案劣勢

| 維度 | 評估 | 說明 |
|------|------|------|
| **定制化限制** | ⭐⭐⭐ | 特殊決策邏輯可能需繞過 Dify 框架 |
| **資源需求** | ⭐⭐⭐ | 需要較高配置的 Zeabur 實例 (4GB+ RAM) |
| **供應商鎖定** | ⭐⭐⭐ | 從 Dify Cloud 轉本地，仍依賴 Dify 生態 |
| **擴展性瓶頸** | ⭐⭐⭐ | 大規模部署時需自行優化 Weaviate/PostgreSQL |
| **長期成本** | ⭐⭐⭐ | Zeabur 費用隨使用量增加 |

### 4.6 Dify 本地部署成本估算

| 成本項目 | 初期建置 (一次性) | 年度維運 (持續性) |
|----------|-------------------|-------------------|
| **Zeabur 實例** | - | NT$240,000 - 480,000/年 (4GB RAM, 2 vCPU) |
| **資料庫遷移** | NT$20,000 | - |
| **配置調優** | NT$30,000 | NT$12,000/年 |
| **監控告警** | NT$10,000 | NT$24,000/年 |
| **培訓成本** | NT$20,000 | - |
| **LLM API 費用** | 依使用量計費 | NT$200,000 - 500,000/年 |
| **總計** | **NT$80,000** | **NT$476,000 - 1,006,000/年** |

---

## 5. 多維度比較分析

### 5.1 技術層面總評

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                           技術維度比較雷達圖                                      │
│                                                                                │
│                          自行建置                                                │
│                              ▲                                                  │
│                       擴展性 │ 定制化                                             │
│                              │    ╱                                               │
│                              │   ╱  自行建置                                      │
│                              │  ╱    ●                                            │
│                              │ ╱     │                                           │
│                              │╱      │                                           │
│                    ─────────●───────●─────────▶ Dify 本地部署                    │
│                           ╱│       │ 整合度                                       │
│                          ╱ │       │                                             │
│                     Dify  ╱  │       │                                           │
│                     ●     ╱  │       │                                           │
│                          ╱   │       │                                           │
│                     維護性│        │                                             │
│                              ▼                                                  │
│                          Dify 本地部署                                           │
└────────────────────────────────────────────────────────────────────────────────┘
```

| 技術指標 | 自行建置 | Dify 本地部署 | 差異分析 |
|----------|----------|---------------|----------|
| **系統架構契合度** | 95/100 | 85/100 | 自行建置可完全貼合 L1-L4 整合需求 |
| **擴展性與彈性** | 95/100 | 80/100 | 自行建置無框架限制，但 Dify 已足夠 |
| **整合複雜度** | 70/100 | 90/100 | Dify 提供完整工具鏈，整合更快 |
| **維護成本** | 60/100 | 85/100 | 自行建置需全責維護，Dify 有社群支持 |
| **版本迭代速度** | 80/100 | 95/100 | Dify 更新頻繁，新功能即時可用 |
| **效能表現** | 85/100 | 80/100 | 自行建置可優化至極致，但 Dify 足夠好 |
| **穩定性** | 75/100 | 90/100 | Dify 經過大量部署驗證 |

### 5.2 成本層面總評

| 成本項目 | 自行建置 (年) | Dify 本地部署 (年) | 差異 |
|----------|---------------|--------------------|------|
| **初期建置** | NT$880K - 1,330K | NT$80K | +NT$800K - 1,250K |
| **第一年總成本** | NT$2,436K - 2,930K | NT$556K - 1,086K | +NT$1,350K - 2,374K |
| **第二年總成本** | NT$1,556K - 2,600K | NT$476K - 1,006K | +NT$1,080K - 1,594K |
| **第三年總成本** | NT$1,556K - 2,600K | NT$476K - 1,006K | +NT$1,080K - 1,594K |

**成本交叉點分析**：
- 若自行建置方案能在第 2-3 年有效控制維運成本，則 3 年總成本差異約 NT$3,200K - 4,700K
- Dify 本地部署的邊際成本較低，適合 MVP 驗證階段

### 5.3 風險層面總評

| 風險項目 | 自行建置 | Dify 本地部署 | 緩解策略 |
|----------|----------|---------------|----------|
| **技術債務累積** | ⚠️ 中高 | ✅ 低 | 建立技術文件、定期重構 |
| **供應商依賴** | ✅ 低 | ⚠️ 中 | 抽象化 Dify 介面，保留遷移能力 |
| **資訊安全威脅** | ✅ 自控 | ⚠️ 中 | 強化 Zeabur 網路安全、存取控制 |
| **資料隱私保護** | ✅ 完全掌控 | ⚠️ 需配置 | 啟用 Zeabur 私有網路、加密傳輸 |
| **法規合規性** | ✅ 較易達標 | ⚠️ 需注意 | GDPR 資料落地、審計日誌 |
| **LLM 供應商風險** | ⚠️ 中 | ⚠️ 中 | 多模型備援策略 |

### 5.4 策略層面總評

| 策略維度 | 自行建置 | Dify 本地部署 | 分析 |
|----------|----------|---------------|------|
| **未來發展藍圖** | 完全自主可控 | 依賴 Dify 發展方向 | 自行建置適合長期自研策略 |
| **市場變化適應** | 需自行因應 | 可快速跟進社群更新 | Dify 更新頻繁可降低適應成本 |
| **差異化競爭優勢** | 高，可深度客製 | 中等，與他牌共用框架 | 自行建置可建立技術壁壘 |
| **投資報酬週期** | 長 (6-12 個月) | 短 (1-2 個月) | Dify 適合快速驗證 |

---

## 6. 使用場景量化比較

### 6.1 場景一：即時交通異常回應

**情境**：用戶在東京站，詢問「京葉線現在怎麼樣？我要去迪士尼」

| 指標 | 自行建置 | Dify 本地部署 |
|------|----------|---------------|
| **首次回應延遲** | 1.2-1.8 秒 | 1.5-2.5 秒 |
| **工具調用次數** | 2-3 次 (可優化) | 3-4 次 (框架開銷) |
| **回覆品質** | 可精確控制 Prompt | 依賴 Dify Prompt 設定 |
| **錯誤恢復** | 需自行實作 | 內建重試機制 |
| **開發迭代** | 需重新部署 | 可線上即時調整 |

### 6.2 場景二：多輪對話上下文管理

**情境**：用戶規劃一天行程，持續與 Agent 對話討論路線

| 指標 | 自行建置 | Dify 本地部署 |
|------|----------|---------------|
| **上下文窗口管理** | 完全自訂 | 依賴 Dify 設定 |
| **記憶持久化** | 可自建向量記憶 | Dify 內建對話歷史 |
| **狀態一致性** | 需自行確保 | Dify 框架處理 |
| **擴展性** | 無限制 | 受 Dify 架構限制 |

### 6.3 場景三：RAG 知識檢索

**情境**：用戶詢問「上野站有沒有電梯？推車怎麼走」

| 指標 | 自行建置 | Dify 本地部署 |
|------|----------|---------------|
| **檢索延遲** | 200-400ms | 300-600ms |
| **分塊策略** | 可自訂 | 預設策略 |
| **排序算法** | 可深度優化 | 預設 cosine |
| **知識更新** | 需手動觸發 | Dify 後台管理 |

---

## 7. 建議方案

### 7.0 部署狀態更新 (2026-01-05)

**Dify 已成功部署於 Zeabur！**

| 項目 | 連線資訊 |
|------|----------|
| **Base URL** | `https://dify-k7m9.zeabur.app/v1` |
| **API 金鑰** | `<YOUR_DIFY_API_KEY>` ⚠️ 請至 .env.local 設定 |
| **部署日期** | 2026-01-05 |

### 7.1 整合實施工案

基於前述分析，建議採用 **「混合策略」**：

```
                    ┌────────────────────────────────────────────────┐
                    │              建議採用：階段性混合策略             │
                    └────────────────────────────────────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          │                         │                         │
          ▼                         ▼                         ▼
   ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
   │   階段一     │          │   階段二     │          │   階段三     │
   │  (0-3 個月)  │   →      │  (3-6 個月)  │   →      │  (6-12 個月) │
   └─────────────┘          └─────────────┘          └─────────────┘
          │                         │                         │
          ▼                         ▼                         ▼
   Dify 本地部署            逐步抽取核心邏輯           評估自建可行性
   快速上線                 封裝為內部 Library
```

### 7.2 階段一：Dify 本地部署 (第 0-3 個月)

**目標**：快速上線，驗證產品市場契合度 (PMF)

**實施任務**：
1. 在 Zeabur 部署 Dify All-in-One 容器
2. 遷移現有 Dify Cloud 配置至本地
3. 配置 Nginx 反向代理與 SSL
4. 建立與 LUTAGU 前端的 API 整合層
5. 設定監控告警 (Grafana + Prometheus)
6. 建立備份與災難復原機制

**成功標準**：
- Agent 回應延遲 < 3 秒 (95 百分位)
- 對話成功率 > 95%
- 可用性 > 99.5%

### 7.3 階段二：核心邏輯抽取 (第 3-6 個月)

**目標**：建立抽象層，降低 Dify 依賴程度

**實施任務**：
1. 設計並實作 `AgentAdapter` 介面
2. 抽取 LUTAGU 特定決策邏輯至獨立模組
3. 建立 Prompt 版本管理系統
4. 實作 A/B Testing 框架 (可比較不同 Prompt 版本)
5. 建立 RAG 知識管理流程

```typescript
// AgentAdapter 抽象層範例
interface AgentAdapter {
  chat(inputs: AgentInputs, query: string): Promise<AgentResponse>;
  updatePrompt(version: string): Promise<void>;
  getMetrics(): AgentMetrics;
}

class DifyAgentAdapter implements AgentAdapter {
  // Dify 實作
}

class LocalAgentAdapter implements AgentAdapter {
  // 未來自建實作
}
```

### 7.4 階段三：評估與決策 (第 6-12 個月)

**評估指標**：

| 指標 | 評估標準 | 行動 |
|------|----------|------|
| **使用量成長** | 每月對話數 > 10,000 | 考慮自建以控制成本 |
| **客製化需求** | 超過 30% 功能 Dify 無法滿足 | 啟動自建評估 |
| **維運負擔** | 每月故障時間 > 4 小時 | 優化 Dify 部署 |
| **團隊能力** | 已培養 2 名以上 AI 工程師 | 可考慮自建 |

---

## 8. 實施路徑與風險緩解

### 8.1 詳細實施時間表

```
週次  1   2   3   4   5   6   7   8   9   10  11  12
      │   │   │   │   │   │   │   │   │   │   │   │
      ├───┴───┤                                       階段一
      │  Zeabur│                                       Dify 部署
      │  設定  │
              │                                       階段二
              │   ┌───────┐   ┌───────┐   ┌───────┐
              │   │ Adapter│   │ Prompt │   │ A/B   │
              │   │ 介面  │   │版本管理 │   │ Testing│
              │   └───────┘   └───────┘   └───────┘
                                          │
                                          └── 階段三
                                              評估決策
```

### 8.2 關鍵里程碑

| 里程碑 | 目標日期 | 交付物 |
|--------|----------|--------|
| M1: Zeabur 環境準備 | 第 1 週 | 完成帳號設定、網路配置 |
| M2: Dify 本地部署 | 第 2 週 | 可存取的 Dify 实例 |
| M3: API 整合完成 | 第 4 週 | LUTAGU 前端可正常呼叫 |
| M4: 監控系統上線 | 第 5 週 | Grafana 儀表板 |
| M5: Adapter 介面完成 | 第 8 週 | 可切換的 Agent 實作 |
| M6: 首次 Review | 第 12 週 | 階段報告與下一階段規劃 |

### 8.3 風險識別與緩解策略

| 風險項目 | 發生機率 | 影響程度 | 緩解策略 |
|----------|----------|----------|----------|
| **Zeabur 資源不足** | 中 | 高 | 預留水平擴展能力，選擇 4GB+ 方案 |
| **Dify 版本相容性** | 中 | 中 | 固定特定版本，建立升級測試流程 |
| **LLM API 配額限制** | 高 | 中 | 實作配額監控，建立降級策略 |
| **RAG 檢索品質不佳** | 中 | 中 | 建立知識品質審核流程 |
| **團隊知識缺口** | 高 | 中 | 安排 Dify 官方培訓，建立技術文件 |
| **資料遷移失敗** | 低 | 高 | 建立完整的遷移檢查清單 |
| **安全漏洞** | 低 | 極高 | 定期資安掃描，啟用 WAF |

### 8.4 回滾計畫

若 Dify 本地部署發生嚴重問題，可執行以下回滾：

1. **短期回滾 (小時級)**：切換回 Dify Cloud API
2. **中期回滾 (日級)**：使用備份的 Zeabur snapshot 恢復
3. **長期回滾 (週級)**：從頭重新部署 (文件化流程降低復原時間)

---

## 9. 結論與建議總結

### 9.1 核心建議

經過全面評估，建議團隊採用 **「Dify 本地部署 + 抽象化介面」** 的混合策略，原因如下：

1. **時效優先**：MVP 階段需快速驗證市場反應，Dify 可在 2-4 週內完成上線
2. **降低風險**：利用現有 Dify 配置與團隊經驗，避免從零建置的不確定性
3. **保留彈性**：透過 Adapter 介面設計，未來可無痛遷移至自建方案
4. **成本可控**：第一年成本約 NT$500K-1,000K，遠低於自行建置的 NT$2,400K-2,900K
5. **持續迭代**：Dify 開源社群活躍，可持續獲得新功能與錯誤修復

### 9.2 關鍵成功因素

- **團隊投入**：確保有 1 名工程師專職負責 Dify 維護與優化
- **監控完善**：建立完整的效能監控與告警機制
- **知識積累**：持續收集用戶回饋，迭代 Prompt 與 RAG 知識庫
- **抽象化設計**：從一開始就建立可替換的 Agent 介面

### 9.3 下一步行動

1. ✅ **Zeabur Dify 部署已完成** - 連線資訊已取得
2. **完成 Dify 後台配置** - 登入 `https://dify-k7m9.zeabur.app` 建立 App
3. **實作前端整合** - 建立 `src/lib/dify/client.ts` 與 `src/hooks/useLutaguAgent.ts`
4. **測試 API 串接** - 驗證 LUTAGU 前端可正常呼叫 Dify
5. **建立監控告警** - 追蹤 API 延遲與錯誤率

---

> **報告撰寫**: AI Architect Mode  
> **版本**: 1.0  
> **最後更新**: 2026-01-05
