import { supabase } from '../supabase';
import { STATION_WISDOM } from '../../data/stationWisdom';
import { STATIC_L1_DATA } from '../../data/staticL1Data';

// Types aligning with DB schema
export interface NodeDatum {
    id: string;
    city_id: string;
    name: any;
    type: string;
    location: { coordinates: [number, number] }; // Unified to [lon, lat]
    geohash: string;
    vibe: string | null;
    is_hub: boolean;
    parent_hub_id: string | null;
    zone: string;
}

/**
 * Ensures location is always a GeoJSON-like object { coordinates: [lon, lat] }
 * Handles: WKT strings, Objects with coordinates, or raw DB geography format
 */
export function parseLocation(loc: any): { coordinates: [number, number] } {
    if (!loc) return { coordinates: [0, 0] };

    // Case 1: Already correct object
    if (loc.coordinates && Array.isArray(loc.coordinates)) {
        return { coordinates: [loc.coordinates[0], loc.coordinates[1]] };
    }

    // Case 2: WKT String (e.g. "POINT(139.7774 35.7141)")
    if (typeof loc === 'string' && loc.startsWith('POINT')) {
        const matches = loc.match(/\(([^)]+)\)/);
        if (matches) {
            const parts = matches[1].split(' ');
            return { coordinates: [parseFloat(parts[0]), parseFloat(parts[1])] };
        }
    }

    // Case 3: Standard object from PostGIS (Sometime it's {type: "Point", coordinates: [...]})
    if (loc.type === 'Point' && loc.coordinates) {
        return { coordinates: loc.coordinates as [number, number] };
    }

    return { coordinates: [0, 0] };
}

// L1: Location DNA
export interface CategoryCounts {
    // Broad Categories (Legacy/Aggregated)
    medical: number;
    shopping: number;
    dining: number;
    leisure: number;
    education: number;
    finance: number;

    // P1-1 Specific Counts (MVP Guide)
    convenience_count?: number;
    drugstore_count?: number;
    restaurant_count?: number;
    cafe_count?: number;
    shrine_count?: number;
    temple_count?: number;
    museum_count?: number;

    // Others
    nature?: number;
    religion?: number;
    accommodation?: number;
    workspace?: number;
    housing?: number;
}

// L2: Live Status
export interface LiveStatus {
    congestion: number; // 1-5
    line_status: {
        line: string;
        status: 'normal' | 'delay' | 'suspended';
        message?: string;
    }[];
    weather: {
        temp: number;
        condition: string;
        wind?: number;
    };
}

// L3: Service Facilities
export interface ServiceFacility {
    id: string;
    category: 'toilet' | 'charging' | 'locker' | 'wifi' | 'accessibility' | 'dining' | 'shopping' | 'leisure' | 'transport' | 'religion' | 'nature' | 'accommodation';
    subCategory: string;
    location: string; // e.g., "B1 North Exit"
    attributes: Record<string, any>;
}

// L4: Mobility Strategy
export interface ActionNudge {
    type: 'primary' | 'secondary';
    title: string;
    content: string;
    advice: string;
}

export interface NodeProfile {
    node_id: string;
    category_counts: CategoryCounts;
    vibe_tags: string[];
    l2_status?: LiveStatus;
    l3_facilities?: ServiceFacility[];
    l4_cards?: any[];
}

