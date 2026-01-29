/**
 * LUTAGU Map Display Policy (Single Source of Truth)
 * 
 * Defines the 5-Tier system for node visibility, sizing, and styling.
 * Based on map-display-rules/SKILL.md
 */

export enum MapDisplayTier {
    SUPER_HUB = 1,     // Zoom 1+ (Always Visible, Squircle)
    MAJOR_HUB = 2,     // Zoom 12+ (Major Hubs)
    MINOR_HUB = 3,     // Zoom 14+ (Transfer nodes with 3+ lines)
    REGULAR = 4,       // Zoom 15+ (Regular stations)
    LOCAL = 5          // Zoom 16+ (Local nodes/exits)
}

export const ZOOM_THRESHOLD = {
    [MapDisplayTier.SUPER_HUB]: 1,
    [MapDisplayTier.MAJOR_HUB]: 12,
    [MapDisplayTier.MINOR_HUB]: 14,
    [MapDisplayTier.REGULAR]: 15,
    [MapDisplayTier.LOCAL]: 16
};

// --- Tier 1: Super Hubs (Strict List) ---
const TIER_1_KEYWORDS = [
    'Tokyo', 'Ueno', 'KeiseiUeno', 'Ikebukuro', 'Shinjuku', 'Shibuya',
    'Shinagawa', 'NaritaAirport', 'HanedaAirport', 'Yokohama', 'Kawasaki',
    'Ginza', 'Akihabara'
];

const TIER_1_EXCLUSIONS = ['SeibuShinjuku', 'ShinjukuNishiguchi', 'UenoOkachimachi', 'UenoHirokoji'];

// --- Tier 2: Major Hubs (Strict List) ---
const TIER_2_KEYWORDS = [
    'Otemachi', 'Asakusa', 'Hamamatsucho', 'Daimon',
    'Oshiage', 'TokyoSkytree',
    'Shimbashi', 'Iidabashi', 'Hibiya', 'Nippori', 'Oimachi',
    'KitaSenju', 'Akabane', 'Oji', 'Takadanobaba',
    'HigashiNihombashi', 'Bakuroyokoyama', 'Bakurocho',
    'Nihombashi', 'Kinshicho', 'NishiNippori',
    'Kamata',
    'Roppongi', 'AkasakaMitsuke', 'Ochanomizu',
    'Ichigaya', 'Yotsuya', 'Meguro', 'Nakameguro', 'Gotanda',
    'Okachimachi', 'NakaOkachimachi', 'UenoOkachimachi', 'UenoHirokoji', 'ShinOchanomizu',
    'Nakano', 'MusashiKosugi', 'Kanda', 'Jimbocho', 'Kudanshita',
    'Sengakuji', 'Funabashi'
];

const TIER_2_EXCLUSIONS = ['KeikyuKamata'];

// --- Tier 3: Minor Hubs (Transfer focused) ---
const TIER_3_KEYWORDS = [
    'Kayabacho', 'MonzenNakacho', 'HongoSanchome', 'Ningyocho',
    'HigashiGinza', 'Mitsukoshimae', 'Yurakucho', 'Omotesando',
    'AoyamaItchome', 'MeijiJingumae', 'Ebisu',
    'Osaki', 'Tamachi', 'Yoyogi', 'Sendagaya',
    'Kagurazaka', 'Waseda', 'Korakuen', 'Kasuga',
    'Komagome', 'Sugamo', 'Suidobashi' // Added from SQL mismatches
];

/**
 * 實作「地理名稱唯一化 (Geo-name Only)」
 */
export function getNameOnly(name: any, locale: string = 'zh-TW'): string {
    if (!name) return '';

    let raw: string = '';
    if (typeof name === 'string') {
        raw = name;
    } else if (name[locale]) {
        raw = name[locale];
    } else {
        raw = name['zh-TW'] || name['ja'] || name['en'] || '';
    }

    let clean = raw.replace(/^(JR東日本|JR東海|JR西日本|JR|Tokyo Metro|Toei|Keikyu|Tokyu|Odakyu|Seibu|Keio|Tobu|Keisei|TWR|Yurikamome|Tokyo Monorail|Tsukuba Express|東京メトロ|都営|京急|東武|京成|西武|小田急|東急|東京單軌|筑波快線|東京地下鐵)\s*/i, '');
    clean = clean.replace(/(駅|候車亭)$/, '');
    clean = clean.replace(/空港(第\d航站)$/i, '');
    clean = clean.replace(/空港$/i, '');
    clean = clean.replace(/站$/, '');
    clean = clean.replace(/\s*Subway\s*Station$/i, '');
    clean = clean.replace(/\s*Railway\s*Station$/i, '');
    clean = clean.replace(/\s*Airport\s*Terminal\s*\d+$/i, '');
    clean = clean.replace(/\s*Airport$/i, '');
    clean = clean.replace(/\s*Station$/i, '');
    clean = clean.replace(/\s*Terminal$/i, '');
    clean = clean.replace(/\s*\(.*?\)/g, '');
    clean = clean.replace(/\s*（.*?）/g, '');

    return clean.trim();
}

