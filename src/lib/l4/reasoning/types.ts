/**
 * LUTAGU Agent Reasoning Chain - Type Definitions
 *
 * 核心概念：
 * - 「節點」提供用戶需求位址 (Node = Where)
 * - 「標籤」提供環境脈絡 (Tag = Context)
 */

// ============================================================
// 1. Transfer Pain Index (TPI) - 轉乘辛苦指標
// ============================================================

export type VerticalMethod = 'elevator' | 'escalator' | 'stairs' | 'mixed';
export type CrowdLevel = 'empty' | 'normal' | 'busy' | 'packed' | 'crush';

export interface StationComplexity {
  turnCount: number;           // 轉彎次數
  signageClarity: 1 | 2 | 3;   // 指標清晰度 (1=差, 3=好)
  exitCount: number;           // 出口數量
  underConstruction: boolean;  // 施工中
}

export interface TransferInfo {
  fromStationId: string;
  fromLineId: string;
  toStationId: string;
  toLineId: string;

  // TPI 因子
  walkingDistanceMeters: number;
  floorDifference: number;
  verticalMethod: VerticalMethod;
  complexity: StationComplexity;

  // 預計算
  baseTpi: number;
  peakHourMultiplier: number;

  // 專家知識
  expertNotes?: {
    traps: string[];
    hacks: string[];
  };
}

export interface TPIInput {
  transfer: TransferInfo;
  crowdLevel: CrowdLevel;
  userHasLuggage: boolean;
  userAccessibilityNeeds: {
    wheelchair: boolean;
    stroller: boolean;
    elderly: boolean;
    visualImpairment: boolean;
  };
}

export interface TPIResult {
  score: number;              // 0-100
  level: 'easy' | 'normal' | 'hard' | 'difficult' | 'extreme';
  breakdown: {
    distance: number;
    vertical: number;
    complexity: number;
    crowd: number;
    userModifier: number;
  };
  recommendation: string;
}

// ============================================================
// 2. Cascade Delay Risk (CDR) - 延誤連鎖風險
// ============================================================

export interface JourneyLeg {
  fromStation: string;
  toStation: string;
  line: string;
  lineName: string;
  scheduledDeparture: Date;
  scheduledArrival: Date;
  currentDelayMinutes: number;
}

export interface TransferWindow {
  scheduledArrival: Date;
  nextDeparture: Date;
  transferTimeRequired: number;  // 分鐘
  delayMinutes: number;
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface CDRResult {
  overallSuccessRate: number;    // 0-1
  riskLevel: RiskLevel;
  bottleneckLegIndex: number;    // -1 if none
  bottleneckReason?: string;
  legSuccessRates: number[];
  recommendation: string;
}

export interface LastTrainRisk {
  hasRisk: boolean;
  missedLines: Array<{
    line: string;
    lineName: string;
    lastTrainTime: Date;
    reason: string;
  }>;
  safeDepartureDeadline: Date | null;
  alternativeOptions: string[];
}

// ============================================================
// 3. Wait Value Coefficient (WVC) - 等待價值係數
// ============================================================

export type WaitEnvironment = 'outdoor' | 'indoor_standing' | 'indoor_seated' | 'cafe';
export type WeatherCondition = 'good' | 'hot' | 'cold' | 'rainy';
export type AmenityType = 'cafe' | 'restaurant' | 'convenience_store' | 'internet_cafe' | 'rest_area';

export interface NearbyAmenity {
  type: AmenityType;
  name: string;
  nameLocalized?: {
    ja?: string;
    en?: string;
    zh?: string;
  };
  walkMinutes: number;
  coordinates?: { lat: number; lng: number };

  // 設施屬性
  hasSeating: boolean;
  hasWifi: boolean;
  hasPowerOutlet: boolean;

  // L1 DNA 匹配
  vibeTags: string[];
  vibeMatchScore: number;   // 0-1
}

export interface WVCInput {
  // 目的地因素
  destinationUrgency: number;   // 0-1
  destinationOpenHours?: {
    opens: Date;
    closes: Date;
  };

  // 等待因素
  expectedWaitMinutes: number;
  waitEnvironment: WaitEnvironment;

  // 用戶因素
  userFatigue: number;          // 0-1
  hasLuggage: boolean;

  // 環境因素
  weather: WeatherCondition;
  currentTime: Date;

  // 附近設施
  nearbyAmenities: NearbyAmenity[];

