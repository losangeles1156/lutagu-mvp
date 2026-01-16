/**
 * L5 Decision Engine - 分級觸發決策引擎
 *
 * 整合 JMA Alert、User Profile 與專家規則，輸出最終決策
 */

import {
    JMAAlertInfo,
    EvacuationDecision,
    UserEvacuationProfile,
    DisasterType,
    AlertLevel
} from './types';
import { shouldTriggerEvacuation, TOKYO_WARD_CODES } from './jmaParser';
import PRIMARY_SHELTERS from '@/data/tokyo_primary_shelters.json';

// ============================================================
// 常數定義
// ============================================================

// 預設空的決策結果
const DEFAULT_DECISION: EvacuationDecision = {
    triggerLevel: 'green',
    activeAlerts: [],
    recommendedRoutes: [],
    alternativeOptions: {
        nearbyConvenienceStores: [],
        sharedMobilityLinks: {
            helloCycling: 'https://www.hellocycling.jp/',
            luup: 'https://luup.sc/',
            chargespot: 'https://chargespot.jp/'
        }
    },
    warnings: [],
    tips: [],
    localizedMessage: {
        ja: '現在、警報は発令されていません。',
        en: 'No alerts currently issued.',
        zh: '目前無警報發布。'
    },
    dataQuality: 'complete',
    generatedAt: new Date()
};

// ============================================================
// 核心決策邏輯
// ============================================================

export async function evaluateEvacuationNeed(
    currentWardCode: string,
    userProfile: UserEvacuationProfile,
    latestAlerts: JMAAlertInfo[]
): Promise<EvacuationDecision> {

    // 1. 判斷觸發級別
    const { shouldTrigger, level } = shouldTriggerEvacuation(currentWardCode, latestAlerts);

    // 若無須觸發，返回綠色狀態
    if (level === 'green') {
        return {
            ...DEFAULT_DECISION,
            generatedAt: new Date()
        };
    }

    // 2. 篩選相關警報
    const activeAlerts = latestAlerts.filter(a =>
        a.affectedAreas.includes(currentWardCode) || a.affectedAreas.includes('13000')
    );

    // 3. 生成警告訊息
    const message = generateSummaryMessage(level, activeAlerts, userProfile.preferredLocale);

    // 4. 生成具體建議 (Tips)
    const tips = generateSafetyTips(activeAlerts, userProfile);

    // 5. 尋找避難所與路徑 (使用 MVP 靜態數據)
    // TODO: 整合 Supabase 避難所查詢
    const nearbyContext = findNearestShelter(currentWardCode);
    const recommendedRoutes: EvacuationDecision['recommendedRoutes'] = [];

    if (nearbyContext.shelter) {
        // 這裡簡單生成一個直線路徑作為 MVP 示意
        // 實際應調用 Google Maps API 或 OSRM
        recommendedRoutes.push({
            id: `route_${nearbyContext.shelter.id}`,
            fromCoordinates: { lat: 35.6895, lng: 139.6917 }, // 假設用戶在獲取避難建議時的位置 (TODO: 傳入真實座標)
            toShelter: nearbyContext.shelter as any,
            distanceMeters: nearbyContext.distance * 1000, // km -> m
            estimatedMinutes: Math.ceil(nearbyContext.distance * 15), // 假設步行時速 4km/h
            altitudeGainMeters: 0,
            isAccessible: true,
            avoidedHazards: [],
            warnings: []
        });
    }

    return {
        triggerLevel: level,
        activeAlerts,
        recommendedRoutes,
        alternativeOptions: DEFAULT_DECISION.alternativeOptions,
        warnings: activeAlerts.map(a => a.headline),
        tips,
        localizedMessage: message,
        dataQuality: 'partial', // 標記為 partial 因為路徑尚未實作
        generatedAt: new Date()
    };
}

// ============================================================
// 輔助函數
// ============================================================

function generateSummaryMessage(
    level: 'yellow' | 'orange' | 'red',
    alerts: JMAAlertInfo[],
    locale: string
): { ja: string; en: string; zh: string } {

    const alertTypes = Array.from(new Set(alerts.map(a => a.type)));

    // 簡單模板，實際可更細緻
    if (level === 'red') {
        return {
            ja: `🔴【緊急】直ちに避難行動をとってください。`,
            en: `🔴 EMERGENCY: Take immediate evacuation action.`,
            zh: `🔴【緊急】請立即採取避難行動。`
        };
    }

    if (level === 'orange') {
        return {
            ja: `🟠【警戒】避難の準備をしてください。`,
            en: `🟠 WARNING: Prepare for evacuation.`,
            zh: `🟠【警戒】請做好避難準備。`
        };
    }

    return {
        ja: `⚠️【注意】気象情報に注意してください。`,
        en: `⚠️ ADVISORY: Stay updated on weather info.`,
        zh: `⚠️【注意】請留意氣象資訊。`
    };
}

function generateSafetyTips(
    alerts: JMAAlertInfo[],
    profile: UserEvacuationProfile
): string[] {
    const tips: string[] = [];
    const types = alerts.map(a => a.type);

    if (types.includes('heavy_rain') || types.includes('flood')) {
        tips.push('DontGoUnderground'); // 避免地下
        if (profile.mobilityLevel === 'wheelchair') {
            tips.push('SeekHelpEarly'); // 輪椅使用者儘早求助
        }
    }

    if (types.includes('snow')) {
        tips.push('WatchFooting'); // 小心腳下
        if (profile.canReadJapanese === false) {
            tips.push('CheckTranslationApp'); // 善用翻譯軟體
        }
    }

    return tips;
}

function findNearestShelter(wardCode: string) {
    // 簡單匹配 Ward Code
    const shelter = PRIMARY_SHELTERS.find(s => s.wardCode === wardCode);
    // 假設距離 (MVP)
    return { shelter, distance: 0.5 }; // 0.5 km
}
