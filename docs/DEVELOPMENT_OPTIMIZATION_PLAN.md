# LUTAGU AI 混合架構系統 - 開發優化工作計劃

> **版本**: 1.0
> **建立日期**: 2025-01-09
> **目標**: 完善 AI 混合架構系統，提升 ODPT Challenge 2025 競賽競爭力

---

## 📋 計劃總覽

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        開發優化工作階段總覽                               │
├─────────────────────────────────────────────────────────────────────────┤
│  Phase 1 (短期)     │  Phase 2 (中期)      │  Phase 3 (長期)            │
│  ─────────────────  │  ─────────────────   │  ─────────────────         │
│  • TPI/CDR 整合啟用 │  • 錯誤監控系統      │  • 用戶反饋學習系統         │
│  • TOP 10 站點數據  │  • Amenities 數據    │  • A/B 測試框架             │
│  • 基礎單元測試     │  • 完整測試套件      │  • 多數據源整合             │
│                     │  • Deep Link 整合    │  • 權重自動調優             │
├─────────────────────────────────────────────────────────────────────────┤
│  預估工期: 5天      │  預估工期: 10天      │  預估工期: 持續迭代          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Phase 1: 核心功能整合 (短期 - 5個工作天)

### 1.1 TPI/CDR 計算整合至 HybridEngine

**目標**: 將設計完善的 TPI/CDR 算法實際整合到路線推薦流程

**檔案變更**:
- `src/lib/l4/HybridEngine.ts`
- `src/lib/l4/reasoning/TransferPainIndex.ts` (新建)
- `src/lib/l4/reasoning/CascadeDelayRisk.ts` (新建)

#### 任務 1.1.1: 實現 TPI 計算器

```typescript
// src/lib/l4/reasoning/TransferPainIndex.ts

import {
  TPIInput,
  TPIResult,
  TPIWeights,
  DEFAULT_REASONING_CONFIG
} from './types';

export class TransferPainIndexCalculator {
  private weights: TPIWeights;

  constructor(weights?: TPIWeights) {
    this.weights = weights || DEFAULT_REASONING_CONFIG.tpiWeights;
  }

  /**
   * 計算水平距離分數
   */
  private calcDistanceScore(meters: number): number {
    if (meters <= 100) return 0;
    if (meters <= 200) return 20;
    if (meters <= 300) return 40;
    if (meters <= 500) return 60;
    if (meters <= 800) return 80;
    return 100;
  }

  /**
   * 計算垂直移動分數
   */
  private calcVerticalScore(
    floors: number,
    method: 'elevator' | 'escalator' | 'stairs' | 'mixed',
    hasLuggage: boolean
  ): number {
    const baseScore = Math.abs(floors) * 10;
    const methodMultiplier = {
      elevator: 0.3,
      escalator: 0.6,
      stairs: 1.0,
      mixed: 0.7
    };
    const luggageMultiplier = hasLuggage ? 1.5 : 1.0;
    return Math.min(100, baseScore * methodMultiplier[method] * luggageMultiplier);
  }

  /**
   * 計算動線複雜度分數
   */
  private calcComplexityScore(complexity: TPIInput['transfer']['complexity']): number {
    let score = 0;
    score += complexity.turnCount * 5;
    score += (4 - complexity.signageClarity) * 15;
    score += Math.min(complexity.exitCount / 2, 20);
    score += complexity.underConstruction ? 25 : 0;
    return Math.min(100, score);
  }

  /**
   * 計算人潮修正分數
   */
  private calcCrowdScore(level: TPIInput['crowdLevel'], hasLuggage: boolean): number {
    const baseScores = {
      empty: 0,
      normal: 10,
      busy: 30,
      packed: 60,
      crush: 100
    };
    const luggageMultiplier = hasLuggage ? 1.5 : 1.0;
    return Math.min(100, baseScores[level] * luggageMultiplier);
  }

  /**
   * 計算用戶狀態修正
   */
  private calcUserModifier(accessibility: TPIInput['userAccessibilityNeeds']): number {
    let modifier = 0;
    if (accessibility.wheelchair) modifier += 40;
    if (accessibility.stroller) modifier += 30;
    if (accessibility.elderly) modifier += 20;
    if (accessibility.visualImpairment) modifier += 25;
    return Math.min(100, modifier);
  }

  /**
   * 計算完整 TPI
   */
  public calculate(input: TPIInput): TPIResult {
    const distance = this.calcDistanceScore(input.transfer.walkingDistanceMeters);
    const vertical = this.calcVerticalScore(
      input.transfer.floorDifference,
      input.transfer.verticalMethod,
      input.userHasLuggage
    );
    const complexity = this.calcComplexityScore(input.transfer.complexity);
    const crowd = this.calcCrowdScore(input.crowdLevel, input.userHasLuggage);
    const userModifier = this.calcUserModifier(input.userAccessibilityNeeds);

    const score = Math.min(100, Math.round(
      this.weights.distance * distance +
      this.weights.vertical * vertical +
      this.weights.complexity * complexity +
      this.weights.crowd * crowd +
      this.weights.userModifier * userModifier
    ));

    const level = this.getLevel(score);
    const recommendation = this.getRecommendation(level, input);

    return {
      score,
      level,
      breakdown: { distance, vertical, complexity, crowd, userModifier },
      recommendation
    };
  }

  private getLevel(score: number): TPIResult['level'] {
    if (score <= 20) return 'easy';
    if (score <= 40) return 'normal';
    if (score <= 60) return 'hard';
    if (score <= 80) return 'difficult';
    return 'extreme';
  }

  private getRecommendation(level: TPIResult['level'], input: TPIInput): string {
    const messages: Record<string, Record<TPIResult['level'], string>> = {
      zh: {
        easy: '轉乘輕鬆，正常行走即可',
        normal: `需步行約 ${Math.ceil(input.transfer.walkingDistanceMeters / 80)} 分鐘`,
        hard: '轉乘較為辛苦，建議預留充足時間',
        difficult: '轉乘相當困難，強烈建議考慮替代路線',
        extreme: '轉乘極度困難，建議改搭計程車或選擇其他路線'
      },
      en: {
        easy: 'Easy transfer, normal walking',
        normal: `About ${Math.ceil(input.transfer.walkingDistanceMeters / 80)} min walk`,
        hard: 'Moderate difficulty, allow extra time',
        difficult: 'Difficult transfer, consider alternatives',
        extreme: 'Extremely difficult, recommend taxi or different route'
      }
    };
    return messages.zh[level];
  }
}

export const tpiCalculator = new TransferPainIndexCalculator();
```