  // L1 區域 DNA
  areaVibeTags: string[];
}

export type WVCRecommendation = 'wait' | 'divert' | 'rest_nearby';

export interface WVCResult {
  coefficient: number;          // 0-2: <1 建議放棄, >1 建議等待
  recommendation: WVCRecommendation;
  reasoning: string;
  reasoningLocalized?: {
    ja?: string;
    en?: string;
    zh?: string;
  };
  suggestedAction?: {
    type: AmenityType | 'taxi' | 'cancel';
    location?: string;
    duration?: number;
    deepLink?: string;
  };
  // 心理安撫訊息（來自 L1 DNA）
  comfortMessage?: string;
}

// ============================================================
// 4. Agent Reasoning Chain - 思考鏈
// ============================================================

export type ReasoningStepName =
  | 'intent_classification'
  | 'l2_live_scan'
  | 'route_generation'
  | 'tpi_calculation'
  | 'cdr_calculation'
  | 'wvc_evaluation'
  | 'l1_area_enrichment'
  | 'composite_scoring'
  | 'response_generation';

export interface ReasoningStep {
  name: ReasoningStepName;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  durationMs: number;
  confidence?: number;
}

export interface RouteCandidate {
  id: string;
  name: string;
  legs: JourneyLeg[];
  totalMinutes: number;
  transfers: number;
  fare?: number;
}

export interface ScoredRoute {
  route: RouteCandidate;
  tpiScore: number;
  cdrResult: CDRResult;
  timeEfficiency: number;
  compositeScore: number;
  isRecommended: boolean;
  reasoning: string;
}

export interface ReasoningChainResult {
  // 推理步驟（可用於 debug 和解釋）
  steps: ReasoningStep[];
  totalDurationMs: number;

  // 最終結果
  recommendedRoute: ScoredRoute;
  alternativeRoutes: ScoredRoute[];

  // 特殊風險
  lastTrainRisk?: LastTrainRisk;
  waitValueAssessment?: WVCResult;

  // 整體信心
  confidence: number;

  // 自然語言回應
  response: {
    summary: string;
    details: string[];
    warnings: string[];
    tips: string[];
  };
}

// ============================================================
// 5. Database Schema Types - 數據庫類型
// ============================================================

export interface DBStationTransfer {
  id: string;
  from_station_id: string;
  from_line_id: string;
  to_station_id: string;
  to_line_id: string;
  walking_distance_meters: number;
  floor_difference: number;
  vertical_method: VerticalMethod;
  turn_count: number;
  signage_clarity: 1 | 2 | 3;
  base_tpi: number;
  peak_hour_multiplier: number;
  expert_notes: { traps: string[]; hacks: string[] } | null;
  updated_at: string;
}

export interface DBStationAmenity {
  id: string;
  station_id: string;
  amenity_type: AmenityType;
  name: string;
  name_en: string | null;
  walk_minutes: number;
  lat: number | null;
  lng: number | null;
  has_seating: boolean;
  has_wifi: boolean;
  has_power_outlet: boolean;
  vibe_tags: string[] | null;
  operating_hours: Record<string, { open: string; close: string }> | null;
  created_at: string;
}

// ============================================================
// 6. Configuration - 配置
// ============================================================

export interface TPIWeights {
  distance: number;     // 0.25
  vertical: number;     // 0.20
  complexity: number;   // 0.20
  crowd: number;        // 0.15
  userModifier: number; // 0.20
}

export interface ReasoningConfig {
  tpiWeights: TPIWeights;

  // CDR 閾值
  cdrThresholds: {
    low: number;      // >= 0.8
    medium: number;   // >= 0.5
    high: number;     // >= 0.2
  };

  // WVC 閾值
  wvcThresholds: {
    waitRecommended: number;    // >= 1.5
    restNearbyRange: [number, number]; // [0.8, 1.5)
  };

  // 時間緩衝
  transferBufferMinutes: number;  // 預設 5 分鐘
  lastTrainBufferMinutes: number; // 預設 10 分鐘
}

export const DEFAULT_REASONING_CONFIG: ReasoningConfig = {
  tpiWeights: {
    distance: 0.25,
    vertical: 0.20,
    complexity: 0.20,
    crowd: 0.15,
    userModifier: 0.20
  },
  cdrThresholds: {
    low: 0.8,
    medium: 0.5,
    high: 0.2
  },
  wvcThresholds: {
    waitRecommended: 1.5,
    restNearbyRange: [0.8, 1.5]
  },
  transferBufferMinutes: 5,
  lastTrainBufferMinutes: 10
};