// Fetch nearby nodes
export async function fetchNearbyNodes(lat: number, lon: number, radiusMeters: number = 2000) {
    const { data, error } = await supabase
        .rpc('nearby_nodes', {
            user_lat: lat,
            user_lon: lon,
            radius_meters: radiusMeters
        });

    if (error) {
        console.error('Error fetching nearby nodes:', error);
        // Fallback to core stations if RPC fails
        return CORE_STATIONS_FALLBACK.filter(node => {
            const nodeLat = node.location.coordinates[1];
            const nodeLon = node.location.coordinates[0];
            // Simple rough distance check for fallback (approx 0.01 deg ~= 1km)
            return Math.abs(nodeLat - lat) < 0.05 && Math.abs(nodeLon - lon) < 0.05;
        });
    }

    // Enforce Multilingual Names & Polyfill is_hub
    const effectiveNodes = (data || []).map((n: any) => {
        const seed = SEED_NODES.find(s => s.id === n.id);
        const name = n.name || (seed ? seed.name : 'Station');

        // V3.0 Logic: ID parent_hub_id is null, it is a Hub.
        const isHub = !n.parent_hub_id;

        // Custom Map Design Overrides (Hardcoded for UI Consistency)
        let mapDesign = undefined;
        let tier = undefined;

        if (n.id.includes('Ueno')) {
            tier = 'major';
            mapDesign = { icon: 'park', color: '#F39700' };
        } else if (n.id.includes('Tokyo')) {
            tier = 'major';
            mapDesign = { icon: 'red_brick', color: '#E25822' }; // Marunouchi Red
        } else if (n.id.includes('Akihabara')) {
            tier = 'major';
            mapDesign = { icon: 'electric', color: '#FFE600' }; // Electric Yellow
        } else if (n.id.includes('Asakusa') && !n.id.includes('bashi')) { // Exclude Asakusabashi
            tier = 'major';
            mapDesign = { icon: 'lantern', color: '#D32F2F' }; // Lantern Red
        }

        return {
            ...n,
            name,
            is_hub: isHub,
            tier,
            mapDesign
        };
    });

    return effectiveNodes as NodeDatum[];
}

import { SEED_NODES } from '../nodes/seedNodes';

const CORE_STATIONS_FALLBACK = SEED_NODES.map(node => {
    // Parse coordinates if they are string (WKT)
    let coords = [0, 0];
    if (typeof node.location === 'string' && node.location.startsWith('POINT')) {
        const matches = node.location.match(/\(([^)]+)\)/);
        if (matches) {
            const parts = matches[1].split(' ');
            coords = [parseFloat(parts[0]), parseFloat(parts[1])];
        }
    } else if ((node.location as any).coordinates) {
        coords = (node.location as any).coordinates;
    }

    return {
        ...node,
        location: { coordinates: coords }
    };
});

// Mapping of Node IDs to their served lines (MVP Hardcoded for robustness)
const STATION_LINES: Record<string, { name: { ja: string, en: string, zh: string }, operator: 'Metro' | 'JR' | 'Toei' | 'Private', color: string }[]> = {
    // Ueno (Aggregated)
    'odpt:Station:TokyoMetro.Ueno': [
        { name: { ja: '銀座線', en: 'Ginza Line', zh: '銀座線' }, operator: 'Metro', color: '#FF9500' },
        { name: { ja: '日比谷線', en: 'Hibiya Line', zh: '日比谷線' }, operator: 'Metro', color: '#B5B5AC' },
        { name: { ja: '山手線', en: 'Yamanote Line', zh: '山手線' }, operator: 'JR', color: '#9ACD32' },
        { name: { ja: '京浜東北線', en: 'Keihin-Tohoku Line', zh: '京濱東北線' }, operator: 'JR', color: '#00BFFF' }
    ],
    // Tokyo
    'odpt:Station:JR-East.Tokyo': [
        { name: { ja: '山手線', en: 'Yamanote Line', zh: '山手線' }, operator: 'JR', color: '#9ACD32' },
        { name: { ja: '中央線', en: 'Chuo Line', zh: '中央線' }, operator: 'JR', color: '#FF4500' },
        { name: { ja: '丸ノ内線', en: 'Marunouchi Line', zh: '丸之內線' }, operator: 'Metro', color: '#F62E36' },
        { name: { ja: '東海道新幹線', en: 'Tokaido Shinkansen', zh: '東海道新幹線' }, operator: 'JR', color: '#1E90FF' }
    ],
    // Akihabara
    'odpt:Station:JR-East.Akihabara': [
        { name: { ja: '山手線', en: 'Yamanote Line', zh: '山手線' }, operator: 'JR', color: '#9ACD32' },
        { name: { ja: '総武線', en: 'Sobu Line', zh: '總武線' }, operator: 'JR', color: '#FFD700' },
        { name: { ja: '日比谷線', en: 'Hibiya Line', zh: '日比谷線' }, operator: 'Metro', color: '#B5B5AC' }
    ],
    // Ginza
    'odpt:Station:TokyoMetro.Ginza': [
        { name: { ja: '銀座線', en: 'Ginza Line', zh: '銀座線' }, operator: 'Metro', color: '#FF9500' },
        { name: { ja: '丸ノ内線', en: 'Marunouchi Line', zh: '丸之內線' }, operator: 'Metro', color: '#F62E36' },
        { name: { ja: '日比谷線', en: 'Hibiya Line', zh: '日比谷線' }, operator: 'Metro', color: '#B5B5AC' }
    ],
    // Asakusa
    'odpt:Station:TokyoMetro.Asakusa': [
        { name: { ja: '銀座線', en: 'Ginza Line', zh: '銀座線' }, operator: 'Metro', color: '#FF9500' },
        { name: { ja: '浅草線', en: 'Asakusa Line', zh: '淺草線' }, operator: 'Toei', color: '#E85298' },
        { name: { ja: 'スカイツリーライン', en: 'Skytree Line', zh: '晴空塔線' }, operator: 'Private', color: '#0F2350' }
    ]
};

