# LUTAGU AI 混合架構
# 三層職責分工與商業導流整合

---

## 🎯 本文件的使用方式

```
給 AI 開發代理的指引：

核心原則：能不用 LLM 就不用，能用規則就用規則。

開發時必須判斷每個功能屬於哪一層：
1. Rule-based（60%）：確定性任務，寫邏輯就好
2. SLM（30%）：需要一點智慧，但模式固定
3. LLM（10%）：真正需要「思考」的複雜任務

錯誤的層級選擇 = 浪費成本 + 增加延遲 + 降低可控性
```

---

## 1. 三層架構總覽

### 1.1 架構圖

```
┌─────────────────────────────────────────────────────────────────┐
│                         用戶輸入                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Intent Router                               │
│                    （意圖路由器）                                 │
│  ─────────────────────────────────────────────────────────────  │
│  Step 1: 快速規則匹配 → 能處理就直接處理                         │
│  Step 2: 檢查 LLM 觸發條件 → 複雜就升級                          │
│  Step 3: 交給 SLM 分類 → 中等複雜度                              │
└─────────────────────────────────────────────────────────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Rule-based    │  │      SLM        │  │      LLM        │
│    (60%)        │  │     (30%)       │  │     (10%)       │
│  ─────────────  │  │  ─────────────  │  │  ─────────────  │
│  「作業標準」    │  │  「經理/專員」   │  │  「CEO/顧問」    │
│                 │  │                 │  │                 │
│  • 狀態查詢     │  │  • 意圖分類     │  │  • 複雜推理     │
│  • 設施搜尋     │  │  • 實體抽取     │  │  • 人格對話     │
│  • 格式轉換     │  │  • 簡單生成     │  │  • 情緒處理     │
│  • 商業規則     │  │  • 語言偵測     │  │  • 模糊意圖     │
│  • 模板回應     │  │                 │  │                 │
│  ─────────────  │  │  ─────────────  │  │  ─────────────  │
│  延遲：<10ms    │  │  延遲：50-200ms │  │  延遲：1-3s     │
│  成本：$0       │  │  成本：$0(本地) │  │  成本：$0.002   │
└─────────────────┘  └─────────────────┘  └─────────────────┘
          │                    │                    │
          └────────────────────┼────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Response Builder                            │
│                    （回應建構器）                                 │
│  ─────────────────────────────────────────────────────────────  │
│  • 套用商業導流規則                                              │
│  • 生成 Action Cards                                             │
│  • 多語系轉換                                                    │
│  • 格式化輸出                                                    │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                         L4 輸出                                  │
│                    （行動建議）                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 設計理由

```
為什麼要三層而非全用 LLM？

成本考量：
- LLM API 按 token 計費
- 假設每天 10,000 次對話
- 全用 LLM：$100-300/月
- 混合架構：$10-30/月（節省 90%）

延遲考量：
- LLM：1-3 秒回應
- SLM：100-200ms
- Rule：<10ms
- 用戶期待「即時感」，簡單查詢等 3 秒會失去耐心

可控性考量：
- LLM 可能「幻覺」或「自由發揮」
- Rule-based 100% 可預測
- 涉及商業導流時，不能讓 AI 亂推薦

可用性考量：
- LLM API 可能掛掉或超時
- Rule-based 永遠可用
- SLM 本地部署也不受外部影響
```

---

## 2. 各層職責詳解

### 2.1 Rule-based Layer（60%）

#### 適用任務

| 任務類型 | 輸入範例 | 處理方式 | 輸出 |
|----------|----------|----------|------|
| 交通狀態查詢 | 「銀座線有延誤嗎」 | 查 L2 Cache | 模板回應 |
| 設施搜尋 | 「廁所在哪」 | 查 L3 DB | 設施列表 |
| 格式轉換 | 票價、時間 | 計算 + 格式化 | 格式化文字 |
| 圈層判定 | GPS 座標 | Zone Detector | Core/Buffer/Outer |
| 商業規則 | 延誤 + 趕時間 | 規則引擎 | 導流卡片 |
| 關鍵字匹配 | 「切換日文」 | 正則匹配 | 執行指令 |

#### 快速規則匹配

```typescript
// lib/ai/intentRouter.ts

