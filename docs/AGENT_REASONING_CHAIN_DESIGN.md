# LUTAGU Agent 思考鏈設計文檔

## 概述

本文件定義 LUTAGU Agent 在「交通決策」場景下的推理邏輯，核心目標是讓 AI 能夠：
1. **量化轉乘辛苦程度**（Transfer Pain Index）
2. **計算延誤連鎖風險**（Cascade Delay Risk）
3. **評估等待價值**（Wait Value Coefficient）
4. **給出情境感知建議**（Context-Aware Recommendation）

## 核心設計原則

```
┌──────────────────────────────────────────────────────────────┐
│  「節點」提供用戶需求位址   ←→   「標籤」提供環境脈絡         │
│      (Node = Where)              (Tag = Context)             │
└──────────────────────────────────────────────────────────────┘
```

---

## 1. 轉乘辛苦指標 (Transfer Pain Index, TPI)

### 1.1 定義

**TPI** 是一個 0-100 的數值，量化「從 A 線月台到 B 線月台」的身體與心理負擔。

```
TPI = W_distance × D + W_vertical × V + W_complexity × C + W_crowd × R + W_user × U
```

### 1.2 因子定義

| 因子 | 符號 | 說明 | 數據來源 | 權重 |
|-----|------|------|---------|------|
| **水平距離** | D | 轉乘步行距離（公尺） | L3 設施圖 / 專家知識 | 0.25 |
| **垂直移動** | V | 樓層差 × 移動方式係數 | L3 電梯/電扶梯資料 | 0.20 |
| **動線複雜度** | C | 轉彎次數、指標清晰度 | 專家知識標註 | 0.20 |
| **預期人潮** | R | 時段 × 車站擁擠度 | L2 即時 / 歷史模型 | 0.15 |
| **用戶狀態修正** | U | 行李/輪椅/嬰兒車加權 | 用戶偏好設定 | 0.20 |

### 1.3 計算細節

#### 1.3.1 水平距離分數 (D)

```typescript
function calcDistanceScore(meters: number): number {
  if (meters <= 100) return 0;
  if (meters <= 200) return 20;
  if (meters <= 300) return 40;
  if (meters <= 500) return 60;
  if (meters <= 800) return 80;
  return 100; // > 800m (如東京站京葉線)
}
```

#### 1.3.2 垂直移動分數 (V)

```typescript
type VerticalMethod = 'elevator' | 'escalator' | 'stairs';

function calcVerticalScore(
  floors: number,
  method: VerticalMethod,
  hasLuggage: boolean
): number {
  const baseScore = Math.abs(floors) * 10;

  const methodMultiplier = {
    'elevator': 0.3,      // 電梯最輕鬆，但要等
    'escalator': 0.6,     // 電扶梯中等
    'stairs': 1.0         // 樓梯最累
  };

  const luggageMultiplier = hasLuggage ? 1.5 : 1.0;

  return Math.min(100, baseScore * methodMultiplier[method] * luggageMultiplier);
}
```

#### 1.3.3 動線複雜度分數 (C)

```typescript
interface StationComplexity {
  turnCount: number;           // 轉彎次數
  signageClarity: 1 | 2 | 3;   // 指標清晰度 (1=差, 3=好)
  exitCount: number;           // 出口數量（越多越容易迷路）
  underConstruction: boolean;  // 施工中
}

function calcComplexityScore(complexity: StationComplexity): number {
  let score = 0;

  score += complexity.turnCount * 5;
  score += (4 - complexity.signageClarity) * 15; // 指標差 = +45
  score += Math.min(complexity.exitCount / 2, 20); // 出口多 = +20 max
  score += complexity.underConstruction ? 25 : 0;

  return Math.min(100, score);
}
```

#### 1.3.4 人潮修正 (R)