// Internal Node ID to ODPT Station ID Mapping
const NODE_TO_ODPT: Record<string, string> = {
    'odpt:Station:TokyoMetro.Ueno': 'odpt.Station:TokyoMetro.Ginza.Ueno',
    'odpt:Station:TokyoMetro.Asakusa': 'odpt.Station:TokyoMetro.Ginza.Asakusa',
    'odpt:Station:JR-East.Akihabara': 'odpt.Station:TokyoMetro.Hibiya.Akihabara',
    'odpt:Station:JR-East.Tokyo': 'odpt.Station:TokyoMetro.Marunouchi.Tokyo',
    'odpt:Station:TokyoMetro.Ginza': 'odpt.Station:TokyoMetro.Ginza.Ginza',
    'odpt:Station:Toei.Kuramae': 'odpt.Station:Toei.Asakusa.Kuramae',
    'odpt:Station:Toei.ShinOkachimachi': 'odpt.Station:Toei.Oedo.ShinOkachimachi',
    'odpt:Station:Toei.Ningyocho': 'odpt.Station:TokyoMetro.Hibiya.Ningyocho',
    'odpt:Station:JR-East.Kanda': 'odpt.Station:TokyoMetro.Ginza.Kanda',
    'odpt:Station:Toei.Nihombashi': 'odpt.Station:TokyoMetro.Ginza.Nihombashi',
    'odpt:Station:TokyoMetro.Mitsukoshimae': 'odpt.Station:TokyoMetro.Ginza.Mitsukoshimae',
    'odpt:Station:Toei.HigashiGinza': 'odpt.Station:TokyoMetro.Hibiya.HigashiGinza'
};

// Mapping of ODPT Station IDs to Coordinates (MVP Core 14 Stations + Key Hubs)
export const STATION_MAP: Record<string, { lat: number; lon: number }> = {
    'odpt.Station:TokyoMetro.Ginza.Ueno': { lat: 35.7141, lon: 139.7774 },
    'odpt.Station:TokyoMetro.Hibiya.Ueno': { lat: 35.7141, lon: 139.7774 },
    'odpt.Station:JR-East.Yamanote.Ueno': { lat: 35.7141, lon: 139.7774 },
    'odpt.Station:TokyoMetro.Ginza.Asakusa': { lat: 35.7112, lon: 139.7963 },
    'odpt.Station:Toei.Asakusa.Asakusa': { lat: 35.7112, lon: 139.7963 },
    'odpt.Station:TokyoMetro.Hibiya.Akihabara': { lat: 35.6984, lon: 139.7731 },
    'odpt.Station:JR-East.Yamanote.Akihabara': { lat: 35.6984, lon: 139.7731 },
    'odpt.Station:TokyoMetro.Marunouchi.Tokyo': { lat: 35.6812, lon: 139.7671 },
    'odpt.Station:JR-East.Yamanote.Tokyo': { lat: 35.6812, lon: 139.7671 },
    'odpt.Station:TokyoMetro.Ginza.Ginza': { lat: 35.6717, lon: 139.7636 },
    'odpt.Station:Toei.Asakusa.Kuramae': { lat: 35.7019, lon: 139.7867 },
    'odpt.Station:Toei.Oedo.ShinOkachimachi': { lat: 35.7073, lon: 139.7793 },
    'odpt.Station:TokyoMetro.Ginza.Kanda': { lat: 35.6918, lon: 139.7709 },
    'odpt.Station:TokyoMetro.Marunouchi.Otemachi': { lat: 35.6867, lon: 139.7639 }
};

