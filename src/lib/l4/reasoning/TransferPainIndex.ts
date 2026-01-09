/**
 * Transfer Pain Index (TPI) Calculator
 *
 * 轉乘辛苦指標計算器
 * TPI = W_distance × D + W_vertical × V + W_complexity × C + W_crowd × R + W_user × U
 */

import {
  TPIInput,
  TPIResult,
  TPIWeights,
  VerticalMethod,
  CrowdLevel,
  StationComplexity,
  DEFAULT_REASONING_CONFIG
} from './types';

// ============================================================
// Distance Score (D)
// ============================================================

function calcDistanceScore(meters: number): number {
  if (meters <= 100) return 0;
  if (meters <= 200) return 20;
  if (meters <= 300) return 40;
  if (meters <= 500) return 60;
  if (meters <= 800) return 80;
  return 100; // > 800m (如東京站京葉線)
}

// ============================================================
// Vertical Score (V)
// ============================================================

const VERTICAL_METHOD_MULTIPLIERS: Record<VerticalMethod, number> = {
  elevator: 0.3,      // 電梯最輕鬆，但要等
  escalator: 0.6,     // 電扶梯中等
  stairs: 1.0,        // 樓梯最累
  mixed: 0.7          // 混合
};

function calcVerticalScore(
  floors: number,
  method: VerticalMethod,
  hasLuggage: boolean
): number {
  const baseScore = Math.abs(floors) * 10;
  const methodMultiplier = VERTICAL_METHOD_MULTIPLIERS[method];
  const luggageMultiplier = hasLuggage ? 1.5 : 1.0;

  return Math.min(100, baseScore * methodMultiplier * luggageMultiplier);
}

// ============================================================
// Complexity Score (C)
// ============================================================

function calcComplexityScore(complexity: StationComplexity): number {
  let score = 0;

  // 轉彎次數：每次 +5
  score += complexity.turnCount * 5;

  // 指標清晰度：差=+45, 中=+30, 好=+15
  score += (4 - complexity.signageClarity) * 15;

  // 出口數量：越多越容易迷路，最多 +20
  score += Math.min(complexity.exitCount / 2, 20);

  // 施工中：+25
  if (complexity.underConstruction) {
    score += 25;
  }

  return Math.min(100, score);
}

// ============================================================
// Crowd Score (R)
// ============================================================

const CROWD_BASE_SCORES: Record<CrowdLevel, number> = {
  empty: 0,
  normal: 10,
  busy: 30,
  packed: 60,
  crush: 100
};

function calcCrowdScore(level: CrowdLevel, hasLuggage: boolean): number {
  const baseScore = CROWD_BASE_SCORES[level];
  const luggageMultiplier = hasLuggage ? 1.5 : 1.0;

  return Math.min(100, baseScore * luggageMultiplier);
}

// ============================================================
// User Modifier (U)
// ============================================================

function calcUserModifier(input: TPIInput): number {
  let modifier = 0;
  const { userAccessibilityNeeds, userHasLuggage } = input;

  if (userAccessibilityNeeds.wheelchair) modifier += 40;
  if (userAccessibilityNeeds.stroller) modifier += 30;
  if (userAccessibilityNeeds.elderly) modifier += 20;
  if (userAccessibilityNeeds.visualImpairment) modifier += 25;
  if (userHasLuggage) modifier += 25;

  return Math.min(100, Math.max(0, modifier));
}

// ============================================================
// TPI Level Mapping
// ============================================================

function getTpiLevel(score: number): TPIResult['level'] {
  if (score <= 20) return 'easy';
  if (score <= 40) return 'normal';
  if (score <= 60) return 'hard';
  if (score <= 80) return 'difficult';
  return 'extreme';
}

function getRecommendation(level: TPIResult['level'], locale: string = 'zh'): string {
  const recommendations: Record<TPIResult['level'], Record<string, string>> = {
    easy: {
      zh: '轉乘輕鬆，照常進行即可',
      ja: '乗り換えは楽です。予定通りどうぞ',
      en: 'Easy transfer, proceed as planned'
    },
    normal: {
      zh: '需步行一段距離，請預留時間',
      ja: '少し歩きます。時間に余裕を持ってください',
      en: 'Some walking required, allow extra time'
    },
    hard: {
      zh: '轉乘較辛苦，建議考慮替代路線',
      ja: '乗り換えは大変です。代替ルートを検討してください',
      en: 'Difficult transfer, consider alternatives'
    },
    difficult: {
      zh: '轉乘非常困難，強烈建議替代路線',
      ja: '乗り換えは非常に困難です。代替ルートを強くお勧めします',
      en: 'Very difficult transfer, alternative routes recommended'
    },
    extreme: {
      zh: '轉乘極度困難，請改搭計程車或變更計畫',
      ja: '乗り換えは極めて困難です。タクシーか計画変更をお勧めします',
      en: 'Extremely difficult, consider taxi or change plans'
    }
  };

  const lang = locale.startsWith('ja') ? 'ja' : locale.startsWith('en') ? 'en' : 'zh';
  return recommendations[level][lang];
}