```typescript
type CrowdLevel = 'empty' | 'normal' | 'busy' | 'packed' | 'crush';

function calcCrowdScore(level: CrowdLevel, hasLuggage: boolean): number {
  const baseScores: Record<CrowdLevel, number> = {
    'empty': 0,
    'normal': 10,
    'busy': 30,
    'packed': 60,
    'crush': 100
  };

  const luggageMultiplier = hasLuggage ? 1.5 : 1.0;
  return Math.min(100, baseScores[level] * luggageMultiplier);
}
```

#### 1.3.5 用戶狀態修正 (U)

```typescript
function calcUserModifier(preferences: UserPreferences): number {
  let modifier = 0;

  if (preferences.accessibility.wheelchair) modifier += 40;
  if (preferences.accessibility.stroller) modifier += 30;
  if (preferences.accessibility.elderly) modifier += 20;
  if (preferences.accessibility.visual_impairment) modifier += 25;
  if (preferences.luggage.large_luggage) modifier += 25;
  if (preferences.luggage.multiple_bags) modifier += 15;
  if (preferences.travel_style.rushing) modifier -= 10; // 趕時間的人忍耐度較高
  if (preferences.companions.with_children) modifier += 20;

  return Math.min(100, Math.max(0, modifier));
}
```

### 1.4 TPI 解讀與建議映射

| TPI 範圍 | 等級 | Agent 建議策略 |
|---------|------|---------------|
| 0-20 | 🟢 輕鬆 | 正常建議，無需特別說明 |
| 21-40 | 🟡 普通 | 提示「需步行 X 分鐘」 |
| 41-60 | 🟠 辛苦 | 主動提供替代路線比較 |
| 61-80 | 🔴 困難 | 強烈建議替代路線或分段 |
| 81-100 | ⛔ 極困難 | 勸退或建議計程車/等待 |

---

## 2. 延誤連鎖風險計算 (Cascade Delay Risk, CDR)

### 2.1 場景定義

用戶路線：`A站 → (X線) → B站 → (Y線) → C站`

當 X 線發生延誤時，需計算：
1. B 站的轉乘是否還來得及
2. 後續 Y 線的班次是否受影響
3. 整體旅程風險

### 2.2 轉乘成功率 (Transfer Success Rate, TSR)

```typescript
interface TransferWindow {
  scheduledArrival: Date;      // 預定到達轉乘站時間
  nextDeparture: Date;         // 下一班車發車時間
  transferTimeRequired: number; // 轉乘所需時間（分鐘）
  delayMinutes: number;        // 當前延誤（分鐘）
}

function calcTransferSuccessRate(window: TransferWindow): number {
  const bufferMinutes =
    (window.nextDeparture.getTime() - window.scheduledArrival.getTime()) / 60000
    - window.transferTimeRequired;

  const effectiveBuffer = bufferMinutes - window.delayMinutes;

  // 機率模型：緩衝時間 vs 成功率
  if (effectiveBuffer >= 10) return 0.99;  // 充裕
  if (effectiveBuffer >= 5)  return 0.90;  // 安全
  if (effectiveBuffer >= 3)  return 0.70;  // 有風險
  if (effectiveBuffer >= 1)  return 0.40;  // 高風險
  if (effectiveBuffer >= 0)  return 0.20;  // 極高風險
  return 0.05; // 幾乎不可能
}
```

### 2.3 連鎖延誤風險 (CDR)