#### 任務 1.1.2: 實現 CDR 計算器

```typescript
// src/lib/l4/reasoning/CascadeDelayRisk.ts

import {
  JourneyLeg,
  TransferWindow,
  CDRResult,
  RiskLevel,
  LastTrainRisk
} from './types';

export class CascadeDelayRiskCalculator {
  /**
   * 計算單次轉乘成功率
   */
  private calcTransferSuccessRate(window: TransferWindow): number {
    const bufferMinutes =
      (window.nextDeparture.getTime() - window.scheduledArrival.getTime()) / 60000
      - window.transferTimeRequired;

    const effectiveBuffer = bufferMinutes - window.delayMinutes;

    if (effectiveBuffer >= 10) return 0.99;
    if (effectiveBuffer >= 5) return 0.90;
    if (effectiveBuffer >= 3) return 0.70;
    if (effectiveBuffer >= 1) return 0.40;
    if (effectiveBuffer >= 0) return 0.20;
    return 0.05;
  }

  /**
   * 取得轉乘所需時間 (分鐘)
   */
  private getTransferTime(stationId: string, fromLine: string, toLine: string): number {
    // TODO: 從資料庫查詢實際轉乘時間
    // 預設值：同站轉乘 5 分鐘
    return 5;
  }

  /**
   * 計算連鎖延誤風險
   */
  public calculate(legs: JourneyLeg[]): CDRResult {
    if (legs.length === 0) {
      return {
        overallSuccessRate: 1.0,
        riskLevel: 'low',
        bottleneckLegIndex: -1,
        legSuccessRates: [],
        recommendation: '無轉乘風險'
      };
    }

    let cumulativeDelay = 0;
    let overallSuccessRate = 1.0;
    let bottleneckLegIndex = -1;
    let minSuccessRate = 1.0;
    const legSuccessRates: number[] = [];

    for (let i = 0; i < legs.length - 1; i++) {
      const currentLeg = legs[i];
      const nextLeg = legs[i + 1];

      cumulativeDelay += currentLeg.currentDelayMinutes;

      const transferWindow: TransferWindow = {
        scheduledArrival: currentLeg.scheduledArrival,
        nextDeparture: nextLeg.scheduledDeparture,
        transferTimeRequired: this.getTransferTime(
          currentLeg.toStation,
          currentLeg.line,
          nextLeg.line
        ),
        delayMinutes: cumulativeDelay
      };

      const tsr = this.calcTransferSuccessRate(transferWindow);
      legSuccessRates.push(tsr);
      overallSuccessRate *= tsr;

      if (tsr < minSuccessRate) {
        minSuccessRate = tsr;
        bottleneckLegIndex = i;
      }
    }

    const riskLevel = this.getRiskLevel(overallSuccessRate);
    const bottleneckReason = bottleneckLegIndex >= 0
      ? `第 ${bottleneckLegIndex + 1} 段轉乘風險最高 (${legs[bottleneckLegIndex].lineName})`
      : undefined;

    return {
      overallSuccessRate: Math.round(overallSuccessRate * 100) / 100,
      riskLevel,
      bottleneckLegIndex,
      bottleneckReason,
      legSuccessRates,
      recommendation: this.getRecommendation(riskLevel, bottleneckLegIndex, legs)
    };
  }

  private getRiskLevel(successRate: number): RiskLevel {
    if (successRate >= 0.8) return 'low';
    if (successRate >= 0.5) return 'medium';
    if (successRate >= 0.2) return 'high';
    return 'critical';
  }

  private getRecommendation(
    riskLevel: RiskLevel,
    bottleneckIndex: number,
    legs: JourneyLeg[]
  ): string {
    const recommendations: Record<RiskLevel, string> = {
      low: '轉乘風險低，可按原計劃行動',
      medium: '有一定風險，建議提前出發或準備備用路線',
      high: '風險較高，強烈建議改走替代路線',
      critical: '風險極高，建議立即改變計劃或搭乘計程車'
    };

    let message = recommendations[riskLevel];

    if (bottleneckIndex >= 0 && riskLevel !== 'low') {
      const leg = legs[bottleneckIndex];
      message += `。瓶頸在 ${leg.toStation} 站的轉乘`;
    }

    return message;
  }

  /**
   * 計算末班車風險
   */
  public calcLastTrainRisk(
    journey: JourneyLeg[],
    currentTime: Date,
    lastTrainTimes: Map<string, Date>
  ): LastTrainRisk {
    const missedLines: LastTrainRisk['missedLines'] = [];
    let earliestDeadline: Date | null = null;

    for (const leg of journey) {
      const lastTrain = lastTrainTimes.get(leg.line);
      if (!lastTrain) continue;

      const requiredArrival = new Date(lastTrain.getTime() - 10 * 60000);

      if (leg.scheduledArrival > requiredArrival) {
        missedLines.push({
          line: leg.line,
          lineName: leg.lineName,
          lastTrainTime: lastTrain,
          reason: `末班車 ${lastTrain.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`
        });
      }

      const legDuration = leg.scheduledArrival.getTime() - leg.scheduledDeparture.getTime();
      const deadline = new Date(requiredArrival.getTime() - legDuration);

      if (!earliestDeadline || deadline < earliestDeadline) {
        earliestDeadline = deadline;
      }
    }

    return {
      hasRisk: missedLines.length > 0,
      missedLines,
      safeDepartureDeadline: earliestDeadline,
      alternativeOptions: missedLines.length > 0
        ? ['計程車 (GO/JapanTaxi)', '網咖休息', '膠囊旅館', '24小時餐廳']
        : []
    };
  }
}

export const cdrCalculator = new CascadeDelayRiskCalculator();
```

#### 任務 1.1.3: 整合至 HybridEngine

**修改檔案**: `src/lib/l4/HybridEngine.ts`

```typescript
// 在 HybridEngine 中新增方法

import { tpiCalculator } from './reasoning/TransferPainIndex';
import { cdrCalculator } from './reasoning/CascadeDelayRisk';
import { calcWaitValue } from './reasoning/WaitValueCoefficient';

// 新增路線評分方法
private async scoreRoutes(
  routes: any[],
  context?: RequestContext,
  userPreferences?: UserPreferences
): Promise<ScoredRoute[]> {
  const scoredRoutes = await Promise.all(
    routes.map(async (route) => {
      // 計算 TPI (如果有轉乘)
      let totalTpi = 0;
      if (route.transfers?.length > 0) {
        for (const transfer of route.transfers) {
          const tpiInput = this.buildTPIInput(transfer, userPreferences);
          const tpiResult = tpiCalculator.calculate(tpiInput);
          totalTpi += tpiResult.score;
        }
        totalTpi = totalTpi / route.transfers.length;
      }

      // 計算 CDR
      const cdrResult = cdrCalculator.calculate(route.legs || []);

      // 計算時間效率
      const timeEfficiency = this.calcTimeEfficiency(route);

      // 綜合評分
      const compositeScore = (100 - totalTpi) * cdrResult.overallSuccessRate * timeEfficiency;

      return {
        route,
        tpiScore: totalTpi,
        cdrResult,
        timeEfficiency,
        compositeScore,
        isRecommended: false,
        reasoning: ''
      };
    })
  );

  // 標記最佳路線
  scoredRoutes.sort((a, b) => b.compositeScore - a.compositeScore);
  if (scoredRoutes.length > 0) {
    scoredRoutes[0].isRecommended = true;
    scoredRoutes[0].reasoning = this.generateRouteReasoning(scoredRoutes[0]);
  }

  return scoredRoutes;
}
```

---

### 1.2 TOP 10 大站轉乘數據填充

**目標**: 建立核心車站的轉乘資訊數據

**檔案**:
- `scripts/seed_station_transfers.ts` (新建)
- `supabase/migrations/xxx_station_transfers_data.sql` (新建)

#### 任務 1.2.1: 建立種子數據腳本

```typescript
// scripts/seed_station_transfers.ts

import { createClient } from '@supabase/supabase-js';

const STATION_TRANSFERS_DATA = [
  // 東京站
  {
    from_station_id: 'odpt.Station:JR-East.ChuoRapid.Tokyo',
    from_line_id: 'odpt.Railway:JR-East.ChuoRapid',
    to_station_id: 'odpt.Station:JR-East.Keiyo.Tokyo',
    to_line_id: 'odpt.Railway:JR-East.Keiyo',
    walking_distance_meters: 500,
    floor_difference: -4,
    vertical_method: 'mixed',
    turn_count: 8,
    signage_clarity: 2,
    base_tpi: 85,
    peak_hour_multiplier: 1.3,
    expert_notes: {
      traps: ['地下通道很長，容易迷路', '人潮多時需排隊等電扶梯'],
      hacks: ['跟著「京葉線」指示走', '建議使用八重洲南口轉乘']
    }
  },
  {
    from_station_id: 'odpt.Station:JR-East.Yamanote.Tokyo',
    from_line_id: 'odpt.Railway:JR-East.Yamanote',
    to_station_id: 'odpt.Station:TokyoMetro.Marunouchi.Tokyo',
    to_line_id: 'odpt.Railway:TokyoMetro.Marunouchi',
    walking_distance_meters: 150,
    floor_difference: -1,
    vertical_method: 'escalator',
    turn_count: 2,
    signage_clarity: 3,
    base_tpi: 20,
    peak_hour_multiplier: 1.1,
    expert_notes: {
      traps: [],
      hacks: ['丸之內地下出口直結，非常方便']
    }
  },
  // 新宿站
  {
    from_station_id: 'odpt.Station:JR-East.ChuoRapid.Shinjuku',
    from_line_id: 'odpt.Railway:JR-East.ChuoRapid',
    to_station_id: 'odpt.Station:Toei.Oedo.ShinjukuNishiguchi',
    to_line_id: 'odpt.Railway:Toei.Oedo',
    walking_distance_meters: 400,
    floor_difference: -6,
    vertical_method: 'mixed',
    turn_count: 5,
    signage_clarity: 2,
    base_tpi: 70,
    peak_hour_multiplier: 1.4,
    expert_notes: {
      traps: ['大江戶線月台很深', '出口超過200個容易迷路'],
      hacks: ['建議從西口出站', '跟著「都營大江戶線」指示']
    }
  },
  {
    from_station_id: 'odpt.Station:JR-East.Yamanote.Shinjuku',
    from_line_id: 'odpt.Railway:JR-East.Yamanote',
    to_station_id: 'odpt.Station:TokyoMetro.Marunouchi.Shinjuku',
    to_line_id: 'odpt.Railway:TokyoMetro.Marunouchi',
    walking_distance_meters: 200,
    floor_difference: -2,
    vertical_method: 'escalator',
    turn_count: 3,
    signage_clarity: 2,
    base_tpi: 45,
    peak_hour_multiplier: 1.3,
    expert_notes: {
      traps: ['人潮擁擠時需排隊'],
      hacks: ['從東口方向轉乘較快']
    }
  },
  // 澀谷站
  {
    from_station_id: 'odpt.Station:JR-East.Yamanote.Shibuya',
    from_line_id: 'odpt.Railway:JR-East.Yamanote',
    to_station_id: 'odpt.Station:TokyoMetro.Fukutoshin.Shibuya',
    to_line_id: 'odpt.Railway:TokyoMetro.Fukutoshin',
    walking_distance_meters: 350,
    floor_difference: -5,
    vertical_method: 'mixed',
    turn_count: 4,
    signage_clarity: 2,
    base_tpi: 65,
    peak_hour_multiplier: 1.4,
    expert_notes: {
      traps: ['站體施工中，動線經常變更', '指標可能與實際不符'],
      hacks: ['副都心線在地下5樓', '建議使用新南口']
    }
  },
  {
    from_station_id: 'odpt.Station:JR-East.Yamanote.Shibuya',
    from_line_id: 'odpt.Railway:JR-East.Yamanote',
    to_station_id: 'odpt.Station:TokyoMetro.Ginza.Shibuya',
    to_line_id: 'odpt.Railway:TokyoMetro.Ginza',
    walking_distance_meters: 250,
    floor_difference: -2,
    vertical_method: 'escalator',
    turn_count: 3,
    signage_clarity: 2,
    base_tpi: 50,
    peak_hour_multiplier: 1.3,
    expert_notes: {
      traps: ['施工影響動線'],
      hacks: ['銀座線月台在3樓（地上）']
    }
  },
  // 池袋站
  {
    from_station_id: 'odpt.Station:JR-East.Yamanote.Ikebukuro',
    from_line_id: 'odpt.Railway:JR-East.Yamanote',
    to_station_id: 'odpt.Station:TokyoMetro.Yurakucho.Ikebukuro',
    to_line_id: 'odpt.Railway:TokyoMetro.Yurakucho',
    walking_distance_meters: 300,
    floor_difference: -2,
    vertical_method: 'escalator',
    turn_count: 4,
    signage_clarity: 2,
    base_tpi: 50,
    peak_hour_multiplier: 1.2,
    expert_notes: {
      traps: ['東西出口容易搞混'],
      hacks: ['有樂町線在西口方向']
    }
  },
  // 上野站
  {
    from_station_id: 'odpt.Station:JR-East.Yamanote.Ueno',
    from_line_id: 'odpt.Railway:JR-East.Yamanote',
    to_station_id: 'odpt.Station:TokyoMetro.Ginza.Ueno',
    to_line_id: 'odpt.Railway:TokyoMetro.Ginza',
    walking_distance_meters: 200,
    floor_difference: -1,
    vertical_method: 'escalator',
    turn_count: 2,
    signage_clarity: 3,
    base_tpi: 30,
    peak_hour_multiplier: 1.1,
    expert_notes: {
      traps: [],
      hacks: ['動線清晰，跟著指示即可']
    }
  },
  // 秋葉原站
  {
    from_station_id: 'odpt.Station:JR-East.Yamanote.Akihabara',
    from_line_id: 'odpt.Railway:JR-East.Yamanote',
    to_station_id: 'odpt.Station:TokyoMetro.Hibiya.Akihabara',
    to_line_id: 'odpt.Railway:TokyoMetro.Hibiya',
    walking_distance_meters: 150,
    floor_difference: -1,
    vertical_method: 'escalator',
    turn_count: 2,
    signage_clarity: 3,
    base_tpi: 25,
    peak_hour_multiplier: 1.1,
    expert_notes: {
      traps: [],
      hacks: ['電氣街口出站後即可看到日比谷線入口']
    }
  },
  // 品川站
  {
    from_station_id: 'odpt.Station:JR-East.Yamanote.Shinagawa',
    from_line_id: 'odpt.Railway:JR-East.Yamanote',
    to_station_id: 'odpt.Station:Keikyu.Main.Shinagawa',
    to_line_id: 'odpt.Railway:Keikyu.Main',
    walking_distance_meters: 200,
    floor_difference: 0,
    vertical_method: 'escalator',
    turn_count: 2,
    signage_clarity: 3,
    base_tpi: 25,
    peak_hour_multiplier: 1.2,
    expert_notes: {
      traps: ['前往羽田機場時要注意列車種別'],
      hacks: ['京急線在JR改札外，需要先出站']
    }
  }
];

async function seedStationTransfers() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  console.log('開始填充車站轉乘數據...');

  for (const transfer of STATION_TRANSFERS_DATA) {
    const { error } = await supabase
      .from('station_transfers')
      .upsert(transfer, {
        onConflict: 'from_station_id,from_line_id,to_station_id,to_line_id'
      });

    if (error) {
      console.error(`填充失敗: ${transfer.from_station_id} → ${transfer.to_station_id}`, error);
    } else {
      console.log(`✓ ${transfer.from_station_id} → ${transfer.to_station_id}`);
    }
  }

  console.log('車站轉乘數據填充完成！');
}

seedStationTransfers().catch(console.error);
```

---

### 1.3 基礎單元測試

**目標**: 建立 TPI/CDR/WVC 的單元測試

**檔案**:
- `src/lib/l4/reasoning/__tests__/TransferPainIndex.test.ts`
- `src/lib/l4/reasoning/__tests__/CascadeDelayRisk.test.ts`
- `src/lib/l4/reasoning/__tests__/WaitValueCoefficient.test.ts`

#### 任務 1.3.1: TPI 單元測試

```typescript
// src/lib/l4/reasoning/__tests__/TransferPainIndex.test.ts

import { tpiCalculator } from '../TransferPainIndex';
import { TPIInput } from '../types';

describe('TransferPainIndexCalculator', () => {
  const baseInput: TPIInput = {
    transfer: {
      fromStationId: 'test-from',
      fromLineId: 'test-line-a',
      toStationId: 'test-to',
      toLineId: 'test-line-b',
      walkingDistanceMeters: 200,
      floorDifference: 1,
      verticalMethod: 'escalator',
      complexity: {
        turnCount: 2,
        signageClarity: 3,
        exitCount: 4,
        underConstruction: false
      },
      baseTpi: 30,
      peakHourMultiplier: 1.0
    },
    crowdLevel: 'normal',
    userHasLuggage: false,
    userAccessibilityNeeds: {
      wheelchair: false,
      stroller: false,
      elderly: false,
      visualImpairment: false
    }
  };

  test('基本轉乘應返回 easy 等級', () => {
    const result = tpiCalculator.calculate(baseInput);
    expect(result.level).toBe('easy');
    expect(result.score).toBeLessThanOrEqual(20);
  });

  test('東京站京葉線轉乘應返回 extreme 等級', () => {
    const tokyoKeiyoInput: TPIInput = {
      ...baseInput,
      transfer: {
        ...baseInput.transfer,
        walkingDistanceMeters: 500,
        floorDifference: 4,
        verticalMethod: 'mixed',
        complexity: {
          turnCount: 8,
          signageClarity: 2,
          exitCount: 20,
          underConstruction: false
        }
      },
      crowdLevel: 'busy'
    };

    const result = tpiCalculator.calculate(tokyoKeiyoInput);
    expect(result.level).toBe('extreme');
    expect(result.score).toBeGreaterThan(80);
  });

  test('輪椅用戶應大幅增加 TPI', () => {
    const wheelchairInput: TPIInput = {
      ...baseInput,
      userAccessibilityNeeds: {
        ...baseInput.userAccessibilityNeeds,
        wheelchair: true
      }
    };

    const normalResult = tpiCalculator.calculate(baseInput);
    const wheelchairResult = tpiCalculator.calculate(wheelchairInput);

    expect(wheelchairResult.score).toBeGreaterThan(normalResult.score);
    expect(wheelchairResult.breakdown.userModifier).toBe(40);
  });

  test('行李應增加垂直移動和人潮分數', () => {
    const luggageInput: TPIInput = {
      ...baseInput,
      userHasLuggage: true
    };

    const normalResult = tpiCalculator.calculate(baseInput);
    const luggageResult = tpiCalculator.calculate(luggageInput);

    expect(luggageResult.breakdown.vertical).toBeGreaterThan(normalResult.breakdown.vertical);
  });

  test('施工中應增加複雜度分數', () => {
    const constructionInput: TPIInput = {
      ...baseInput,
      transfer: {
        ...baseInput.transfer,
        complexity: {
          ...baseInput.transfer.complexity,
          underConstruction: true
        }
      }
    };

    const normalResult = tpiCalculator.calculate(baseInput);
    const constructionResult = tpiCalculator.calculate(constructionInput);

    expect(constructionResult.breakdown.complexity).toBeGreaterThan(normalResult.breakdown.complexity);
  });
});
```

---

## 🔧 Phase 2: 系統強化與擴展 (中期 - 10個工作天)

### 2.1 錯誤監控與告警系統

**目標**: 建立完整的錯誤追蹤和告警機制

**檔案**:
- `src/lib/monitoring/ErrorTracker.ts` (新建)
- `src/lib/monitoring/AlertService.ts` (新建)

#### 任務 2.1.1: 錯誤追蹤器

```typescript
// src/lib/monitoring/ErrorTracker.ts

export interface ErrorContext {
  component: string;
  operation: string;
  userId?: string;
  query?: string;
  metadata?: Record<string, unknown>;
}

export interface TrackedError {
  id: string;
  timestamp: Date;
  error: Error;
  context: ErrorContext;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
}

export class ErrorTracker {
  private errors: TrackedError[] = [];
  private errorCounts: Map<string, number> = new Map();
  private readonly MAX_ERRORS = 1000;
  private readonly ALERT_THRESHOLD = 10; // 10 次相同錯誤觸發告警

  public track(error: Error, context: ErrorContext): string {
    const errorKey = `${context.component}:${context.operation}:${error.message}`;
    const count = (this.errorCounts.get(errorKey) || 0) + 1;
    this.errorCounts.set(errorKey, count);

    const severity = this.determineSeverity(error, context, count);
    const id = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const trackedError: TrackedError = {
      id,
      timestamp: new Date(),
      error,
      context,
      severity,
      resolved: false
    };

    this.errors.push(trackedError);

    // 保持錯誤列表在限制內
    if (this.errors.length > this.MAX_ERRORS) {
      this.errors = this.errors.slice(-this.MAX_ERRORS);
    }

    // 記錄到控制台
    this.logError(trackedError);

    // 檢查是否需要告警
    if (count >= this.ALERT_THRESHOLD || severity === 'critical') {
      this.triggerAlert(trackedError, count);
    }

    return id;
  }

  private determineSeverity(
    error: Error,
    context: ErrorContext,
    count: number
  ): TrackedError['severity'] {
    // API 錯誤
    if (context.component === 'odpt' || context.component === 'weather') {
      if (count >= 5) return 'high';
      return 'medium';
    }

    // 資料庫錯誤
    if (context.component === 'supabase') {
      return 'high';
    }

    // LLM 錯誤
    if (context.component === 'llm') {
      if (count >= 10) return 'high';
      return 'medium';
    }

    // 一般錯誤
    if (count >= 20) return 'high';
    if (count >= 10) return 'medium';
    return 'low';
  }

  private logError(trackedError: TrackedError): void {
    const { error, context, severity } = trackedError;
    const logPrefix = `[${severity.toUpperCase()}][${context.component}]`;

    console.error(
      `${logPrefix} ${context.operation} failed:`,
      error.message,
      context.metadata ? JSON.stringify(context.metadata) : ''
    );
  }

  private triggerAlert(trackedError: TrackedError, count: number): void {
    // TODO: 整合實際告警服務 (Slack, PagerDuty, etc.)
    console.warn(
      `🚨 ALERT: ${trackedError.context.component}.${trackedError.context.operation}`,
      `發生 ${count} 次`,
      `嚴重程度: ${trackedError.severity}`
    );
  }

  public getRecentErrors(limit: number = 100): TrackedError[] {
    return this.errors.slice(-limit);
  }

  public getErrorStats(): Record<string, number> {
    return Object.fromEntries(this.errorCounts);
  }

  public clearResolved(): void {
    this.errors = this.errors.filter(e => !e.resolved);
  }
}

export const errorTracker = new ErrorTracker();
```

---

### 2.2 Nearby Amenities 數據擴展

**目標**: 擴展車站周邊設施數據，支援 WVC 計算

#### 任務 2.2.1: OSM 數據整合腳本

```typescript
// scripts/import_osm_amenities.ts

import { createClient } from '@supabase/supabase-js';

interface OSMAmenity {
  osm_id: string;
  name: string;
  name_en?: string;
  amenity_type: string;
  lat: number;
  lng: number;
  tags: Record<string, string>;
}

const AMENITY_MAPPING: Record<string, string> = {
  cafe: 'cafe',
  restaurant: 'restaurant',
  fast_food: 'restaurant',
  convenience: 'convenience_store',
  internet_cafe: 'internet_cafe',
  waiting_room: 'rest_area'
};

async function importOSMAmenities(stationId: string, lat: number, lng: number, radiusMeters: number = 500) {
  // Overpass API 查詢
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"~"cafe|restaurant|fast_food"](around:${radiusMeters},${lat},${lng});
      node["shop"="convenience"](around:${radiusMeters},${lat},${lng});
    );
    out body;
  `;

  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: query
  });

  const data = await response.json();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  for (const element of data.elements) {
    const amenityType = AMENITY_MAPPING[element.tags.amenity] ||
                        AMENITY_MAPPING[element.tags.shop] ||
                        'other';

    if (amenityType === 'other') continue;

    // 計算步行時間 (假設步行速度 80m/min)
    const distance = calculateDistance(lat, lng, element.lat, element.lon);
    const walkMinutes = Math.ceil(distance / 80);

    const amenity = {
      station_id: stationId,
      amenity_type: amenityType,
      name: element.tags.name || element.tags['name:ja'] || '不明',
      name_en: element.tags['name:en'] || null,
      walk_minutes: walkMinutes,
      lat: element.lat,
      lng: element.lon,
      has_seating: amenityType === 'cafe' || amenityType === 'restaurant',
      has_wifi: element.tags.internet_access === 'wlan' || element.tags.wifi === 'yes',
      has_power_outlet: element.tags.power_outlet === 'yes',
      vibe_tags: extractVibeTags(element.tags),
      osm_id: element.id.toString()
    };

    await supabase
      .from('station_nearby_amenities')
      .upsert(amenity, { onConflict: 'station_id,osm_id' });
  }
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // 地球半徑 (公尺)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function extractVibeTags(tags: Record<string, string>): string[] {
  const vibeTags: string[] = [];

  if (tags.cuisine) {
    vibeTags.push(`CUISINE_${tags.cuisine.toUpperCase()}`);
  }
  if (tags.outdoor_seating === 'yes') {
    vibeTags.push('OUTDOOR_SEATING');
  }
  if (tags['diet:vegan'] === 'yes' || tags['diet:vegetarian'] === 'yes') {
    vibeTags.push('HEALTHY');
  }
  if (tags.smoking === 'no') {
    vibeTags.push('NON_SMOKING');
  }

  return vibeTags;
}
```

---

### 2.3 Deep Link 整合

**目標**: 整合計程車和餐廳預訂的 Deep Link

```typescript
// src/lib/services/DeepLinkService.ts