const QUICK_PATTERNS: Record<string, { pattern: RegExp; intent: string }[]> = {
  // 狀態查詢 → 直接查 Cache
  status_query: [
    { pattern: /(.+線|.+ライン).*(延誤|遅延|狀態|状況)/i, intent: 'line_status' },
    { pattern: /(現在|今).*(擁擠|混雑|人多)/i, intent: 'crowding_status' },
  ],

  // 設施查詢 → 查 DB
  facility_query: [
    { pattern: /(廁所|トイレ|toilet|洗手間)/i, intent: 'find_toilet' },
    { pattern: /(置物櫃|ロッカー|locker|寄放)/i, intent: 'find_locker' },
    { pattern: /(ATM|提款機)/i, intent: 'find_atm' },
    { pattern: /(充電|チャージ|charge)/i, intent: 'find_charging' },
  ],

  // 系統指令
  system_command: [
    { pattern: /(切換|切替|switch).*(語言|言語|language)/i, intent: 'change_language' },
    { pattern: /(訂閱|subscribe|通知)/i, intent: 'trip_guard' },
  ],
};

export function quickMatch(input: string): { intent: string; matched: boolean } {
  for (const [category, patterns] of Object.entries(QUICK_PATTERNS)) {
    for (const { pattern, intent } of patterns) {
      if (pattern.test(input)) {
        return { intent, matched: true };
      }
    }
  }
  return { intent: '', matched: false };
}
```

#### 模板回應系統

```typescript
// lib/ai/templates.ts

interface TemplateData {
  locale: 'zh-TW' | 'ja' | 'en';
  data: Record<string, any>;
}

const TEMPLATES: Record<string, Record<string, string>> = {
  line_status_normal: {
    'zh-TW': '{lineName}目前正常運行 ✓',
    'ja': '{lineName}は現在正常運行中です ✓',
    'en': '{lineName} is running normally ✓',
  },
  line_status_delayed: {
    'zh-TW': '⚠️ {lineName}延誤約 {delayMinutes} 分鐘\n{suggestion}',
    'ja': '⚠️ {lineName}は約{delayMinutes}分遅延中\n{suggestion}',
    'en': '⚠️ {lineName} is delayed by ~{delayMinutes} min\n{suggestion}',
  },
  facility_found: {
    'zh-TW': '在{nodeName}找到 {count} 個{facilityType}：',
    'ja': '{nodeName}で{count}件の{facilityType}が見つかりました：',
    'en': 'Found {count} {facilityType} at {nodeName}:',
  },
  facility_not_found: {
    'zh-TW': '抱歉，{nodeName}附近沒有找到{facilityType}',
    'ja': '申し訳ありません、{nodeName}付近に{facilityType}は見つかりませんでした',
    'en': "Sorry, no {facilityType} found near {nodeName}",
  },
  buffer_zone_disclaimer: {
    'zh-TW': '這裡我不太熟悉，只能提供基本路線資訊 😅',
    'ja': 'この辺りは詳しくないので、基本的なルート情報のみ提供できます 😅',
    'en': "I'm not very familiar with this area, I can only provide basic route info 😅",
  },
};