// ============================================================
// Main Calculator
// ============================================================

export function calcTransferPainIndex(
  input: TPIInput,
  weights: TPIWeights = DEFAULT_REASONING_CONFIG.tpiWeights,
  locale: string = 'zh'
): TPIResult {
  const { transfer, crowdLevel, userHasLuggage } = input;

  // Calculate individual scores
  const distanceScore = calcDistanceScore(transfer.walkingDistanceMeters);
  const verticalScore = calcVerticalScore(
    transfer.floorDifference,
    transfer.verticalMethod,
    userHasLuggage
  );
  const complexityScore = calcComplexityScore(transfer.complexity);
  const crowdScore = calcCrowdScore(crowdLevel, userHasLuggage);
  const userModifier = calcUserModifier(input);

  // Weighted sum
  const totalScore = Math.round(
    weights.distance * distanceScore +
    weights.vertical * verticalScore +
    weights.complexity * complexityScore +
    weights.crowd * crowdScore +
    weights.userModifier * userModifier
  );

  const finalScore = Math.min(100, Math.max(0, totalScore));
  const level = getTpiLevel(finalScore);

  return {
    score: finalScore,
    level,
    breakdown: {
      distance: Math.round(distanceScore),
      vertical: Math.round(verticalScore),
      complexity: Math.round(complexityScore),
      crowd: Math.round(crowdScore),
      userModifier: Math.round(userModifier)
    },
    recommendation: getRecommendation(level, locale)
  };
}

// ============================================================
// Preset TPI Values for Major Stations
// ============================================================

export const PRESET_TPI: Record<string, Record<string, number>> = {
  // 東京站
  'odpt.Station:JR-East.Tokaido.Tokyo': {
    'odpt.Railway:JR-East.Keiyo': 85,        // JR→京葉線：500m地下通道
    'odpt.Railway:TokyoMetro.Marunouchi': 30, // JR→丸之內線
  },
  // 新宿站
  'odpt.Station:JR-East.Yamanote.Shinjuku': {
    'odpt.Railway:Toei.Oedo': 70,            // JR→大江戶線：深層
    'odpt.Railway:TokyoMetro.Marunouchi': 35, // JR→丸之內線
    'odpt.Railway:Odakyu.Odawara': 25,       // JR→小田急
  },
  // 澀谷站
  'odpt.Station:JR-East.Yamanote.Shibuya': {
    'odpt.Railway:TokyoMetro.Fukutoshin': 65, // JR→副都心線：施工中
    'odpt.Railway:TokyoMetro.Ginza': 40,     // JR→銀座線
    'odpt.Railway:Tokyu.Toyoko': 50,         // JR→東急東橫線
  },
  // 池袋站
  'odpt.Station:JR-East.Yamanote.Ikebukuro': {
    'odpt.Railway:TokyoMetro.Yurakucho': 50,  // JR→有樂町線
    'odpt.Railway:TokyoMetro.Marunouchi': 35, // JR→丸之內線
    'odpt.Railway:Seibu.Ikebukuro': 30,      // JR→西武池袋線
  },
  // 上野站
  'odpt.Station:JR-East.Yamanote.Ueno': {
    'odpt.Railway:TokyoMetro.Ginza': 40,     // JR→銀座線
    'odpt.Railway:TokyoMetro.Hibiya': 45,    // JR→日比谷線：長通道
  },
  // 秋葉原站
  'odpt.Station:JR-East.Yamanote.Akihabara': {
    'odpt.Railway:TokyoMetro.Hibiya': 25,    // JR→日比谷線：近
    'odpt.Railway:TX.TsukubaExpress': 35,    // JR→筑波快線：需出站
  },
};

/**
 * Get preset TPI or calculate dynamically
 */
export function getTransferTPI(
  fromStationId: string,
  toLineId: string,
  input?: Partial<TPIInput>
): number {
  // Check preset
  const stationPresets = PRESET_TPI[fromStationId];
  if (stationPresets && stationPresets[toLineId]) {
    let baseTpi = stationPresets[toLineId];

    // Apply user modifiers if provided
    if (input?.userHasLuggage) baseTpi += 15;
    if (input?.userAccessibilityNeeds?.wheelchair) baseTpi += 30;
    if (input?.userAccessibilityNeeds?.stroller) baseTpi += 20;
    if (input?.crowdLevel === 'packed' || input?.crowdLevel === 'crush') baseTpi += 20;

    return Math.min(100, baseTpi);
  }

  // Default for unknown transfers
  return 40;
}