export interface DeepLinkOptions {
  destination?: { lat: number; lng: number; name?: string };
  origin?: { lat: number; lng: number };
  restaurantId?: string;
  locale?: string;
}

export class DeepLinkService {
  /**
   * 生成計程車 App Deep Link
   */
  public static getTaxiDeepLink(
    provider: 'go' | 'japantaxi' | 'uber' | 's_ride',
    options: DeepLinkOptions
  ): string {
    const { destination, origin } = options;

    switch (provider) {
      case 'go':
        // GO タクシー
        if (destination) {
          return `gojp://ride?dest_lat=${destination.lat}&dest_lng=${destination.lng}&dest_name=${encodeURIComponent(destination.name || '')}`;
        }
        return 'https://go.mo-t.com/';

      case 'japantaxi':
        // JapanTaxi
        if (destination) {
          return `japantaxi://ride?to_lat=${destination.lat}&to_lon=${destination.lng}`;
        }
        return 'https://japantaxi.jp/';

      case 'uber':
        // Uber
        if (destination && origin) {
          return `uber://?action=setPickup&pickup[latitude]=${origin.lat}&pickup[longitude]=${origin.lng}&dropoff[latitude]=${destination.lat}&dropoff[longitude]=${destination.lng}`;
        }
        return 'https://m.uber.com/';

      case 's_ride':
        // S.RIDE
        return 'https://www.sride.jp/';

      default:
        return 'https://go.mo-t.com/';
    }
  }