```typescript
interface JourneyLeg {
  fromStation: string;
  toStation: string;
  line: string;
  scheduledDeparture: Date;
  scheduledArrival: Date;
  currentDelay: number; // 分鐘
}

interface CascadeRiskResult {
  overallSuccessRate: number;  // 整體成功機率 (0-1)
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  bottleneckLeg: number;       // 哪一段是瓶頸
  recommendation: string;
}

function calcCascadeDelayRisk(legs: JourneyLeg[]): CascadeRiskResult {
  let cumulativeDelay = 0;
  let overallSuccessRate = 1.0;
  let bottleneckLeg = -1;
  let minSuccessRate = 1.0;

  for (let i = 0; i < legs.length - 1; i++) {
    const currentLeg = legs[i];
    const nextLeg = legs[i + 1];

    // 累積延誤
    cumulativeDelay += currentLeg.currentDelay;

    // 計算這次轉乘的成功率
    const transferWindow: TransferWindow = {
      scheduledArrival: currentLeg.scheduledArrival,
      nextDeparture: nextLeg.scheduledDeparture,
      transferTimeRequired: getTransferTime(currentLeg.toStation, currentLeg.line, nextLeg.line),
      delayMinutes: cumulativeDelay
    };

    const tsr = calcTransferSuccessRate(transferWindow);
    overallSuccessRate *= tsr;

    if (tsr < minSuccessRate) {
      minSuccessRate = tsr;
      bottleneckLeg = i;
    }
  }

  // 風險等級判定
  let riskLevel: CascadeRiskResult['riskLevel'];
  if (overallSuccessRate >= 0.8) riskLevel = 'low';
  else if (overallSuccessRate >= 0.5) riskLevel = 'medium';
  else if (overallSuccessRate >= 0.2) riskLevel = 'high';
  else riskLevel = 'critical';

  return {
    overallSuccessRate,
    riskLevel,
    bottleneckLeg,
    recommendation: generateRiskRecommendation(riskLevel, bottleneckLeg, legs)
  };
}
```

### 2.4 末班車風險計算

```typescript
interface LastTrainRisk {
  hasLastTrainRisk: boolean;
  missedLines: string[];          // 可能錯過的末班車
  safeDepartureDeadline: Date;    // 最晚出發時間
  alternativeOptions: string[];   // 替代方案
}

function calcLastTrainRisk(
  journey: JourneyLeg[],
  currentTime: Date,
  lastTrainTimes: Map<string, Date>
): LastTrainRisk {
  const missedLines: string[] = [];
  let earliestDeadline: Date | null = null;

  for (const leg of journey) {
    const lastTrain = lastTrainTimes.get(leg.line);
    if (!lastTrain) continue;

    // 計算需要在什麼時間前抵達該站
    const requiredArrival = new Date(lastTrain.getTime() - 10 * 60000); // 預留10分鐘

    if (leg.scheduledArrival > requiredArrival) {
      missedLines.push(leg.line);
    }

    // 反推最晚出發時間
    const legDuration = leg.scheduledArrival.getTime() - leg.scheduledDeparture.getTime();
    const deadline = new Date(requiredArrival.getTime() - legDuration);

    if (!earliestDeadline || deadline < earliestDeadline) {
      earliestDeadline = deadline;
    }
  }

  return {
    hasLastTrainRisk: missedLines.length > 0,
    missedLines,
    safeDepartureDeadline: earliestDeadline || new Date(),
    alternativeOptions: missedLines.length > 0
      ? ['計程車', '網咖休息', '膠囊旅館']
      : []
  };
}
```

---

## 3. 等待價值係數 (Wait Value Coefficient, WVC)

### 3.1 核心概念

當延誤嚴重時，Agent 需要判斷：
- **繼續等待** 的價值 vs
- **放棄原路線** 去做其他事情的價值

### 3.2 計算公式

```
WVC = (目的地價值 × 時間敏感度) / (等待時間 + 轉乘辛苦度 + 心理疲勞)
```

### 3.3 實作

