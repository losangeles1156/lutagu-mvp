# LUTAGU Agent 框架選型評估報告

## 現有架構分析

```
目前 LUTAGU 已有的 Agent 基礎設施：
├── AgentOrchestrator      → Mistral/Gemini API 整合
├── DecisionEngine         → 決策排序引擎
├── AGENT_TOOLS            → 16+ 個工具定義
├── HybridEngine           → 50%模板 + 26%算法 + 24%LLM
├── Dify                   → RAG + Agent 外部服務
└── reasoning/             → TPI/CDR/WVC (新設計)
```

**技術棧約束**：TypeScript + Next.js 14 + Vercel 部署

---

## 框架評估比較

### 1️⃣ LangChain (langchain.js)

| 項目 | 評估 |
|-----|------|
| **語言** | TypeScript/JavaScript ✅ |
| **成熟度** | ⭐⭐⭐⭐⭐ 最成熟，生態最豐富 |
| **學習曲線** | 中等（概念多） |
| **套件大小** | 🔴 較大（~2MB+） |
| **Vercel 兼容** | ⚠️ 需注意 Edge Runtime 限制 |

**優點**：
- 豐富的 Tool/Agent 抽象
- 內建 Memory、Chain、Agent 概念
- 支援多種 LLM（OpenAI、Anthropic、Mistral...）
- 活躍社群，問題容易找到解答

**缺點**：
- 抽象層過多，對您現有架構侵入性大
- Bundle size 較大，影響 Edge 部署
- 更新頻繁，API 常變動
- 您已有 HybridEngine，引入 LangChain 會有架構衝突

**適合場景**：從零開始建構複雜 Agent 系統

**LUTAGU 適配度**：⭐⭐☆ (30%)

---

### 2️⃣ CrewAI

| 項目 | 評估 |
|-----|------|
| **語言** | Python 🔴 |
| **成熟度** | ⭐⭐⭐☆ |
| **學習曲線** | 低（概念直覺） |
| **套件大小** | N/A（Python） |
| **Vercel 兼容** | 🔴 不直接兼容 |

**優點**：
- 多 Agent 協作設計出色（Agent 有角色、目標、工具）
- 適合複雜任務分解
- 概念清晰（Crew = 團隊, Agent = 成員, Task = 任務）

**缺點**：
- **Python only** — 與您的 TypeScript 技術棧不兼容
- 需要額外部署 Python 服務
- 增加運維複雜度

**適合場景**：Python 後端、需要多角色協作的複雜系統

**LUTAGU 適配度**：⭐☆☆ (15%)

---

### 3️⃣ Vercel AI SDK

| 項目 | 評估 |
|-----|------|
| **語言** | TypeScript ✅ |
| **成熟度** | ⭐⭐⭐⭐ |
| **學習曲線** | 低 ✅ |
| **套件大小** | 🟢 輕量（~200KB） |
| **Vercel 兼容** | ✅✅✅ 原生支援 |

**優點**：
- **與 Next.js 完美整合**
- 內建 Streaming、Tool Calling
- 支援 OpenAI、Anthropic、Mistral、Google 等
- Edge Runtime 友好
- 輕量，不會膨脹 bundle

**缺點**：
- Agent 抽象較基礎（需自己實現複雜邏輯）
- 沒有內建 Memory 管理
- 多 Agent 協作需自己設計

**適合場景**：Next.js 專案、需要快速整合 AI 的應用

**LUTAGU 適配度**：⭐⭐⭐⭐ (80%)

---

### 4️⃣ 自建輕量方案（推薦）

| 項目 | 評估 |
|-----|------|
| **語言** | TypeScript ✅ |
| **成熟度** | 依您的投入 |
| **學習曲線** | 低（您已熟悉） |
| **套件大小** | 🟢 最小 |
| **Vercel 兼容** | ✅ 完全控制 |

**核心理念**：
基於您現有的 `AgentOrchestrator` + `HybridEngine` 擴展，加入：
1. **Reasoning Chain**（已完成）
2. **Tool Registry**（已有）
3. **State Machine**（需新增）
4. **Memory Layer**（需新增）

**優點**：
- 零額外依賴
- 完全符合現有架構
- 效能最佳（16ms 目標可達）
- 可精確控制每個環節

**缺點**：
- 需要自己維護
- 沒有社群支援

**LUTAGU 適配度**：⭐⭐⭐⭐⭐ (95%)

---

### 5️⃣ Anthropic Claude Tool Use（新選項）

| 項目 | 評估 |
|-----|------|
| **語言** | TypeScript ✅ |
| **成熟度** | ⭐⭐⭐⭐ |
| **學習曲線** | 低 |
| **套件大小** | 🟢 輕量 |
| **推理能力** | ⭐⭐⭐⭐⭐ 最強 |

**優點**：
- Claude 的推理能力在複雜任務上表現最佳
- Tool Use 設計清晰
- 支援複雜多步推理

**缺點**：
- 成本較高
- 需要 Anthropic API Key

**LUTAGU 適配度**：⭐⭐⭐⭐ (75%)

---

## 🎯 推薦方案：自建輕量 Agent + Vercel AI SDK

### 為什麼這是最佳選擇？

```
┌─────────────────────────────────────────────────────────────┐
│  您已有 76% 的基礎設施                                        │
│  ├── HybridEngine (50% Template + 26% Algorithm + 24% LLM)  │
│  ├── AgentOrchestrator (Mistral/Gemini)                     │
│  ├── Tool Definitions (16+ tools)                           │
│  └── Reasoning Chain (TPI/CDR/WVC) ← 剛完成                  │
│                                                              │
│  只需新增 24% 的膠水層                                        │
│  ├── State Machine (對話狀態管理)                            │
│  ├── Memory Layer (短期/長期記憶)                            │
│  └── Vercel AI SDK (串流/工具調用)                           │
└─────────────────────────────────────────────────────────────┘
```