  /**
   * 生成餐廳預訂 Deep Link
   */
  public static getRestaurantDeepLink(
    provider: 'tabelog' | 'hotpepper' | 'gurunavi',
    options: DeepLinkOptions
  ): string {
    const { restaurantId, locale } = options;

    switch (provider) {
      case 'tabelog':
        if (restaurantId) {
          const lang = locale?.startsWith('en') ? 'en' : locale?.startsWith('zh') ? 'cn' : '';
          return `https://tabelog.com/${lang ? lang + '/' : ''}${restaurantId}/`;
        }
        return 'https://tabelog.com/';

      case 'hotpepper':
        if (restaurantId) {
          return `https://www.hotpepper.jp/str${restaurantId}/`;
        }
        return 'https://www.hotpepper.jp/';

      case 'gurunavi':
        if (restaurantId) {
          const lang = locale?.startsWith('en') ? 'en' : locale?.startsWith('zh') ? 'cn' : 'jp';
          return `https://gurunavi.com/${lang}/r${restaurantId}/`;
        }
        return 'https://gurunavi.com/';

      default:
        return 'https://tabelog.com/';
    }
  }

  /**
   * 根據用戶平台選擇最佳計程車服務
   */
  public static getBestTaxiApp(userLocation: { lat: number; lng: number }): {
    provider: 'go' | 'japantaxi' | 'uber' | 's_ride';
    reason: string;
  } {
    // 東京 23 區主要使用 GO
    // 其他地區優先 JapanTaxi
    const isTokyoCore =
      userLocation.lat >= 35.6 && userLocation.lat <= 35.8 &&
      userLocation.lng >= 139.6 && userLocation.lng <= 139.9;

    if (isTokyoCore) {
      return { provider: 'go', reason: '東京市區 GO 車輛最多' };
    }
    return { provider: 'japantaxi', reason: '全國範圍 JapanTaxi 覆蓋較廣' };
  }
}
```

---

### 2.4 完整測試套件

**目標**: 建立整合測試和端對端測試

```typescript
// src/lib/l4/__tests__/HybridEngine.integration.test.ts

