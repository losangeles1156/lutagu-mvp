// Defines the rigorous contract for the Station UI (L1 - L4).
// Decoupled from Backend DB schemas.

// --- Shared Types ---
export type LocaleString = { ja: string; en: string; zh: string };

// --- L1: DNA (Location) ---
export interface L1_Item {
    name: LocaleString;
    osm_id?: string;
}

export interface L1_Subcategory {
    count: number;
    label: LocaleString;
}

export interface L1_Category {
    id: string; // e.g., 'shopping'
    count: number;
    label: LocaleString;
    subcategories?: { [key: string]: L1_Subcategory };
    representative_spots?: L1_Item[];
}

export interface L1_VibeTag {
    id: string;
    label: LocaleString;
    score: number; // 1-5
    description?: LocaleString;
}

// Replaces the old array of category objects with a map + vibe tags
export interface L1_DNA_Data {
    categories: { [key: string]: L1_Category };
    vibe_tags: L1_VibeTag[];
    tagline?: LocaleString;
    title?: LocaleString;
    last_updated: string;
}

// --- L2: Live (Vitals) ---
export type Operator = 'Metro' | 'Toei' | 'JR' | 'Keisei' | 'Tsukuba' | 'Other';
export type LineStatusType = 'normal' | 'delay' | 'suspended';

export interface StationLine {
    id: string;
    name: LocaleString;
    operator: Operator;
    color: string;
    status: LineStatusType;
    message?: LocaleString;
}

export interface WeatherInfo {
    temp: number;
    condition: string;
    windSpeed: number; // m/s
    iconCode?: string;
}

export interface CrowdInfo {
    level: 1 | 2 | 3 | 4 | 5; // 1: Empty, 5: Packed
    trend: 'rising' | 'falling' | 'stable';
    userVotes: {
        total: number;
        distribution: number[]; // Array of 5 integers representing votes for each level
    };
}

// --- L3: Facilities (Services) ---
export type FacilityType = 'toilet' | 'locker' | 'charging' | 'elevator' | 'atm' | 'nursery' | 'bike' | 'wifi' | 'info' | 'smoking';

export interface L3Facility {
    id: string;
    type: FacilityType;
    name: LocaleString; // e.g., "Ecute Ueno Lockers"
    location: LocaleString; // "Inside Ticket Gate, Central Concourse"
    isAvailable?: boolean; // Real-time availability if possible
    details?: LocaleString[]; // ["Large size available", "Suica accepted"]
    attributes?: Record<string, any>; // Arbitrary additional properties (hours, notes, etc.)
}

/**
 * @deprecated Use L3Facility instead. This alias exists for backward compatibility during migration.
 */
export type ServiceFacility = L3Facility;

// --- L4: Strategy (LUTAGU) ---
export interface ActionCard {
    id: string;
    type: 'primary' | 'secondary';
    title: LocaleString;
    description: LocaleString;
    actionLabel: LocaleString;
    actionUrl?: string; // Deep link
    icon?: string;
}

export interface L4Item {
    icon: string;
    title: string;
    description: string;
    advice?: string;
}

export interface L4FacilityHighlight {
    type: string;
    location: string;
    tags: string[];
}

export interface L4Knowledge {
    traps: L4Item[];
    hacks: L4Item[];
    facilities: L4FacilityHighlight[];
}

// --- ROOT PROFILE ---
export interface StationUIProfile {
    // Identity
    id: string;
    tier: 'major' | 'minor'; // Major = Hub (Ueno, Tokyo), Minor = Spoke
    name: LocaleString;
    description: LocaleString;

    // Map Appearance
    mapDesign?: {
        color: string; // Hex color for the pin
        icon: string; // Custom icon identifier (e.g., 'ueno_panda')
    };

    // L1: 300m DNA
    l1_dna: L1_DNA_Data;

    // L2: Live Status
    l2: {
        lines: StationLine[];
        weather: WeatherInfo;
        crowd: CrowdInfo;
        updatedAt?: string;
    };

    // L3: Services (Stacked)
    l3_facilities: L3Facility[];

    // Quick Links (e.g. Toilet Vacancy)
    external_links?: { title: LocaleString; url: string; icon?: string; bg?: string; tracking_id?: string; type?: string }[];

    // L4: Strategy
    l4_cards: ActionCard[];
    l4_knowledge?: L4Knowledge;
}