```typescript
interface WaitValueInput {
  // 目的地因素
  destinationUrgency: number;     // 0-1: 約會=1, 閒逛=0.3
  destinationOpenHours?: {        // 目的地營業時間
    closes: Date;
  };

  // 等待因素
  expectedWaitMinutes: number;    // 預期等待時間
  waitEnvironment: 'outdoor' | 'indoor_standing' | 'indoor_seated' | 'cafe';

  // 用戶因素
  userFatigue: number;            // 0-1: 疲勞程度
  hasLuggage: boolean;

  // 環境因素
  weather: 'good' | 'hot' | 'cold' | 'rainy';
  nearbyAmenities: NearbyAmenity[];
}

interface NearbyAmenity {
  type: 'cafe' | 'restaurant' | 'convenience_store' | 'internet_cafe' | 'rest_area';
  name: string;
  walkMinutes: number;
  vibeMatch: number;  // 0-1: 與用戶偏好匹配度
}

interface WaitValueResult {
  coefficient: number;           // 0-2: <1 建議放棄, >1 建議等待
  recommendation: 'wait' | 'divert' | 'rest_nearby';
  reasoning: string;
  suggestedAction?: {
    type: string;
    location: string;
    duration: number;
  };
}

function calcWaitValue(input: WaitValueInput): WaitValueResult {
  // 1. 目的地價值 (0-100)
  let destinationValue = input.destinationUrgency * 100;

  // 如果目的地快關門，價值下降
  if (input.destinationOpenHours) {
    const minutesUntilClose =
      (input.destinationOpenHours.closes.getTime() - Date.now()) / 60000;
    const arrivalTime = input.expectedWaitMinutes + 30; // 假設30分鐘車程

    if (arrivalTime > minutesUntilClose) {
      destinationValue *= 0.1; // 到了也關門了
    } else if (arrivalTime > minutesUntilClose - 30) {
      destinationValue *= 0.5; // 只能待很短時間
    }
  }

  // 2. 等待成本 (0-100)
  let waitCost = input.expectedWaitMinutes * 2; // 基礎：每分鐘 2 點

  // 環境修正
  const envMultiplier: Record<string, number> = {
    'outdoor': 1.5,
    'indoor_standing': 1.2,
    'indoor_seated': 0.8,
    'cafe': 0.5
  };
  waitCost *= envMultiplier[input.waitEnvironment];

  // 天氣修正
  const weatherMultiplier: Record<string, number> = {
    'good': 1.0,
    'hot': 1.3,
    'cold': 1.3,
    'rainy': 1.5
  };
  waitCost *= weatherMultiplier[input.weather];

  // 行李修正
  if (input.hasLuggage) waitCost *= 1.4;

  // 疲勞修正
  waitCost *= (1 + input.userFatigue * 0.5);

  // 3. 計算係數
  const coefficient = destinationValue / Math.max(waitCost, 1);

  // 4. 決策
  let recommendation: WaitValueResult['recommendation'];
  let reasoning: string;
  let suggestedAction: WaitValueResult['suggestedAction'] | undefined;

  if (coefficient >= 1.5) {
    recommendation = 'wait';
    reasoning = '目的地價值高，建議耐心等待';
  } else if (coefficient >= 0.8) {
    // 找附近休息點
    const bestAmenity = input.nearbyAmenities
      .filter(a => a.walkMinutes <= 5)
      .sort((a, b) => b.vibeMatch - a.vibeMatch)[0];

    if (bestAmenity) {
      recommendation = 'rest_nearby';
      reasoning = `等待時間較長，建議先到 ${bestAmenity.name} 休息`;
      suggestedAction = {
        type: bestAmenity.type,
        location: bestAmenity.name,
        duration: Math.max(input.expectedWaitMinutes - 10, 15)
      };
    } else {
      recommendation = 'wait';
      reasoning = '建議在站內等待，但可考慮到便利商店補給';
    }
  } else {
    recommendation = 'divert';
    reasoning = '等待成本過高，建議改變計畫或搭乘計程車';
  }

  return { coefficient, recommendation, reasoning, suggestedAction };
}
```

### 3.4 與 L1 區域 DNA 整合