import { hybridEngine } from '../HybridEngine';

describe('HybridEngine Integration Tests', () => {
  describe('路線查詢', () => {
    test('應該返回帶有 TPI 評分的路線', async () => {
      const response = await hybridEngine.processRequest({
        text: '從東京站到新宿怎麼走？',
        locale: 'zh-TW',
        context: {}
      });

      expect(response).not.toBeNull();
      expect(response?.source).toBe('algorithm');
      expect(response?.type).toBe('route');
      expect(response?.data?.routes).toBeDefined();

      // 驗證路線有 TPI 評分
      if (response?.data?.routes?.length > 0) {
        expect(response.data.routes[0].tpiScore).toBeDefined();
      }
    });

    test('延誤情況下應該考慮 CDR', async () => {
      // 模擬中央線延誤
      const response = await hybridEngine.processRequest({
        text: '東京站到新宿，中央線好像延誤了',
        locale: 'zh-TW',
        context: {}
      });

      expect(response).not.toBeNull();
      // 應該建議替代路線或警告風險
    });
  });

  describe('天氣警報', () => {
    test('應該過濾非目標區域的警報', async () => {
      // 測試伊豆諸島警報不應觸發
      // ...
    });
  });

  describe('WVC 建議', () => {
    test('長時間等待應建議附近休息', async () => {
      // ...
    });
  });
});
```

---

## 📈 Phase 3: 持續優化 (長期)

### 3.1 用戶反饋學習系統

```typescript
// src/lib/learning/FeedbackLearner.ts