/**
 * 根據車站 ID 判定顯示階層 (Display Tier)
 */
export function getNodeDisplayTier(nodeId: string, name?: string): MapDisplayTier {
    if (!nodeId) return MapDisplayTier.LOCAL;

    const cleanId = nodeId.replace(/^odpt:Station:/, '');
    const parts = cleanId.split('.');
    const stationName = parts[parts.length - 1];
    const nameLower = stationName.toLowerCase();

    // 1. Tier 1 Check: Strict match for geo-name to avoid false positives at low zoom
    const nameStr = typeof name === 'string' ? name : (name ? (name as any).en || (name as any)['zh-TW'] || (name as any).ja : '');
    const isAirport = nameLower.includes('airport') || nodeId.toLowerCase().includes('airport') || (nameStr && nameStr.toLowerCase().includes('airport'));

    const t1Match = TIER_1_KEYWORDS.find(k => nameLower === k.toLowerCase());

    if ((t1Match || isAirport) && !TIER_1_EXCLUSIONS.some(ex => nameLower === ex.toLowerCase())) {
        return MapDisplayTier.SUPER_HUB;
    }

    // 2. Tier 2 Check
    const t2Match = TIER_2_KEYWORDS.find(k => nameLower === k.toLowerCase());
    if (t2Match && !TIER_2_EXCLUSIONS.some(ex => nameLower === ex.toLowerCase())) {
        return MapDisplayTier.MAJOR_HUB;
    }

    // 3. Tier 3 Check
    const t3Match = TIER_3_KEYWORDS.find(k => nameLower === k.toLowerCase());
    if (t3Match) return MapDisplayTier.MINOR_HUB;

    // 4. Tier 4 (REGULAR) - For stations with non-trivial structures or explicit patterns
    // Includes all major JR, Subway, and Private Railway operators
    const MAJOR_OPERATORS = [
        'JR-East', 'JR-Central', 'JR-West', 'TokyoMetro', 'Toei',
        'Tokyu', 'Odakyu', 'Keio', 'Keisei', 'Seibu', 'Tobu', 'Keikyu',
        'Sagamitetsudo', 'TWR', 'Yurikamome', 'TokyoMonorail', 'TsukubaExpress',
        'Hokuso', 'SaitamaRailway', 'ToyoFastExpress', 'Minatomirai'
    ];

    if (MAJOR_OPERATORS.some(op => cleanId.includes(op) || nodeId.includes(op))) {
        return MapDisplayTier.REGULAR;
    }

    return MapDisplayTier.LOCAL;
}

/**
 * Centralized Manifest Logic for UI Components
 */
export interface NodeDisplayManifest {
    size: number;
    zIndex: number;
    showLabel: boolean;
    shouldCluster: boolean;
    shape: 'squircle' | 'circle';
}

export function getNodeDisplayManifest(
    tier: MapDisplayTier,
    zoom: number,
    isSelected: boolean = false
): NodeDisplayManifest {
    // 1. Base Size Logic
    let baseSize = 28;
    if (tier === MapDisplayTier.SUPER_HUB) baseSize = 56;
    else if (tier === MapDisplayTier.MAJOR_HUB) baseSize = 44;
    else if (tier === MapDisplayTier.MINOR_HUB) baseSize = 32;

    const size = isSelected ? baseSize * 1.15 : baseSize;

    // 2. Z-Index Logic
    let zIndex = 10;
    if (isSelected) zIndex = 100;
    else if (tier === MapDisplayTier.SUPER_HUB) zIndex = 95;
    else if (tier === MapDisplayTier.MAJOR_HUB) zIndex = 85;
    else if (tier === MapDisplayTier.MINOR_HUB) zIndex = 50;

    // 3. Label Logic
    const minZoom = ZOOM_THRESHOLD[tier] || 16;
    const showLabel = isSelected || tier === MapDisplayTier.SUPER_HUB || zoom >= minZoom;

    // 4. Clustering Logic
    const shouldCluster = tier > 2; // T1 & T2 never cluster

    // 5. Shape Logic
    const shape = (tier === MapDisplayTier.SUPER_HUB) ? 'squircle' : 'circle';

    return { size, zIndex, showLabel, shouldCluster, shape };
}

export function getMinZoomForTier(tier: MapDisplayTier): number {
    return ZOOM_THRESHOLD[tier] || 16;
}

