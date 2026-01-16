/**
 * L5 Evacuation Rules - 專家知識規則引擎
 *
 * 實作暴雨垂直避難、大雪 72 小時生存等專家建議邏輯
 */

import { DisasterType, OfficialShelter, UserEvacuationProfile, EvacuationRoute, CivilianShelterPoint } from './types';

// ============================================================
// 暴雨垂直避難規則
// ============================================================

/**
 * 檢查地點是否安全 (針對洪水/大雨)
 * 規則：
 * 1. 絕對避開地下設施 (altitude <= 0 或 isUnderground)
 * 2. 洪水高危區需往高處移動 (目標海拔 > 浸水預期深度 + 安全係數)
 * 3. 若無法離開該區域，優先尋找 3 樓以上堅固建築
 */
export function evaluateFloodSafety(
    currentLocation: { lat: number; lng: number; altitude?: number; isUnderground?: boolean },
    targetShelter: OfficialShelter | CivilianShelterPoint,
    floodDepthPrediction: number = 3.0 // 預設 3 公尺浸水深度
): { isSafe: boolean; reason: string; score: number } {

    // 規則 1: 絕對禁止地下避難
    // 假設 OfficialShelter 不會在地下，但 CivilianPoint (如地下街咖啡廳) 可能
    // 這裡簡化判斷，若無 altitude 資訊則保守估計

    const isTargetUnderground = (targetShelter as any).floorLevel && (targetShelter as any).floorLevel < 0;

    if (isTargetUnderground) {
        return { isSafe: false, reason: '地下設施在大雨時極度危險', score: 0 };
    }

    // 規則 2: 垂直高度檢查
    const targetAltitude = (targetShelter as any).altitude || 0; // 若無數據需外部補全
    // 假設一般建築一層樓 3m，避難所若標註 capacity > 0 通常指安全樓層

    // 針對 "垂直避難"：若目標是指定避難所，通常已考慮高度
    if ((targetShelter as OfficialShelter).wardCode) {
        const shelter = targetShelter as OfficialShelter;
        if (shelter.suitableFor.includes('flood') || shelter.suitableFor.includes('heavy_rain')) {
            return { isSafe: true, reason: '官方指定洪水避難所', score: 100 };
        }
    }

    // 針對民間設施 (如 2F 的咖啡廳)
    if ((targetShelter as any).floorLevel && (targetShelter as any).floorLevel >= 3) {
        return { isSafe: true, reason: '位於 3 樓以上，符合垂直避難標準', score: 90 };
    }

    // 若無法判斷高度，則視為不確定
    return { isSafe: true, reason: '需現場確認樓層高度', score: 50 };
}

// ============================================================
// 地震避難規則 (避開玻璃幕牆)
// ============================================================

/**
 * 評估路徑的地震風險
 * 規則：
 * 1. 避開高層玻璃帷幕大樓周邊 (Glass Fall Hazard)
 * 2. 避開老舊木造密集區 (Fire Hazard)
 * 3. 優先選擇寬敞道路 (Width > 15m)
 */
export function evaluateEarthquakeRouteSafety(
    route: EvacuationRoute,
    buildingData: any[] // 需 GIS 建築數據
): { safetyScore: number; hazardWarnings: string[] } {
    // 面向未來擴充：需整合 GIS 數據
    // 目前 MVP 返回預設值

    return {
        safetyScore: 80,
        hazardWarnings: ['注意頭頂掉落物', '遠離玻璃帷幕大樓']
    };
}

// ============================================================
// 路徑評分引擎
// ============================================================

export function calculateRouteScore(
    route: EvacuationRoute,
    userProfile: UserEvacuationProfile,
    disasterType: DisasterType
): number {
    let score = 100;

    // 1. 距離衰減 (每 100m 扣 1 分)
    score -= (route.distanceMeters / 100);

    // 2. 無障礙檢核
    if (userProfile.mobilityLevel === 'wheelchair' && !route.isAccessible) {
        score -= 50; // 嚴重扣分
    }

    // 3. 災害特定規則
    if (disasterType === 'flood' || disasterType === 'heavy_rain') {
        // 獎勵海拔上升
        if (route.altitudeGainMeters > 5) score += 20;
    }

    // 4. 使用者優先級加權
    if (userProfile.priorities.includes('elderly')) {
        // 老年人優先選擇步行距離短的
        if (route.distanceMeters > 500) score -= 20;
    }

    return Math.max(0, score);
}