export interface UserFeedback {
  sessionId: string;
  queryId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  feedbackType: 'route_quality' | 'timing_accuracy' | 'recommendation_relevance';
  comment?: string;
  context: {
    query: string;
    response: any;
    actualOutcome?: string;
  };
}

export class FeedbackLearner {
  /**
   * 收集用戶反饋
   */
  public async collectFeedback(feedback: UserFeedback): Promise<void> {
    // 儲存到資料庫
    // 分析模式
    // 調整權重
  }

  /**
   * 根據反饋調整 TPI 權重
   */
  public async adjustTPIWeights(): Promise<void> {
    // 分析用戶對轉乘建議的滿意度
    // 如果用戶經常抱怨「比預期辛苦」，提高相關權重
  }

  /**
   * 根據反饋調整 WVC 閾值
   */
  public async adjustWVCThresholds(): Promise<void> {
    // 分析用戶對「等待/放棄」建議的反饋
  }
}
```

### 3.2 A/B 測試框架

```typescript
// src/lib/experiments/ABTestFramework.ts

export interface Experiment {
  id: string;
  name: string;
  description: string;
  variants: {
    id: string;
    name: string;
    weight: number; // 0-100
    config: Record<string, unknown>;
  }[];
  startDate: Date;
  endDate?: Date;
  targetAudience?: {
    locale?: string[];
    userType?: string[];
  };
}

