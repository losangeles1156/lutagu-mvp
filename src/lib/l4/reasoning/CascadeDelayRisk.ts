/**
 * Cascade Delay Risk (CDR) Calculator
 *
 * 延誤連鎖風險計算器
 * 計算多段旅程中，一段延誤如何影響後續轉乘成功率
 */

import {
  JourneyLeg,
  TransferWindow,
  CDRResult,
  LastTrainRisk,
  RiskLevel,
  DEFAULT_REASONING_CONFIG
} from './types';
import { getTransferTPI } from './TransferPainIndex';

// ============================================================
// Transfer Success Rate (TSR)
// ============================================================

/**
 * 計算單次轉乘的成功機率
 * 基於：緩衝時間 = 下一班發車 - 預計到達 - 轉乘所需時間 - 延誤
 */
export function calcTransferSuccessRate(window: TransferWindow): number {
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

// ============================================================
// Transfer Time Estimation
// ============================================================

/**
 * 估算轉乘所需時間（分鐘）
 * 基於 TPI 或預設值
 */
export function estimateTransferTime(
  stationId: string,
  fromLineId: string,
  toLineId: string
): number {
  // 同線不需轉乘
  if (fromLineId === toLineId) return 0;

  // 基於 TPI 估算（TPI 每 10 分約等於 1 分鐘步行）
  const tpi = getTransferTPI(stationId, toLineId);

  // TPI 0-20: 2分鐘, 21-40: 5分鐘, 41-60: 8分鐘, 61-80: 12分鐘, 81-100: 15-20分鐘
  if (tpi <= 20) return 2;
  if (tpi <= 40) return 5;
  if (tpi <= 60) return 8;
  if (tpi <= 80) return 12;
  return 15 + Math.floor((tpi - 80) / 5); // 最多 20 分鐘
}

// ============================================================
// Risk Level Determination
// ============================================================

function determineRiskLevel(
  successRate: number,
  thresholds = DEFAULT_REASONING_CONFIG.cdrThresholds
): RiskLevel {
  if (successRate >= thresholds.low) return 'low';
  if (successRate >= thresholds.medium) return 'medium';
  if (successRate >= thresholds.high) return 'high';
  return 'critical';
}

// ============================================================
// Recommendation Generation
// ============================================================

function generateRecommendation(
  riskLevel: RiskLevel,
  bottleneckLegIndex: number,
  legs: JourneyLeg[],
  locale: string = 'zh'
): string {
  const bottleneckLeg = bottleneckLegIndex >= 0 ? legs[bottleneckLegIndex] : null;
  const bottleneckStation = bottleneckLeg?.toStation || '';

  const recommendations: Record<RiskLevel, Record<string, string>> = {
    low: {
      zh: '行程風險低，可按原計畫進行',
      ja: 'リスクは低いです。予定通りどうぞ',
      en: 'Low risk, proceed as planned'
    },
    medium: {
      zh: `建議關注 ${bottleneckStation} 的轉乘狀況，預留緩衝時間`,
      ja: `${bottleneckStation}での乗り換えにご注意ください。余裕を持ってください`,
      en: `Monitor transfer at ${bottleneckStation}, allow buffer time`
    },
    high: {
      zh: `${bottleneckStation} 轉乘風險高，強烈建議改搭替代路線`,
      ja: `${bottleneckStation}での乗り換えリスクが高いです。代替ルートをお勧めします`,
      en: `High transfer risk at ${bottleneckStation}, alternative routes recommended`
    },
    critical: {
      zh: `幾乎無法完成轉乘，請立即改變計畫或搭乘計程車`,
      ja: `乗り換えはほぼ不可能です。計画変更またはタクシーをご検討ください`,
      en: `Transfer nearly impossible, change plans or take taxi immediately`
    }
  };

  const lang = locale.startsWith('ja') ? 'ja' : locale.startsWith('en') ? 'en' : 'zh';
  return recommendations[riskLevel][lang];
}

// ============================================================
// Main CDR Calculator
// ============================================================

export function calcCascadeDelayRisk(
  legs: JourneyLeg[],
  locale: string = 'zh'
): CDRResult {
  if (legs.length === 0) {
    return {
      overallSuccessRate: 1.0,
      riskLevel: 'low',
      bottleneckLegIndex: -1,
      legSuccessRates: [],
      recommendation: ''
    };
  }

  if (legs.length === 1) {
    // 單段行程，沒有轉乘風險
    return {
      overallSuccessRate: 1.0,
      riskLevel: 'low',
      bottleneckLegIndex: -1,
      legSuccessRates: [1.0],
      recommendation: generateRecommendation('low', -1, legs, locale)
    };
  }

  let cumulativeDelay = 0;
  let overallSuccessRate = 1.0;
  let bottleneckLegIndex = -1;
  let minSuccessRate = 1.0;
  const legSuccessRates: number[] = [];
  let bottleneckReason = '';

  for (let i = 0; i < legs.length - 1; i++) {
    const currentLeg = legs[i];
    const nextLeg = legs[i + 1];

    // 累積延誤
    cumulativeDelay += currentLeg.currentDelayMinutes;

    // 估算轉乘時間
    const transferTimeRequired = estimateTransferTime(
      currentLeg.toStation,
      currentLeg.line,
      nextLeg.line
    );

    // 計算這次轉乘的成功率
    const transferWindow: TransferWindow = {
      scheduledArrival: currentLeg.scheduledArrival,
      nextDeparture: nextLeg.scheduledDeparture,
      transferTimeRequired,
      delayMinutes: cumulativeDelay
    };

    const tsr = calcTransferSuccessRate(transferWindow);
    legSuccessRates.push(tsr);
    overallSuccessRate *= tsr;

    // 記錄瓶頸
    if (tsr < minSuccessRate) {
      minSuccessRate = tsr;
      bottleneckLegIndex = i;

      const bufferMinutes =
        (nextLeg.scheduledDeparture.getTime() - currentLeg.scheduledArrival.getTime()) / 60000
        - transferTimeRequired - cumulativeDelay;

      if (bufferMinutes < 0) {
        bottleneckReason = `累積延誤 ${cumulativeDelay} 分鐘，緩衝時間不足`;
      } else if (bufferMinutes < 3) {
        bottleneckReason = `緩衝時間僅 ${Math.round(bufferMinutes)} 分鐘，風險較高`;
      }
    }
  }

  // 最後一段沒有後續轉乘
  legSuccessRates.push(1.0);

  const riskLevel = determineRiskLevel(overallSuccessRate);

  return {
    overallSuccessRate: Math.round(overallSuccessRate * 1000) / 1000,
    riskLevel,
    bottleneckLegIndex,
    bottleneckReason: bottleneckReason || undefined,
    legSuccessRates,
    recommendation: generateRecommendation(riskLevel, bottleneckLegIndex, legs, locale)
  };
}

// ============================================================
// Last Train Risk Calculator
// ============================================================

export function calcLastTrainRisk(
  legs: JourneyLeg[],
  currentTime: Date,
  lastTrainTimes: Map<string, Date>,
  bufferMinutes: number = DEFAULT_REASONING_CONFIG.lastTrainBufferMinutes,
  locale: string = 'zh'
): LastTrainRisk {
  const missedLines: LastTrainRisk['missedLines'] = [];
  let earliestDeadline: Date | null = null;

  for (let i = 0; i < legs.length; i++) {
    const leg = legs[i];
    const lastTrain = lastTrainTimes.get(leg.line);

    if (!lastTrain) continue;

    // 計算預計到達時間（含累積延誤）
    const cumulativeDelay = legs.slice(0, i + 1)
      .reduce((sum, l) => sum + l.currentDelayMinutes, 0);

    const estimatedDeparture = new Date(
      leg.scheduledDeparture.getTime() + cumulativeDelay * 60000
    );

    // 需要在末班車前 X 分鐘抵達
    const requiredDeparture = new Date(lastTrain.getTime() - bufferMinutes * 60000);

    if (estimatedDeparture > requiredDeparture) {
      const reasons: Record<string, string> = {
        zh: `預計發車時間 ${formatTime(estimatedDeparture)} 已超過末班車 ${formatTime(lastTrain)}`,
        ja: `予定発車時刻 ${formatTime(estimatedDeparture)} は終電 ${formatTime(lastTrain)} を過ぎています`,
        en: `Estimated departure ${formatTime(estimatedDeparture)} exceeds last train ${formatTime(lastTrain)}`
      };
      const lang = locale.startsWith('ja') ? 'ja' : locale.startsWith('en') ? 'en' : 'zh';

      missedLines.push({
        line: leg.line,
        lineName: leg.lineName,
        lastTrainTime: lastTrain,
        reason: reasons[lang]
      });
    }

    // 反推最晚出發時間
    const legDuration = leg.scheduledArrival.getTime() - leg.scheduledDeparture.getTime();
    const priorLegsTime = i > 0
      ? legs[i - 1].scheduledArrival.getTime() - legs[0].scheduledDeparture.getTime()
      : 0;

    const deadline = new Date(requiredDeparture.getTime() - legDuration - priorLegsTime);

    if (!earliestDeadline || deadline < earliestDeadline) {
      earliestDeadline = deadline;
    }
  }

  const alternativeOptions: string[] = [];
  if (missedLines.length > 0) {
    if (locale.startsWith('ja')) {
      alternativeOptions.push('タクシー', 'ネットカフェ', 'カプセルホテル');
    } else if (locale.startsWith('en')) {
      alternativeOptions.push('Taxi', 'Internet Cafe', 'Capsule Hotel');
    } else {
      alternativeOptions.push('計程車', '網咖', '膠囊旅館');
    }
  }

  return {
    hasRisk: missedLines.length > 0,
    missedLines,
    safeDepartureDeadline: earliestDeadline,
    alternativeOptions
  };
}

// ============================================================
// Utility
// ============================================================

function formatTime(date: Date): string {
  return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}

// ============================================================
// Scan Affected Lines
// ============================================================

/**
 * 掃描延誤對後續線路的連鎖影響
 */
export function scanCascadeImpact(
  delayedLine: string,
  delayMinutes: number,
  userJourneyLegs: JourneyLeg[]
): {
  affectedLegs: number[];
  cascadeRisk: CDRResult;
  alertMessage: string;
} {
  // 找出哪些腿會受影響
  const affectedLegs: number[] = [];

  for (let i = 0; i < userJourneyLegs.length; i++) {
    const leg = userJourneyLegs[i];
    if (leg.line === delayedLine) {
      affectedLegs.push(i);
      // 更新延誤時間
      leg.currentDelayMinutes = Math.max(leg.currentDelayMinutes, delayMinutes);
    }
  }

  // 重新計算整體風險
  const cascadeRisk = calcCascadeDelayRisk(userJourneyLegs);

  // 生成警告訊息
  let alertMessage = '';
  if (affectedLegs.length > 0) {
    if (cascadeRisk.riskLevel === 'critical') {
      alertMessage = `⚠️ 緊急：${delayedLine} 延誤 ${delayMinutes} 分鐘，您的後續轉乘幾乎不可能完成`;
    } else if (cascadeRisk.riskLevel === 'high') {
      alertMessage = `⚠️ 警告：${delayedLine} 延誤可能影響您在 ${userJourneyLegs[cascadeRisk.bottleneckLegIndex]?.toStation} 的轉乘`;
    } else if (cascadeRisk.riskLevel === 'medium') {
      alertMessage = `ℹ️ 提醒：${delayedLine} 延誤 ${delayMinutes} 分鐘，建議關注後續轉乘`;
    }
  }

  return {
    affectedLegs,
    cascadeRisk,
    alertMessage
  };
}
