export type SupportedLocale = 'zh' | 'zh-TW' | 'ja' | 'en' | 'ar';

export interface RouteOption {
    label: string;
    steps: RouteStep[];
    duration?: number;
    transfers?: number;
    fare?: { ic: number; ticket: number };
    nextDeparture?: string;
    railways?: string[]; // Added to pass to AssistantEngine
    sources: Array<{ type: string; verified: boolean }>;
}

export type RouteStepKind = 'origin' | 'destination' | 'train' | 'transfer' | 'walk' | 'wait' | 'info';

export interface RouteStep {
    kind: RouteStepKind;
    text: string;
    icon?: string;
    railwayId?: string;
    duration?: number;
    distance?: number;
}

export interface RailwayTopology {
    railwayId: string;
    operator: string;
    title: { [key in SupportedLocale]?: string };
    stationOrder: Array<{
        index: number;
        station: string;
        title: { [key in SupportedLocale]?: string };
    }>;
    asc?: boolean; // direction flag
}

export type L4DataSource =
    | { type: 'odpt:RailwayFare'; verified: boolean }
    | { type: 'odpt:StationTimetable'; verified: boolean }
    | { type: 'odpt:Railway'; verified: boolean };

export interface RouteCosts {
    time: number;
    fare: number;
    transfers: number;
    hops: number;
    railwaySwitches: number;
    operatorSwitches: number;
    transferDistance: number;
    crowding: number;
}

export type L4DemandState = {
    // 無障礙需求 (Accessibility)
    wheelchair: boolean;
    stroller: boolean;
    vision: boolean;
    senior: boolean;

    // 行李狀態 (Luggage)
    largeLuggage: boolean;
    lightLuggage: boolean;

    // 行程偏好 (Preferences)
    rushing: boolean;
    budget: boolean;
    comfort: boolean;
    avoidCrowds: boolean;
    avoidRain: boolean;
};

export interface TPIResult {
    score: number;
    level: 'easy' | 'normal' | 'hard' | 'difficult' | 'extreme';
    breakdown: { distance: number; vertical: number; complexity: number; crowd: number; userModifier: number };
    recommendation: string;
}

export interface CDRResult {
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    maxDelayProb: number;
    criticalPath: string[]; // IDs of risky lines
    advice: string;
}

export interface EnrichedRouteOption extends RouteOption {
    tpi: TPIResult;
    cdr: CDRResult;
}