// Helper to determine operator from ID
function getOperatorFromId(nodeId: string): string | null {
    if (nodeId.includes('TokyoMetro')) return 'TokyoMetro';
    if (nodeId.includes('Toei')) return 'Toei';
    if (nodeId.includes('JR-East')) return 'JR-East';
    return null;
}

// Fetch single node with profile (Enhanced with Real-time)
export async function fetchNodeConfig(nodeId: string) {
    const { data: node, error: nodeError } = await supabase
        .from('nodes')
        .select('*')
        .eq('id', nodeId)
        .single();

    let finalNode = node;
    let finalProfile = null;

    if (nodeError) {
        console.warn(`Node fetch failed for ${nodeId}, checking fallbacks...`);
        // Try to find in CORE_STATIONS_FALLBACK
        const fallbackNode = CORE_STATIONS_FALLBACK.find(n => n.id === nodeId || nodeId.includes(n.name.en));
        if (fallbackNode) {
            finalNode = {
                ...fallbackNode,
                location: { type: 'Point', coordinates: fallbackNode.location.coordinates }
            };
        }
    }

    const { data: profile, error: profileError } = await supabase
        .from('node_facility_profiles')
        .select('*')
        .eq('node_id', nodeId)
        .single();

    finalProfile = profile;

    // Use profile directly, no mock merging
    let enrichedProfile = finalProfile
        ? { ...finalProfile, node_id: nodeId }
        : { node_id: nodeId, l1_categories: [] };

    // [New] Merge Static L1 Data if DB is empty
    const wisdomId = NODE_TO_ODPT[nodeId] || nodeId;

    // Ensure l1_categories exists
    if (!enrichedProfile.l1_categories || enrichedProfile.l1_categories.length === 0) {
        // Try to find static data using Node ID or ODPT ID
        const staticData = STATIC_L1_DATA[nodeId] || STATIC_L1_DATA[wisdomId];
        enrichedProfile.l1_categories = staticData || [];
    }

    // [New] L3 Data Strategy: DB (stations_static) > Wisdom File
    const odptId = NODE_TO_ODPT[nodeId];

    // 1. Try Fetching from DB (stations_static)
    let dbL3Facilities = null;
    if (odptId) {
        const { data: staticDbData } = await supabase
            .from('stations_static')
            .select('l3_services')
            .eq('station_id', odptId) // Try ODPT ID first (Migration used this)
            .maybeSingle();

        if (staticDbData && Array.isArray(staticDbData.l3_services) && staticDbData.l3_services.length > 0) {
            dbL3Facilities = staticDbData.l3_services;
        } else {
            // Fallback: Try Node ID if ODPT failed (Robustness)
            const { data: staticDbDataNode } = await supabase
                .from('stations_static')
                .select('l3_services')
                .eq('station_id', nodeId)
                .maybeSingle();

            if (staticDbDataNode && Array.isArray(staticDbDataNode.l3_services)) {
                dbL3Facilities = staticDbDataNode.l3_services;
            }
        }
    }

    // 2. Resolve Wisdom Source (File)
    // STATION_WISDOM uses internal Node IDs (e.g. 'odpt:Station:TokyoMetro.Ueno')
    // But wisdomId might be mapped to ODPT ID (e.g. 'odpt.Station:TokyoMetro.Ginza.Ueno')
    // We check both to be safe.
    const wisdom = STATION_WISDOM[wisdomId] || STATION_WISDOM[nodeId];

    // 3. Determine Final L3 Data
    let finalL3 = dbL3Facilities || (wisdom ? wisdom.l3Facilities : []);

    if (finalL3 && finalL3.length > 0) {
        // Map StationFacility to ServiceFacility format
        const wisdomFacilities = finalL3.map((f: any, idx: number) => {
            // [Localization] Handle both string (legacy) and object (multilingual) formats
            const rawLoc = f.location || {};
            const locObj = (typeof rawLoc === 'string')
                ? { 'zh-TW': rawLoc, 'en': rawLoc, 'ja': rawLoc, 'zh': rawLoc }
                : {
                    'zh-TW': rawLoc.zh || rawLoc['zh-TW'] || 'N/A',
                    'en': rawLoc.en || 'N/A',
                    'ja': rawLoc.ja || 'N/A',
                    'zh': rawLoc.zh || rawLoc['zh-TW'] || 'N/A'
                };

            return {
                id: `${nodeId}-l3-${idx}`,
                type: f.type, // Map to correct property for UI Icons
                category: f.type, // Keep for legacy if needed
                subCategory: 'standard',
                location: f.location, // Keep raw for reference if needed, or rely on 'name' below which is used for display
                // [UI Optimization] Split Name and Description to avoid duplication
                name: locObj, // Use the localized object for the name/location display
                direction: { 'zh-TW': `${f.operator || ''} ${f.floor || ''}`, 'en': `${f.operator || ''} ${f.floor || ''}`, 'ja': `${f.operator || ''} ${f.floor || ''}` },
                attributes: {
                    ...f.attributes,
                    floor: f.floor,
                    operator: f.operator,
                    source: f.source
                }
            };
        });

        enrichedProfile.l3_facilities = wisdomFacilities;
    }

    // [New] Inject External Links (e.g. Toilet Vacancy)
    if (wisdom && wisdom.links) {
        enrichedProfile.external_links = wisdom.links;
    }

    // --- L4: BAMBI STRATEGY GENERATION (Real Data) ---
    const l4_cards: any[] = [];

    if (wisdom) {
        // 1. Map TRAPS to Primary Cards
        if (wisdom.traps) {
            wisdom.traps.forEach((trap, idx) => {
                const cardId = `trap-${idx}`;
                l4_cards.push({
                    id: cardId,
                    type: 'primary',
                    title: { ja: trap.title, en: trap.title, zh: trap.title }, // Fallback to same string
                    description: {
                        ja: `${trap.content}\n\n${trap.advice}`,
                        en: `${trap.content}\n\n${trap.advice}`,
                        zh: `${trap.content}\n\n${trap.advice}`
                    },
                    actionLabel: { ja: '確認', en: 'Got it', zh: '了解' },
                    actionUrl: null,
                    icon: 'alert-triangle'
                });
            });
        }

        // 2. Map HACKS to Secondary Cards
        if (wisdom.hacks) {
            wisdom.hacks.forEach((hack, idx) => {
                // Extract emoji if present
                const emojiMatch = hack.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})/u);
                const icon = emojiMatch ? emojiMatch[0] : 'lightbulb';

                // Clean content (remove bold markdown for plain text preview if needed, but UI might support md)
                // For now keep as is.

                l4_cards.push({
                    id: `hack-${idx}`,
                    type: 'secondary',
                    title: { ja: 'Tips', en: 'Tips', zh: '小撇步' },
                    description: { ja: hack, en: hack, zh: hack },
                    actionLabel: { ja: '詳細', en: 'More', zh: '查看' },
                    actionUrl: null,
                    icon: 'star'
                });
            });
        }
    }

    // 3. Fallback: Accessibility Card if no specific wisdom but facility exists
    if (l4_cards.length === 0) {
        // Check if we have elevator info in L3 (which we just populated or merged)
        const hasElevator = enrichedProfile.l3_facilities?.some((f: any) => f.category === 'elevator' || f.category === 'accessibility');

        if (hasElevator) {
            l4_cards.push({
                id: 'fallback-access',
                type: 'secondary',
                title: { ja: 'バリアフリー情報', en: 'Accessibility', zh: '無障礙情報' },
                description: {
                    ja: 'この駅はエレベーターが設置されています。詳細は施設タブを確認してください。',
                    en: 'Elevator available. Check Facility tab for details.',
                    zh: '此車站設有電梯。詳情請查看設施頁籤。'
                },
                actionLabel: { ja: '確認', en: 'Check', zh: '確認' },
                actionUrl: null,
                icon: 'accessibility'
            });
        }
    }

    // Inject L4 Cards
    enrichedProfile.l4_cards = l4_cards;

    // --- REAL-TIME STATUS INJECTION (Database First) ---

    // [Fix] Initialize with Default "Normal" Status first to strictly prevent empty UI
    const servedLines = STATION_LINES[nodeId] || [
        { name: { ja: '交通', en: 'Transit', zh: '交通' }, operator: 'Private', color: '#9ca3af' }
    ];

    enrichedProfile.l2_status = {
        congestion: 2,
        line_status: servedLines.map(line => ({
            line: line.name.en,
            name: line.name,
            operator: line.operator,
            color: line.color,
            status: 'normal'
        })),
        weather: { temp: 20, condition: 'Clear' }
    };

    // Try to get L2 data from our internal API (which queries transit_dynamic_snapshot)
    try {
        if (typeof window !== 'undefined') {
            const l2Res = await fetch(`/api/l2/status?station_id=${nodeId}`);
            if (l2Res.ok) {
                const l2Data = await l2Res.json();
                if (l2Data) {
                    enrichedProfile.l2_status = l2Data;
                    console.log(`[L2] Applied real-time data for ${nodeId}`, l2Data);
                }
            }
        } else {
            // Server-side fetch (Direct DB or internal call if needed, but for now we rely on client or pre-fetch)
            // Ideally, this function should be async and do direct DB if server-side.
            // But let's keep consistent with existing pattern. 
            // Correction: fetchNodeConfig is likely server-side.
            // Let's implement direct DB lookup here for server-side robustness.
            const { data: l2Data } = await supabase
                .from('transit_dynamic_snapshot')
                .select('*')
                .eq('station_id', nodeId) // Try Logical ID first
                .maybeSingle();

            if (l2Data) {
                // Map status to ALL lines (MVP Assumption: Station delay = All lines delay unless specified)
                // In a real system, we'd check per-line status if available.
                const isStationDelay = l2Data.status_code === 'DELAY';

                enrichedProfile.l2_status = {
                    congestion: isStationDelay ? 4 : (l2Data.crowd_level || 2),
                    line_status: servedLines.map(line => ({
                        line: line.name.en, // Legacy string ID
                        name: line.name,    // Rich Object
                        operator: line.operator,
                        color: line.color,
                        status: isStationDelay ? 'delay' : 'normal',
                        message: isStationDelay ? l2Data.reason_ja : undefined // Assuming reason_ja holds the delay msg
                    })),
                    weather: {
                        temp: l2Data.weather_info?.temp || 0,
                        condition: l2Data.weather_info?.condition || 'Unknown'
                    }
                };
            } else if (odptId) {
                // Try Physical ID if Logical failed
                const { data: l2DataPhy } = await supabase
                    .from('transit_dynamic_snapshot')
                    .select('*')
                    .eq('station_id', odptId)
                    .maybeSingle();

                if (l2DataPhy) {
                    const isStationDelay = l2DataPhy.status_code === 'DELAY';
                    enrichedProfile.l2_status = {
                        congestion: isStationDelay ? 4 : (l2DataPhy.crowd_level || 2),
                        line_status: servedLines.map(line => ({
                            line: line.name.en,
                            name: line.name,
                            operator: line.operator,
                            color: line.color,
                            status: isStationDelay ? 'delay' : 'normal',
                            message: isStationDelay ? l2DataPhy.reason_ja : undefined
                        })),
                        weather: {
                            temp: l2DataPhy.weather_info?.temp || 0,
                            condition: l2DataPhy.weather_info?.condition || 'Unknown'
                        }
                    };
                }
            }
        }
    } catch (e) {
        console.warn('Failed to inject real-time L2 data', e);
    }
    // --- END REAL-TIME INJECTION ---

    if (!finalNode) {
        return { node: null, profile: null, error: 'Node not found' };
    }

    return {
        node: { ...finalNode, location: parseLocation(finalNode.location) },
        profile: enrichedProfile,
        error: null
    };
}



