export type LocalizedText = {
    'zh-TW': string;
    ja: string;
    en: string;
};

// ==========================================
// 1. User Preferences (L4 Input Context)
// ==========================================

export interface UserPreferences {
    accessibility: {
        wheelchair: boolean;
        stroller: boolean;
        visual_impairment: boolean;
        elderly: boolean;
    };

    luggage: {
        large_luggage: boolean; // 🧳 > 24 inch
        multiple_bags: boolean; // Many small bags
    };

    travel_style: {
        rushing: boolean;       // ⏰ Time priority
        budget: boolean;        // 💰 Cost priority
        comfort: boolean;       // 😌 Comfort priority (avoid transfers)
        avoid_crowd: boolean;   // 🚶 Avoid peak hours
        avoid_rain: boolean;    // 🌧️ Prefer indoor/underground
    };

    companions: {
        with_children: boolean;
        family_trip: boolean;
    };
}

// Flat list of all possible user state keys for Trigger matching
// e.g., 'accessibility.wheelchair', 'luggage.large_luggage'
export type UserStateKey =
    | 'accessibility.wheelchair'
    | 'accessibility.stroller'
    | 'accessibility.visual_impairment'
    | 'accessibility.elderly'
    | 'luggage.large_luggage'
    | 'luggage.multiple_bags'
    | 'travel_style.rushing'
    | 'travel_style.budget'
    | 'travel_style.comfort'
    | 'travel_style.avoid_crowd'
    | 'travel_style.avoid_rain'
    | 'companions.with_children'
    | 'companions.family_trip';


// ==========================================
// 2. Expert Knowledge Base (L4 Rules)
// ==========================================

export type KnowledgeType =
    | 'warning'        // ⚠️ Safety / Major Delay Risk
    | 'tip'            // 💡 Comfort / Convenience
    | 'ticket_advice'  // 🎫 Cost Saving
    | 'timing'         // ⏰ Reality Check (Walking time)
    | 'seasonal'       // 🌸❄️ Event / Weather specific
    | 'info';          // ℹ️ General Information

export interface KnowledgeTrigger {
    // Spatial Triggers
    station_ids?: string[];    // e.g., ['odpt:Station:JR-East.Tokyo']
    line_ids?: string[];       // e.g., ['odpt:Railway:JR-East.Keiyo']

    // Context Triggers
    user_states?: UserStateKey[]; // AND logic: applies if user matches ALL listed states
    // OR logic can be handled by multiple rules or higher-level engine

    // Temporal Triggers
    time_patterns?: string[];  // ISO Date Range '2025-12-31/2026-01-01' OR Time '08:00-09:00'

    keywords?: string[]; // New: Match against user query text

    // Logical Triggers (Advanced)
    transfer_complex?: boolean; // if route involves complex transfer at this station
}

export interface ExpertKnowledge {
    id: string; // unique slug, e.g., 'tokyo-keiyo-transfer-warning'

    trigger: KnowledgeTrigger;

    type: KnowledgeType;
    priority: number; // 0-100, higher shows first

    // Metadata for UI
    icon: string; // Emoji char
    title: LocalizedText;
    content: LocalizedText;

    // Action (Deep Link)
    actionLabel?: LocalizedText;
    actionUrl?: string;

    // Source/Maintenance info
    author?: string; // e.g. 'Human_Editor_01'
    verified_at?: string; // ISO Date

    // Visibility Control
    excludeFromCards?: boolean; // If true, only used for Chat context, not shown as Strategy Card
}

// ==========================================
// 3. Runtime Context & API Structures
// ==========================================

export interface EvaluationContext {
    stationId: string;
    lineIds: string[];
    userPreferences: UserPreferences;
    currentDate: Date;
    locale: 'zh-TW' | 'ja' | 'en';

    // Optional WVC Factors
    waitMinutes?: number;
    destinationValue?: number; // 1-10 (1=casual, 10=critical meeting)
}

export interface RecommendRequest {
    stationId: string;
    lineIds?: string[];
    userPreferences: UserPreferences;
    locale: 'zh-TW' | 'ja' | 'en';
}

// Unified Result Card (Output of both DecisionEngine and HardCalculationEngine)
export interface MatchedStrategyCard {
    id: string;
    type: KnowledgeType | string; // Allow string for hard calc custom types

    // Display Content
    icon: string;
    title: string;       // Localized title
    description: string; // Localized body

    // Action (Deep Link)
    actionLabel?: string;
    actionUrl?: string;

    // Logic
    priority: number;    // Final sorting weight

    // Internal / Debug
    knowledgeId?: string; // If from KB
    _debug_reason?: string;
}