export function renderTemplate(key: string, data: TemplateData): string {
  const template = TEMPLATES[key]?.[data.locale] || TEMPLATES[key]?.['zh-TW'] || '';
  return template.replace(/\{(\w+)\}/g, (_, k) => data.data[k] || '');
}
```

### 2.2 SLM Layer（30%）

#### 適用任務

| 任務 | 輸入 | 模型 | 輸出 |
|------|------|------|------|
| 意圖分類 | 用戶完整輸入 | Gemma 2B | Intent ID + 信心度 |
| 地點實體抽取 | 「我想去淺草」 | Gemma 2B | `{ destination: "淺草" }` |
| 時間實體抽取 | 「明天下午三點」 | Gemma 2B | `{ time: "..." }` |
| 情緒分類 | 用戶輸入 | Phi-3 Mini | positive/neutral/negative |
| 語言偵測 | 用戶輸入 | 內建規則 | zh-TW/ja/en |

#### 技術選型

| 模型 | 參數量 | 延遲 | 部署方式 | 適用場景 |
|------|--------|------|----------|----------|
| **Gemma 2B** | 2B | 50-100ms | Ollama | 意圖分類、NER |
| **Phi-3 Mini** | 3.8B | 100-200ms | Ollama | 稍複雜的生成 |
| **Qwen2 1.5B** | 1.5B | 30-80ms | Ollama | 中文優化 |

#### SLM 呼叫封裝

```typescript
// lib/ai/slm.ts

const OLLAMA_CONFIG = {
  baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  model: 'gemma2:2b',
  timeout: 5000,
};

export async function classifyIntent(input: string): Promise<{
  intent: string;
  confidence: number;
}> {
  const prompt = `
你是意圖分類器。判斷用戶輸入屬於哪個意圖：

可能的意圖：
- route_search: 想知道怎麼去某個地方
- facility_search: 想找設施（廁所、置物櫃等）
- status_query: 想知道交通狀況
- node_info: 想了解某個地點
- trip_guard: 想訂閱通知
- general_chat: 一般閒聊
- unclear: 無法判斷

用戶輸入：「${input}」

只回答意圖名稱，不要解釋。
`.trim();

  const response = await fetch(`${OLLAMA_CONFIG.baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_CONFIG.model,
      prompt,
      stream: false,
      options: { temperature: 0.1 },
    }),
  });

  const data = await response.json();
  const intentRaw = data.response?.trim().toLowerCase();

  const validIntents = [
    'route_search', 'facility_search', 'status_query',
    'node_info', 'trip_guard', 'general_chat', 'unclear'
  ];

  const intent = validIntents.includes(intentRaw) ? intentRaw : 'unclear';
  const confidence = intent === 'unclear' ? 0.3 : 0.85;

  return { intent, confidence };
}

export async function extractEntities(
  input: string,
  intent: string
): Promise<Record<string, any>> {
  const prompt = `
從句子中抽取實體資訊，以 JSON 回答。

意圖：${intent}
用戶輸入：「${input}」

${intent === 'route_search' ? `
抽取：
- destination: 目的地
- preferences: 特殊需求（無障礙、避開人潮等）
` : ''}

只回答 JSON，不要解釋。
`.trim();

  const response = await fetch(`${OLLAMA_CONFIG.baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_CONFIG.model,
      prompt,
      stream: false,
      options: { temperature: 0.1 },
    }),
  });

  const data = await response.json();

  try {
    const jsonMatch = data.response?.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('Entity extraction failed:', e);
  }

  return {};
}
```

### 2.3 LLM Layer（10%）

#### 適用任務

| 任務 | 觸發條件 | 模型 | 範例 |
|------|----------|------|------|
| 複雜多條件推理 | 多個 AND/OR 條件 | Gemini Flash | 「帶輪椅奶奶，下雨，想去淺草吃飯」 |
| 節點人格對話 | 詢問節點故事/特色 | Gemini Flash | 「說說上野站的故事」 |
| 情緒處理 | 偵測到負面情緒 | Claude Haiku | 「我好焦慮不知道怎麼辦」 |
| 模糊意圖理解 | SLM 信心度 < 0.6 | Gemini Flash | 「那個...就是那個地方」 |
| 創意建議生成 | 開放式問題 | Gemini Flash | 「推薦一個適合約會的地方」 |

#### LLM 觸發條件

```typescript
// 需要升級到 LLM 的情況
const LLM_TRIGGERS = [
  // 多條件組合
  /(.+)(而且|並且|同時|还要|また).+/i,

  // 特殊需求
  /(輪椅|wheelchair|車椅子|無障礙|バリアフリー)/i,
  /(小孩|子供|baby|嬰兒|ベビーカー)/i,
  /(行李|大件|荷物|luggage)/i,

  // 情緒表達
  /(急|趕|焦|緊急|ヤバい|困った|help)/i,

  // 開放式問題
  /(推薦|建議|おすすめ|suggest|哪裡好|どこがいい)/i,

  // 節點人格對話
  /(這裡|這站|ここ).*(特色|故事|歷史|什麼樣)/i,
];