```typescript
function enrichWithAreaDNA(
  waitResult: WaitValueResult,
  stationId: string,
  areaVibeTags: string[]
): WaitValueResult {
  // 根據區域特性調整建議

  if (waitResult.recommendation === 'rest_nearby') {
    // 根據區域 DNA 給出更具體的建議
    if (areaVibeTags.includes('CAFE_CULTURE')) {
      waitResult.reasoning += '。這一帶咖啡廳很多，正好可以體驗一下在地氛圍';
    } else if (areaVibeTags.includes('RETRO_SHOPPING')) {
      waitResult.reasoning += '。可以逛逛附近的商店街，說不定有意外收穫';
    } else if (areaVibeTags.includes('BUSINESS_DISTRICT')) {
      waitResult.reasoning += '。商業區的便利商店設備齊全，可以先休息充電';
    }
  }

  if (waitResult.recommendation === 'divert') {
    // 心理安撫
    if (areaVibeTags.includes('FOOD_PARADISE')) {
      waitResult.reasoning += '。既然來了，不如就在這附近吃個飯吧——這裡可是美食激戰區！';
    } else if (areaVibeTags.includes('NIGHTLIFE')) {
      waitResult.reasoning += '。這一帶夜生活豐富，不妨改變計畫探索一下？';
    }
  }

  return waitResult;
}
```

---

## 4. Agent 思考鏈 (Reasoning Chain)

### 4.1 完整推理流程

```
┌─────────────────────────────────────────────────────────────────┐
│                      用戶查詢輸入                                 │
│  「我要從東京站去新宿，但聽說中央線延誤了」                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Step 1: 意圖識別 (Intent Classification)                        │
│  ─────────────────────────────────────────────────────────────  │
│  • 主意圖: route (路線查詢)                                       │
│  • 子意圖: disruption_aware (延誤感知)                           │
│  • 提取實體: 起點=東京站, 終點=新宿, 關注線路=中央線                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Step 2: L2 即時狀態掃描 (Live Sense Scan)                       │
│  ─────────────────────────────────────────────────────────────  │
│  • 查詢 ODPT API: odpt:TrainInformation                         │
│  • 結果: 中央線快速 延誤 15分鐘 (人身事故)                         │
│  • 影響評估: 預計恢復時間 30分鐘                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Step 3: 路線生成 (Route Generation)                             │
│  ─────────────────────────────────────────────────────────────  │
│  生成 3 條候選路線:                                               │
│  ├─ Route A: 東京 → (中央線快速) → 新宿 [受影響]                   │
│  ├─ Route B: 東京 → (丸之內線) → 新宿                             │
│  └─ Route C: 東京 → (丸之內線) → 西新宿                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Step 4: TPI 計算 (Transfer Pain Index)                          │
│  ─────────────────────────────────────────────────────────────  │
│  Route A: TPI = 25 (正常情況)                                    │
│  Route B: TPI = 55 (新宿站轉乘複雜)                               │
│           └─ 原因: 丸之內線→地面 需走 500m, 出口多                 │
│  Route C: TPI = 22 (西新宿站簡單)                                 │
│           └─ 原因: A1出口直結, 步行 5分鐘到都廳                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Step 5: CDR 計算 (Cascade Delay Risk)                           │
│  ─────────────────────────────────────────────────────────────  │
│  Route A: CDR = 0.65 (medium risk)                               │
│           └─ 15分鐘延誤可能導致後續轉乘風險                        │
│  Route B: CDR = 0.95 (low risk)                                  │
│  Route C: CDR = 0.98 (low risk)                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Step 6: 綜合評分 (Composite Scoring)                            │
│  ─────────────────────────────────────────────────────────────  │
│  Score = (100 - TPI) × CDR × TimeEfficiency                      │
│                                                                  │
│  Route A: (100-25) × 0.65 × 0.8 = 39.0                          │
│  Route B: (100-55) × 0.95 × 0.9 = 38.5                          │
│  Route C: (100-22) × 0.98 × 0.85 = 65.0 ← 最佳                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Step 7: L1 區域 DNA 補充 (Area DNA Enrichment)                  │
│  ─────────────────────────────────────────────────────────────  │
│  西新宿 vibe_tags: [BUSINESS, GOVERNMENT, SKYSCRAPER]            │
│  新宿 vibe_tags: [SHOPPING, NIGHTLIFE, COMPLEX_STATION]          │
│                                                                  │
│  → 西新宿更適合「目的明確的移動」                                   │
│  → 新宿適合「順便逛逛」但動線複雜                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Step 8: 生成回應 (Response Generation)                          │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  🎯 推薦: 丸之內線 → 西新宿站                                      │
│                                                                  │
│  中央線目前延誤約 15 分鐘，建議改搭丸之內線。                        │
│                                                                  │
│  💡 為什麼推薦西新宿站而不是新宿站？                                │
│  • 新宿站出口超過 200 個，動線複雜                                  │
│  • 西新宿站 A1 出口直結，步行 5 分鐘即達都廳                        │
│  • 省去在新宿站內迷路的風險                                        │
│                                                                  │
│  ⏱️ 預估時間: 15 分鐘（含步行）                                    │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 TypeScript 實作

```typescript
interface ReasoningChainResult {
  steps: ReasoningStep[];
  finalRecommendation: RouteRecommendation;
  confidence: number;
  reasoning: string;
}