export class ABTestFramework {
  private experiments: Map<string, Experiment> = new Map();

  /**
   * 分配用戶到實驗組
   */
  public assignVariant(experimentId: string, userId: string): string {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return 'control';

    // 使用用戶 ID 的 hash 確保一致性
    const hash = this.hashUserId(userId);
    let cumulative = 0;

    for (const variant of experiment.variants) {
      cumulative += variant.weight;
      if (hash < cumulative) {
        return variant.id;
      }
    }

    return experiment.variants[0].id;
  }

  /**
   * 記錄實驗結果
   */
  public async recordMetric(
    experimentId: string,
    variantId: string,
    metricName: string,
    value: number
  ): Promise<void> {
    // 儲存到分析資料庫
  }

  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash) + userId.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) % 100;
  }
}
```

---

## 📅 工作時程總覽

```
Week 1 (Phase 1)
├── Day 1-2: TPI 計算器實現 + 單元測試
├── Day 3: CDR 計算器實現 + 單元測試
├── Day 4: HybridEngine 整合
└── Day 5: TOP 10 站點數據填充 + 測試

Week 2-3 (Phase 2)
├── Day 1-2: 錯誤監控系統
├── Day 3-4: OSM Amenities 數據整合
├── Day 5-6: Deep Link 服務整合
├── Day 7-8: 完整測試套件
└── Day 9-10: 效能優化 + 文檔更新