export function shouldUseLLM(input: string): boolean {
  return LLM_TRIGGERS.some(trigger => trigger.test(input));
}
```

#### LLM 呼叫（透過 Dify）

```typescript
// lib/ai/llm.ts

const DIFY_CONFIG = {
  apiKey: process.env.DIFY_API_KEY!,
  baseUrl: process.env.DIFY_BASE_URL || 'https://api.dify.ai/v1',
};

export async function handleComplexQuery(
  input: string,
  context: {
    currentNode: string;
    zone: 'core' | 'buffer' | 'outer';
    locale: string;
    l2Status?: Record<string, any>;
    personaPrompt?: string;
  }
): Promise<{
  response: string;
  actionCards?: ActionCard[];
}> {
  const systemPrompt = buildSystemPrompt(context);

  const response = await fetch(`${DIFY_CONFIG.baseUrl}/chat-messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DIFY_CONFIG.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: {
        current_node: context.currentNode,
        zone: context.zone,
        l2_status: JSON.stringify(context.l2Status),
        persona: context.personaPrompt || '',
      },
      query: input,
      user: 'lutagu-user',
      response_mode: 'blocking',
    }),
  });

  const data = await response.json();

  return {
    response: data.answer,
    actionCards: parseActionCards(data.answer),
  };
}

function buildSystemPrompt(context: any): string {
  return `
你是城市導航助手（內部代號 LUTAGU）。

你的特點：
- 不只給路線，還給「建議」
- 理解旅客的焦慮，提供解決方案
- 永遠給出「單一最佳建議」，不讓用戶選擇困難

當前情境：
- 用戶位置：${context.currentNode || '未知'}
- 服務圈層：${context.zone}
- 即時狀態：${JSON.stringify(context.l2Status)}

${context.personaPrompt ? `節點人格：\n${context.personaPrompt}` : ''}

回應規則：
1. 核心圈：提供完整建議
2. 緩衝圈：只提供基本路線，誠實說「這裡我不熟」
3. 外部圈：建議使用 Google Maps

輸出格式：
- 先給建議
- 如果有替代方案，用「或者...」帶過
- 最後可以問一個 follow-up 問題
`.trim();
}
```

---

## 3. 商業導流整合

### 3.1 導流規則設計

```typescript
// 商業導流規則（儲存在 Hub 節點）
interface CommercialRule {
  id: string;
  trigger: {
    condition: 'delay' | 'rain' | 'crowded' | 'luggage' | 'accessibility' | 'rush';
    threshold?: number;  // 延誤分鐘、擁擠度等
  };
  action: {
    provider: 'go_taxi' | 'uber' | 'luup' | 'docomo_cycle' | 'ecbo_cloak';
    priority: number;  // 1 = 最高優先
    message_template: LocalizedText;
    deeplink: string;
    affiliate_code?: string;
  };
}

// 範例規則
const COMMERCIAL_RULES: CommercialRule[] = [
  {
    id: 'delay_taxi',
    trigger: { condition: 'delay', threshold: 15 },
    action: {
      provider: 'go_taxi',
      priority: 1,
      message_template: {
        'zh-TW': '電車延誤中，搭計程車更快抵達',
        'ja': '電車遅延中、タクシーの方が早く着きます',
        'en': 'Train delayed, taxi would be faster',
      },
      deeplink: 'https://go.mo-t.com/',
    },
  },
  {
    id: 'rain_taxi',
    trigger: { condition: 'rain' },
    action: {
      provider: 'go_taxi',
      priority: 2,
      message_template: {
        'zh-TW': '下雨天搭車更舒適',
        'ja': '雨の日はタクシーが快適',
        'en': 'Take a taxi to stay dry',
      },
      deeplink: 'https://go.mo-t.com/',
    },
  },
  {
    id: 'luggage_ecbo',
    trigger: { condition: 'luggage' },
    action: {
      provider: 'ecbo_cloak',
      priority: 1,
      message_template: {
        'zh-TW': '附近有行李寄放點',
        'ja': '近くに荷物預かりがあります',
        'en': 'Luggage storage nearby',
      },
      deeplink: 'https://cloak.ecbo.io/',
    },
  },
];
```

### 3.2 規則套用邏輯

```typescript
// lib/ai/businessRules.ts

interface RuleContext {
  l2Status: L2_LiveStatus;
  userIntent: {
    hasLuggage?: boolean;
    needsAccessibility?: boolean;
    isRushing?: boolean;
  };
  distance?: number;
}

export function applyCommercialRules(
  context: RuleContext,
  rules: CommercialRule[],
  locale: 'zh-TW' | 'ja' | 'en'
): ActionCard[] {
  const applicable: ActionCard[] = [];

  for (const rule of rules) {
    let triggered = false;

    switch (rule.trigger.condition) {
      case 'delay':
        const delay = context.l2Status.transit_status?.[0]?.delay_minutes || 0;
        triggered = delay >= (rule.trigger.threshold || 10);
        break;

      case 'rain':
        triggered = context.l2Status.weather?.condition === 'rain';
        break;

      case 'crowded':
        triggered = context.l2Status.crowding?.level === 'very_crowded';
        break;

      case 'luggage':
        triggered = context.userIntent.hasLuggage === true;
        break;

      case 'accessibility':
        triggered = context.userIntent.needsAccessibility === true;
        break;

      case 'rush':
        triggered = context.userIntent.isRushing === true;
        break;
    }

    if (triggered) {
      applicable.push({
        type: mapProviderToType(rule.action.provider),
        provider: rule.action.provider,
        title: { [locale]: rule.action.message_template[locale] } as LocalizedText,
        subtitle: { [locale]: '' } as LocalizedText,
        icon: getProviderIcon(rule.action.provider),
        deeplink: rule.action.deeplink,
        affiliate_code: rule.action.affiliate_code,
        is_recommended: rule.action.priority === 1,
        _priority: rule.action.priority,
      });
    }
  }

  // 按優先級排序，取前 3 個
  return applicable
    .sort((a, b) => (a._priority || 99) - (b._priority || 99))
    .slice(0, 3);
}

function getProviderIcon(provider: string): string {
  const icons: Record<string, string> = {
    go_taxi: '🚕',
    uber: '🚗',
    luup: '🛵',
    docomo_cycle: '🚲',
    ecbo_cloak: '🧳',
  };
  return icons[provider] || '📍';
}
```

### 3.3 Action Card 生成

```typescript
// 最終 Action Cards 生成
export function buildActionCards(
  routeOptions: RouteOption[],
  commercialCards: ActionCard[],
  locale: 'zh-TW' | 'ja' | 'en'
): ActionCard[] {
  const cards: ActionCard[] = [];

  // 1. 主要交通建議（永遠是第一張）
  if (routeOptions.length > 0) {
    const best = routeOptions[0];
    cards.push({
      type: 'transit',
      title: { [locale]: best.summary } as LocalizedText,
      subtitle: { [locale]: best.details } as LocalizedText,
      icon: '🚃',
      duration: best.duration,
      price: { [locale]: `¥${best.price}` } as LocalizedText,
      is_recommended: true,
    });
  }

  // 2. 商業導流卡片（最多 2 張）
  const commercialSlots = commercialCards.slice(0, 2);
  cards.push(...commercialSlots);

  // 確保總數不超過 3 張
  return cards.slice(0, 3);
}
```

---

## 4. 完整處理流程

```typescript
// lib/ai/processor.ts

export async function processUserInput(
  input: string,
  context: AppContext
): Promise<ProcessResult> {
  const startTime = Date.now();

  // Step 1: 快速規則匹配
  const quickResult = quickMatch(input);
  if (quickResult.matched) {
    const result = await handleRuleBasedIntent(quickResult.intent, context);
    result.latencyMs = Date.now() - startTime;
    result.processingLayer = 'rule';
    return result;
  }

  // Step 2: 檢查是否需要 LLM
  if (shouldUseLLM(input)) {
    const result = await handleLLMQuery(input, context);
    result.latencyMs = Date.now() - startTime;
    result.processingLayer = 'llm';
    return result;
  }

  // Step 3: SLM 分類
  const classification = await classifyIntent(input);

  if (classification.confidence < 0.6) {
    // 信心度低，升級到 LLM
    const result = await handleLLMQuery(input, context);
    result.latencyMs = Date.now() - startTime;
    result.processingLayer = 'llm';
    return result;
  }

  // Step 4: 根據意圖處理
  const entities = await extractEntities(input, classification.intent);
  const result = await handleSLMIntent(classification.intent, entities, context);
  result.latencyMs = Date.now() - startTime;
  result.processingLayer = 'slm';

  return result;
}
```

---

## 5. 降級策略

```typescript
// lib/ai/fallback.ts

export async function processWithFallback(
  input: string,
  context: AppContext
): Promise<ProcessResult> {
  try {
    // 嘗試正常處理（5 秒超時）
    const result = await Promise.race([
      processUserInput(input, context),
      timeout(5000),
    ]);
    return result;
  } catch (e) {
    console.warn('Processing failed, using fallback:', e);
  }

  // 降級回應
  return {
    response: getFallbackResponse(context.locale),
    actionCards: getQuickActions(context),
    processingLayer: 'rule',
    latencyMs: 0,
    isFallback: true,
  };
}

function getFallbackResponse(locale: string): string {
  const responses = {
    'zh-TW': '抱歉，我現在反應有點慢 😅\n先試試這些快速功能：',
    'ja': 'すみません、反応が遅くなっています 😅\nこちらをお試しください：',
    'en': "Sorry, I'm a bit slow right now 😅\nTry these quick options:",
  };
  return responses[locale] || responses['zh-TW'];
}

function getQuickActions(context: AppContext): ActionCard[] {
  return [
    { type: 'quick', title: { 'zh-TW': '🚃 查路線' }, action: 'route_search' },
    { type: 'quick', title: { 'zh-TW': '🚻 找廁所' }, action: 'find_toilet' },
    { type: 'quick', title: { 'zh-TW': '📊 看狀態' }, action: 'status_overview' },
  ];
}
```

---

## 6. 成本估算

### 假設情境

- 每日活躍用戶：1,000 人
- 每用戶平均對話：5 輪
- 每日總對話數：5,000 次

### 成本對比

| 架構 | 各層分配 | 月成本 | 平均延遲 |
|------|----------|--------|----------|
| 全 LLM | 100% LLM | $150-300 | 1.5-2.5s |
| **混合架構** | 60/30/10 | **$30** | **300-500ms** |
| 節省 | — | **80-90%** | **70-80%** |

### 詳細分配

| 層級 | 佔比 | 次數/日 | 單價 | 日成本 | 月成本 |
|------|------|---------|------|--------|--------|
| Rule-based | 60% | 3,000 | $0 | $0 | $0 |
| SLM (本地) | 30% | 1,500 | $0 | $0 | $0 |
| LLM | 10% | 500 | $0.002 | $1 | $30 |
| **總計** | | 5,000 | | $1/日 | **$30/月** |

---

## 7. MVP 簡化建議

```
如果時間緊迫，MVP 可以簡化為兩層：

Rule-based (70%) + LLM (30%)

- Rule：所有確定性任務
- LLM：所有需要「理解」的任務

Phase 2 再加入 SLM 優化成本。

實作順序：
1. Intent Router（快速規則匹配）
2. Template 系統
3. Business Rules（商業導流）
4. 串接 Dify（LLM）
5. Fallback 機制
```

---

*版本：v3.0 | 最後更新：2025-12-22*