interface ReasoningStep {
  name: string;
  input: any;
  output: any;
  duration_ms: number;
}

async function executeReasoningChain(
  query: string,
  userPreferences: UserPreferences,
  currentTime: Date
): Promise<ReasoningChainResult> {
  const steps: ReasoningStep[] = [];

  // Step 1: Intent Classification
  const intentStart = Date.now();
  const intent = await classifyIntent(query);
  steps.push({
    name: 'intent_classification',
    input: { query },
    output: intent,
    duration_ms: Date.now() - intentStart
  });

  // Step 2: L2 Live Sense Scan
  const l2Start = Date.now();
  const liveStatus = await fetchL2Status(intent.affectedLines);
  steps.push({
    name: 'l2_live_scan',
    input: { lines: intent.affectedLines },
    output: liveStatus,
    duration_ms: Date.now() - l2Start
  });

  // Step 3: Route Generation
  const routeStart = Date.now();
  const candidateRoutes = await generateRoutes(
    intent.origin,
    intent.destination,
    liveStatus
  );
  steps.push({
    name: 'route_generation',
    input: { origin: intent.origin, destination: intent.destination },
    output: candidateRoutes,
    duration_ms: Date.now() - routeStart
  });

  // Step 4-5: TPI & CDR Calculation
  const scoringStart = Date.now();
  const scoredRoutes = await Promise.all(
    candidateRoutes.map(async (route) => {
      const tpi = calcTransferPainIndex(route, userPreferences);
      const cdr = calcCascadeDelayRisk(route.legs);
      const timeEfficiency = calcTimeEfficiency(route, liveStatus);

      return {
        route,
        tpi,
        cdr,
        compositeScore: (100 - tpi) * cdr.overallSuccessRate * timeEfficiency
      };
    })
  );
  steps.push({
    name: 'tpi_cdr_scoring',
    input: { routes: candidateRoutes.length },
    output: scoredRoutes.map(r => ({
      route: r.route.name,
      tpi: r.tpi,
      cdr: r.cdr.riskLevel,
      score: r.compositeScore
    })),
    duration_ms: Date.now() - scoringStart
  });

  // Step 6: Select Best Route
  const bestRoute = scoredRoutes.reduce((a, b) =>
    a.compositeScore > b.compositeScore ? a : b
  );

  // Step 7: L1 Area DNA Enrichment
  const l1Start = Date.now();
  const areaDNA = await fetchAreaDNA(bestRoute.route.destinationStation);
  const enrichedReasoning = enrichWithAreaDNA(
    bestRoute,
    areaDNA.vibeTags
  );
  steps.push({
    name: 'l1_area_enrichment',
    input: { station: bestRoute.route.destinationStation },
    output: { vibeTags: areaDNA.vibeTags },
    duration_ms: Date.now() - l1Start
  });

  // Step 8: Generate Response
  const response = generateNaturalLanguageResponse(
    bestRoute,
    enrichedReasoning,
    userPreferences.locale
  );

  return {
    steps,
    finalRecommendation: bestRoute.route,
    confidence: bestRoute.cdr.overallSuccessRate,
    reasoning: response
  };
}
```

---

## 5. 數據庫 Schema 擴展

### 5.1 轉乘資訊表

```sql
CREATE TABLE station_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_station_id TEXT NOT NULL REFERENCES nodes(id),
  from_line_id TEXT NOT NULL,
  to_station_id TEXT NOT NULL REFERENCES nodes(id),
  to_line_id TEXT NOT NULL,

  -- TPI 因子
  walking_distance_meters INTEGER,
  floor_difference INTEGER,
  vertical_method TEXT, -- 'elevator' | 'escalator' | 'stairs' | 'mixed'
  turn_count INTEGER,
  signage_clarity INTEGER CHECK (signage_clarity BETWEEN 1 AND 3),

  -- 預計算 TPI
  base_tpi INTEGER,

  -- 時段修正
  peak_hour_multiplier NUMERIC(3,2) DEFAULT 1.0,

  -- 專家知識
  expert_notes JSONB, -- { traps: [], hacks: [] }

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_station_transfers_from ON station_transfers(from_station_id, from_line_id);
CREATE INDEX idx_station_transfers_to ON station_transfers(to_station_id, to_line_id);
```

### 5.2 區域等待設施表

```sql
CREATE TABLE station_nearby_amenities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id TEXT NOT NULL REFERENCES nodes(id),

  amenity_type TEXT NOT NULL, -- 'cafe' | 'restaurant' | 'convenience_store' | 'internet_cafe'
  name TEXT NOT NULL,
  name_en TEXT,

  walk_minutes INTEGER,
  coordinates GEOGRAPHY(POINT, 4326),

  -- 用於 WVC 計算
  has_seating BOOLEAN DEFAULT true,
  has_wifi BOOLEAN DEFAULT false,
  has_power_outlet BOOLEAN DEFAULT false,

  -- L1 DNA 匹配
  vibe_tags TEXT[],

  operating_hours JSONB, -- { mon: { open: '07:00', close: '22:00' }, ... }

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_station_amenities ON station_nearby_amenities(station_id);
```

---

## 6. 優先實作建議

### Phase 1: TPI 基礎（1-2週）
1. 建立 `station_transfers` 表
2. 手動填入 TOP 30 大站的轉乘數據
3. 實作 `calcTransferPainIndex()` 函數

### Phase 2: CDR 整合（1週）
1. 整合 ODPT 即時延誤 API
2. 實作 `calcCascadeDelayRisk()` 函數
3. 加入末班車風險計算

### Phase 3: WVC 與 L1 整合（1週）
1. 建立 `station_nearby_amenities` 表
2. 整合 L1 區域 DNA
3. 實作「勸退」邏輯

### Phase 4: Agent 思考鏈（2週）
1. 重構 HybridEngine 加入推理鏈
2. 加入可解釋性輸出
3. 測試與調優

---

## 附錄：關鍵車站 TPI 預設值參考

| 車站 | 轉乘 | 預設 TPI | 主要原因 |
|-----|------|---------|---------|
| 東京站 | JR→京葉線 | 85 | 500m地下通道 |
| 新宿站 | JR→大江戶線 | 70 | 出口複雜、深層月台 |
| 澀谷站 | JR→副都心線 | 65 | 施工中、動線多變 |
| 池袋站 | JR→有樂町線 | 50 | 距離中等 |
| 上野站 | JR→銀座線 | 40 | 動線清晰 |
| 秋葉原站 | JR→日比谷線 | 25 | 距離近 |

---

*文件版本: 1.0*
*最後更新: 2026-01-09*