### 架構設計

```
┌─────────────────────────────────────────────────────────────┐
│                    LUTAGU Agent System                       │
├─────────────────────────────────────────────────────────────┤
│  Layer 0: User Interface (Chat Panel)                        │
│           ↓                                                  │
│  Layer 1: State Machine (對話狀態管理)                        │
│           ├── idle → intent_detected → reasoning → response │
│           └── 管理對話階段、記憶回溯                           │
│           ↓                                                  │
│  Layer 2: Reasoning Chain (思考鏈)                           │
│           ├── Intent Classification                          │
│           ├── L2 Live Scan (ODPT)                           │
│           ├── TPI/CDR/WVC Calculation                        │
│           └── L1 DNA Enrichment                              │
│           ↓                                                  │
│  Layer 3: Tool Executor (工具執行)                           │
│           ├── get_current_time                               │
│           ├── get_train_status                               │
│           ├── get_station_facilities                         │
│           ├── calc_transfer_pain  ← NEW                      │
│           ├── calc_cascade_risk   ← NEW                      │
│           └── calc_wait_value     ← NEW                      │
│           ↓                                                  │
│  Layer 4: Response Generator                                 │
│           ├── HybridEngine (Template/Algorithm/LLM)          │
│           └── Vercel AI SDK (Streaming)                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 實作建議

### Phase 1: 整合 Vercel AI SDK（1-2天）

```bash
npm install ai @ai-sdk/openai @ai-sdk/anthropic @ai-sdk/google
```

```typescript
// src/app/api/agent/route.ts
import { streamText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { calcTransferPainIndex } from '@/lib/l4/reasoning';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: openai('gpt-4o-mini'),
    messages,
    tools: {
      calcTransferPain: tool({
        description: '計算轉乘辛苦指標',
        parameters: z.object({
          fromStation: z.string(),
          toLine: z.string(),
          hasLuggage: z.boolean().optional(),
        }),
        execute: async ({ fromStation, toLine, hasLuggage }) => {
          return getTransferTPI(fromStation, toLine, { userHasLuggage: hasLuggage });
        },
      }),
      // ... 更多工具
    },
  });

  return result.toDataStreamResponse();
}
```

### Phase 2: State Machine（2-3天）

```typescript
// src/lib/agent/stateMachine.ts
type AgentState =
  | 'idle'
  | 'intent_detected'
  | 'gathering_context'
  | 'reasoning'
  | 'tool_calling'
  | 'generating_response'
  | 'awaiting_feedback';

interface ConversationContext {
  state: AgentState;
  intent: string | null;
  entities: {
    origin?: string;
    destination?: string;
    userProfile?: string;
  };
  reasoningChain: ReasoningStep[];
  memory: {
    shortTerm: Message[];  // 最近 5 輪對話
    longTerm: UserPreference;  // 用戶偏好
  };
}
```

### Phase 3: 整合 Reasoning Chain（1天）

```typescript
// 在 Agent 決策流程中調用
async function executeReasoningChain(context: ConversationContext) {
  // 1. L2 即時掃描
  const liveStatus = await fetchODPTStatus(context.entities.origin);

  // 2. 生成候選路線
  const routes = await generateRoutes(context.entities);

  // 3. 計算 TPI + CDR
  const scoredRoutes = routes.map(route => ({
    route,
    tpi: calcTransferPainIndex(route.transfers[0], ...),
    cdr: calcCascadeDelayRisk(route.legs),
  }));

  // 4. 如果延誤嚴重，計算 WVC
  if (liveStatus.hasDelay) {
    const wvc = calcWaitValue({
      expectedWaitMinutes: liveStatus.delayMinutes,
      areaVibeTags: await getAreaDNA(context.entities.origin),
      // ...
    });

    if (wvc.recommendation === 'rest_nearby') {
      return { action: 'suggest_coffee', ...wvc };
    }
  }

  // 5. 返回最佳路線
  return scoredRoutes[0];
}
```

---

## 成本與效能比較

| 方案 | 開發時間 | 運維成本 | 效能 | 擴展性 |
|-----|---------|---------|------|-------|
| LangChain | 2-3 週 | 中 | 中 | 高 |
| CrewAI | 3-4 週 | 高（需 Python） | 中 | 高 |
| Vercel AI SDK | 3-5 天 | 低 | 高 | 中 |
| **自建 + Vercel AI** | **1-2 週** | **低** | **最高** | **最高** |

---

## 結論

### 🏆 最終推薦：自建輕量 Agent + Vercel AI SDK

**理由**：
1. **與現有架構無縫整合** — 不需要重構 HybridEngine
2. **效能最佳** — 可達 16ms 目標
3. **Vercel 原生支援** — 部署無痛
4. **完全控制** — 可精確調整 TPI/CDR/WVC 權重
5. **輕量** — 不會增加 bundle size

**不推薦 LangChain/CrewAI 的原因**：
- LangChain：抽象過重，與您的 HybridEngine 設計衝突
- CrewAI：Python only，技術棧不匹配

### 下一步

1. `npm install ai @ai-sdk/mistral` (或您偏好的 provider)
2. 建立 State Machine 管理對話狀態
3. 將 TPI/CDR/WVC 註冊為 Agent Tools
4. 整合到 Chat API 端點

需要我幫您開始實作嗎？
