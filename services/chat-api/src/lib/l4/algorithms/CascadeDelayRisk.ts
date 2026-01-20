/**
 * Cascade Delay Risk (CDR) Calculator
 *
 * 延誤連鎖風險計算器
 * 計算多段旅程中，一段延誤如何影響後續轉乘成功率
 */

import {
  TransferWindow,
  RiskLevel,
  DEFAULT_REASONING_CONFIG
} from '../types';
import { calcTransferPainIndex } from './TransferPainIndex';

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
  if (effectiveBuffer >= 5) return 0.90;  // 安全
  if (effectiveBuffer >= 3) return 0.70;  // 有風險
  if (effectiveBuffer >= 1) return 0.40;  // 高風險
  if (effectiveBuffer >= 0) return 0.20;  // 極高風險
  return 0.05; // 幾乎不可能
}

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

  // 這裡未來應接入真實的 TPI 數據查詢
  // 目前先使用基礎預設值，或模擬一個 TPI
  const mockTpi = 50; // 預設中等難度

  if (mockTpi <= 20) return 2;
  if (mockTpi <= 40) return 5;
  if (mockTpi <= 60) return 8;
  if (mockTpi <= 80) return 12;
  return 15 + Math.floor((mockTpi - 80) / 5);
}

function determineRiskLevel(
  successRate: number,
  thresholds = DEFAULT_REASONING_CONFIG.cdrThresholds
): RiskLevel {
  if (successRate >= thresholds.low) return 'low';
  if (successRate >= thresholds.medium) return 'medium';
  if (successRate >= thresholds.high) return 'high';
  return 'critical';
}

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

    cumulativeDelay += currentLeg.currentDelayMinutes;

    const transferTimeRequired = estimateTransferTime(
      currentLeg.toStation,
      currentLeg.line,
      nextLeg.line
    );

    const transferWindow: TransferWindow = {
      scheduledArrival: currentLeg.scheduledArrival,
      nextDeparture: nextLeg.scheduledDeparture,
      transferTimeRequired,
      delayMinutes: cumulativeDelay
    };

    const tsr = calcTransferSuccessRate(transferWindow);
    legSuccessRates.push(tsr);
    overallSuccessRate *= tsr;

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

    const cumulativeDelay = legs.slice(0, i + 1)
      .reduce((sum, l) => sum + l.currentDelayMinutes, 0);

    const estimatedDeparture = new Date(
      leg.scheduledDeparture.getTime() + cumulativeDelay * 60000
    );

    const requiredDeparture = new Date(lastTrain.getTime() - bufferMinutes * 60000);

    if (estimatedDeparture > requiredDeparture) {
      const formatTimeStr = (date: Date) => date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
      const reasons: Record<string, string> = {
        zh: `預計發車時間 ${formatTimeStr(estimatedDeparture)} 已超過末班車 ${formatTimeStr(lastTrain)}`,
        ja: `予定發車時刻 ${formatTimeStr(estimatedDeparture)} は終電 ${formatTimeStr(lastTrain)} を過ぎています`,
        en: `Estimated departure ${formatTimeStr(estimatedDeparture)} exceeds last train ${formatTimeStr(lastTrain)}`
      };
      const lang = locale.startsWith('ja') ? 'ja' : locale.startsWith('en') ? 'en' : 'zh';

      missedLines.push({
        line: leg.line,
        lineName: leg.lineName,
        lastTrainTime: lastTrain,
        reason: reasons[lang]
      });
    }

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

export interface JourneyLeg {
  line: string; // railwayId
  lineName: string;
  fromStation: string;
  toStation: string;
  scheduledDeparture: Date;
  scheduledArrival: Date;
  currentDelayMinutes: number; // Live data or 0
}

export interface CDRResult {
  overallSuccessRate: number; // 0-1
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  bottleneckLegIndex: number; // Index of the leg causing most risk, or -1 if none
  bottleneckReason?: string; // Optional reason for the bottleneck
  legSuccessRates: number[]; // Success rate for each transfer
  recommendation: string;
}

export interface LastTrainRisk {
  hasRisk: boolean;
  missedLines: {
    line: string;
    lineName: string;
    lastTrainTime: Date;
    reason: string;
  }[];
  safeDepartureDeadline: Date | null;
  alternativeOptions: string[];
}

export function scanCascadeImpact(
  delayedLine: string,
  delayMinutes: number,
  userJourneyLegs: JourneyLeg[]
): {
  affectedLegs: number[];
  cascadeRisk: CDRResult;
  alertMessage: string;
} {
  const affectedLegs: number[] = [];

  for (let i = 0; i < userJourneyLegs.length; i++) {
    const leg = userJourneyLegs[i];
    if (leg.line === delayedLine) {
      affectedLegs.push(i);
      leg.currentDelayMinutes = Math.max(leg.currentDelayMinutes, delayMinutes);
    }
  }

  const cascadeRisk = calcCascadeDelayRisk(userJourneyLegs);

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