// Fetch logic for specific zones (e.g., get all Hubs in a city)
export async function fetchCityHubs(cityId: string) {
    const { data, error } = await supabase
        .from('nodes')
        .select('*')
        .eq('city_id', cityId)
        .eq('is_hub', true);

    if (error) {
        console.error('Error fetching city hubs:', error);
        return [];
    }
    return data;
}

// Fetch ALL nodes for manual map exploration (Using large radius from Tokyo center)
export async function fetchAllNodes() {
    // 35.6895, 139.6917 is Tokyo Station
    // 50000 meters = 50km radius covers all of Tokyo + suburbs
    const { data, error } = await supabase
        .rpc('nearby_nodes', {
            user_lat: 35.6895,
            user_lon: 139.6917,
            radius_meters: 50000
        });

    if (error) {
        console.error('Error fetching nodes from RPC, using hardcoded fallback:', error);
        return CORE_STATIONS_FALLBACK.map(n => {
            let mapDesign = undefined;
            let tier = undefined;

            if (n.id.includes('Ueno')) {
                tier = 'major';
                mapDesign = { icon: 'park', color: '#F39700' };
            } else if (n.id.includes('Tokyo')) {
                tier = 'major';
                mapDesign = { icon: 'red_brick', color: '#E25822' };
            } else if (n.id.includes('Akihabara')) {
                tier = 'major';
                mapDesign = { icon: 'electric', color: '#FFE600' };
            } else if (n.id.includes('Asakusa') && !n.id.includes('bashi')) {
                tier = 'major';
                mapDesign = { icon: 'lantern', color: '#D32F2F' };
            }

            return {
                ...n,
                location: parseLocation(n.location),
                tier,
                mapDesign,
                is_hub: !(n as any).parent_hub_id
            };
        }) as any[];
    }

    // [New] Fetch Real-time L2 Data for ALL nodes efficiently
    let l2Map: Record<string, any> = {};
    try {
        const { data: l2Data } = await supabase
            .from('transit_dynamic_snapshot')
            .select('*')
            // Fetch last 20 mins to ensure freshness (or fallback to empty)
            .gt('updated_at', new Date(Date.now() - 20 * 60 * 1000).toISOString());

        if (l2Data) {
            l2Data.forEach((row: any) => {
                l2Map[row.station_id] = {
                    congestion: row.status_code === 'DELAY' ? 4 : 2,
                    line_status: row.status_code === 'DELAY'
                        ? [{ line: 'Transit', status: 'delay', message: row.reason_ja }]
                        : [{ line: 'Transit', status: 'normal' }],
                    weather: {
                        temp: row.weather_info?.temp || 0,
                        condition: row.weather_info?.condition || 'Unknown',
                        wind: row.weather_info?.wind || 0
                    }
                };
            });
        }
    } catch (e) {
        console.warn('L2 Bulk Fetch Failed', e);
    }

    // Build Reverse Map (ODPT ID -> Node ID) for matching
    const ODPT_TO_NODE: Record<string, string> = {};
    Object.entries(NODE_TO_ODPT).forEach(([nodeId, odptId]) => {
        ODPT_TO_NODE[odptId] = nodeId;
    });

    return (data as any[] || []).filter(Boolean).map(n => {
        const seed = SEED_NODES.find(s => s.id === n.id);

        // Try to find L2 data using:
        // 1. Direct ID match (if n.id is the logical ID)
        // 2. Reverse Mapped ID (if n.id is the physical ODPT ID)
        const logicalId = (n?.id && ODPT_TO_NODE[n.id]) || n?.id;
        const l2 = l2Map[logicalId];

        // Custom Map Design Overrides (Hardcoded for UI Consistency)
        let mapDesign = undefined;
        let tier = undefined;

        if (n?.id?.includes('Ueno')) {
            tier = 'major';
            mapDesign = { icon: 'park', color: '#F39700' };
        } else if (n?.id?.includes('Tokyo')) {
            tier = 'major';
            mapDesign = { icon: 'red_brick', color: '#E25822' }; // Marunouchi Red
        } else if (n?.id?.includes('Akihabara')) {
            tier = 'major';
            mapDesign = { icon: 'electric', color: '#FFE600' }; // Electric Yellow
        } else if (n?.id?.includes('Asakusa') && !n?.id?.includes('bashi')) { // Exclude Asakusabashi
            tier = 'major';
            mapDesign = { icon: 'lantern', color: '#D32F2F' }; // Lantern Red
        }

        return {
            ...n,
            name: seed ? seed.name : n?.name,
            location: parseLocation(n?.location),
            is_hub: !n.parent_hub_id, // Ensure is_hub is set (V3.0 Logic)
            tier,
            mapDesign,
            // Inject L2 Status into the node object (or facility_profile)
            facility_profile: {
                ...(n.facility_profile || {}),
                l2_status: l2 || null
            }
        };
    }) as NodeDatum[];
}