Week 4+ (Phase 3)
├── 用戶反饋收集系統
├── A/B 測試框架
├── 權重自動調優
└── 持續監控與迭代
```

---

## ✅ 完成標準 (Definition of Done)

### Phase 1
- [ ] TPI 計算器通過所有單元測試
- [ ] CDR 計算器通過所有單元測試
- [ ] HybridEngine 路線推薦包含 TPI/CDR 評分
- [ ] TOP 10 站點轉乘數據已填充
- [ ] 文檔已更新

### Phase 2
- [ ] 錯誤監控系統上線
- [ ] Amenities 數據覆蓋 50+ 站點
- [ ] Deep Link 整合 GO/JapanTaxi
- [ ] 整合測試覆蓋率 > 80%
- [ ] 效能基準測試通過

### Phase 3
- [ ] 反饋收集系統上線
- [ ] A/B 測試框架可用
- [ ] 第一輪權重優化完成

---

## 🔗 相關文檔

- [Agent Reasoning Chain 設計文檔](./AGENT_REASONING_CHAIN_DESIGN.md)
- [ODPT Challenge 2025 提交文檔](./ODPT_CHALLENGE_2025_SUBMISSION.md)
- [Agent Framework 評估報告](./AGENT_FRAMEWORK_EVALUATION.md)

---

*文檔版本: 1.0*
*最後更新: 2025-01-09*
