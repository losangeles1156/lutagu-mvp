/**
 * L5 Disaster Types - 極端天氣避難決策系統
 *
 * 這些類型定義用於避難決策引擎，與 L4 推理鏈整合使用。
 */

// ============================================================
// 1. 災害與警報類型
// ============================================================

/** 災害類型 */
export type DisasterType =
    | 'heavy_rain'   // 大雨
    | 'flood'        // 洪水
    | 'typhoon'      // 颱風
    | 'snow'         // 大雪
    | 'earthquake'   // 地震
    | 'tsunami';     // 海嘯

/** 警報級別 (依據氣象廳分級) */
export type AlertLevel =
    | 'advisory'        // 注意報
    | 'warning'         // 警報
    | 'emergency'       // 緊急警報
    | 'special_emergency'; // 特別警報

/** JMA 警報解析結果 */
export interface JMAAlertInfo {
    type: DisasterType;
    level: AlertLevel;
    issuedAt: Date;
    validUntil?: Date;
    affectedAreas: string[];  // 區代碼列表 (如 '13101' = 千代田區)
    headline: string;
    description: string;
}

// ============================================================
// 2. 避難設施類型
// ============================================================

/** 官方避難所 */
export interface OfficialShelter {
    id: string;
    name: {
        ja: string;
        en?: string;
        zh?: string;
    };
    wardCode: string;       // 區代碼
    wardName: string;       // 區名稱
    address: string;
    coordinates: {
        lat: number;
        lng: number;
    };
    capacity?: number;
    altitude?: number;      // 海拔高度 (m)
    suitableFor: DisasterType[];
    facilities: {
        hasToilet: boolean;
        hasBedding: boolean;
        hasFood: boolean;
        isAccessible: boolean;
        hasNursingRoom?: boolean;
    };
    operatingHours?: '24h' | { open: string; close: string };
    source: 'tokyo_metro' | 'national' | 'ward';
    lastUpdated: Date;
}

/** 民間避難協力設施 */
export interface CivilianShelterPoint {
    id: string;
    type: 'convenience_store' | 'internet_cafe' | 'cafe' | 'mall' | 'hotel';
    chainBrand?: string;    // 如 '7-Eleven', '快活CLUB'
    name: string;
    coordinates: {
        lat: number;
        lng: number;
    };
    operatingHours: '24h' | { open: string; close: string };
    hasCharging: boolean;
    hasSleepingFacility: boolean;
    requiresPayment: boolean;
    isOfficialPartner: boolean;  // 官方認定「災害時協力店舗」
}

// ============================================================
// 3. 使用者避難狀態
// ============================================================

/** 使用者避難優先級標籤 */
export type EvacuationPriority =
    | 'wheelchair'
    | 'elderly'
    | 'pregnant'
    | 'visual_impaired'
    | 'foreign_tourist'
    | 'family_with_infant'
    | 'general';

/** 使用者避難設定檔 */
export interface UserEvacuationProfile {
    mobilityLevel: 'full' | 'limited' | 'wheelchair';
    hasVisualImpairment: boolean;
    isPregnant: boolean;
    isElderly: boolean;
    hasFamilyWithInfant: boolean;
    hasLargeLuggage: boolean;
    hasCashAvailable: boolean;
    batteryLevel: number;                // 0-100
    canReadJapanese: boolean;
    preferredLocale: 'ja' | 'en' | 'zh-TW' | 'zh' | 'ko';
    priorities: EvacuationPriority[];
}

// ============================================================
// 4. 避難路徑與決策結果
// ============================================================

/** 避難路徑 */
export interface EvacuationRoute {
    id: string;
    fromCoordinates: { lat: number; lng: number };
    toShelter: OfficialShelter | CivilianShelterPoint;
    distanceMeters: number;
    estimatedMinutes: number;
    altitudeGainMeters: number;   // 海拔上升
    isAccessible: boolean;
    avoidedHazards: string[];     // 避開的危險區域
    waypoints?: { lat: number; lng: number }[];
    warnings: string[];
}

/** 避難決策結果 */
export interface EvacuationDecision {
    triggerLevel: 'green' | 'yellow' | 'orange' | 'red';
    activeAlerts: JMAAlertInfo[];
    recommendedRoutes: EvacuationRoute[];
    alternativeOptions: {
        nearbyConvenienceStores: CivilianShelterPoint[];
        sharedMobilityLinks: {
            helloCycling: string;
            luup: string;
            chargespot: string;
        };
    };
    warnings: string[];
    tips: string[];
    localizedMessage: {
        ja: string;
        en: string;
        zh: string;
    };
    dataQuality: 'complete' | 'partial' | 'stale';
    generatedAt: Date;
}

// ============================================================
// 5. 知識卡片類型 (用於對話中顯示)
// ============================================================

/** 知識卡片 */
export interface KnowledgeCard {
    id: string;
    topic: 'snow_safety' | 'earthquake_evacuation' | 'flood_vertical' | 'general_emergency';
    title: {
        ja: string;
        en: string;
        zh: string;
    };
    content: {
        ja: string;
        en: string;
        zh: string;
    };
    icon: string;          // Emoji 圖示
    relatedLinks: {
        label: string;
        url: string;
    }[];
    triggerConditions: {
        disasterTypes?: DisasterType[];
        alertLevels?: AlertLevel[];
        userLocales?: string[];
        weatherConditions?: string[];  // 如 'snow', 'heavy_rain'
    };
}

// ============================================================
// 6. 共享單車服務連結 (MVP 直接提供連結)
// ============================================================

export const SHARED_MOBILITY_LINKS = {
    helloCycling: 'https://www.hellocycling.jp/',
    luup: 'https://luup.sc/',
    chargespot: 'https://chargespot.jp/',
    goTaxi: 'https://go.mo-t.com/',
} as const;
