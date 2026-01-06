import { supabase } from '../supabase';
import { STATION_WISDOM } from '../../data/stationWisdom';
import { STATIC_L1_DATA, L1_NAME_INDEX } from '../../data/staticL1Data';
import { STATION_LINES, getStationIdVariants, guessPhysicalOdptStationIds, resolveHubStationMembers } from '@/lib/constants/stationLines';
import { L1_DNA_Data, L3Facility, StationUIProfile, LocaleString, ActionCard } from '@/lib/types/stationStandard';

// Types aligning with DB schema
// Version 2.0: Added version control for cache invalidation
// Version 3.0: Added data_hash for change detection

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
    // Version control fields
    updated_at?: number;  // Unix timestamp (milliseconds) for version control
    version?: number;     // Incremental version number
    data_hash?: string;   // SHA-256 hash of node data for change detection
    ward_id?: string;     // Ward/行政區 ID for ward-based node grouping
}

/**
 * Ensures location is always a GeoJSON-like object { coordinates: [lon, lat] }
 * Handles: WKT strings, Objects with coordinates, or raw DB geography format
 */
export function parseLocation(loc: any): { coordinates: [number, number] } {
    if (!loc) return { coordinates: [0, 0] };

    if (Array.isArray(loc) && loc.length >= 2) {
        return { coordinates: [Number(loc[0]), Number(loc[1])] };
    }

    if (loc.coordinates?.coordinates && Array.isArray(loc.coordinates.coordinates)) {
        return { coordinates: [loc.coordinates.coordinates[0], loc.coordinates.coordinates[1]] };
    }

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

function normalizeNodeRow(n: any) {
    // Standardize node type: Prioritize DB schema node_type, convert to lowercase
    const type = String(n?.node_type ?? n?.type ?? 'station').toLowerCase();
    const location = parseLocation(n?.location ?? n?.coordinates);

    // Unified is_hub logic: Prioritize explicit value, otherwise check parent_hub_id
    const explicitIsHub = n?.is_hub;
    const isHub = typeof explicitIsHub === 'boolean'
        ? explicitIsHub
        : (n?.parent_hub_id === null || n?.parent_hub_id === undefined);

    // Parse version control fields
    // updated_at: Unix timestamp (milliseconds) from DB or ISO string
    let updatedAt: number | undefined;
    if (n?.updated_at) {
        if (typeof n.updated_at === 'number') {
            updatedAt = n.updated_at;
        } else if (typeof n.updated_at === 'string') {
            // Convert ISO string to Unix timestamp
            updatedAt = new Date(n.updated_at).getTime();
        }
    }

    return {
        ...n,
        type,
        location,
        is_hub: isHub,
        geohash: typeof n?.geohash === 'string' ? n.geohash : String(n?.geohash ?? ''),
        city_id: typeof n?.city_id === 'string' ? n.city_id : String(n?.city_id ?? ''),
        zone: typeof n?.zone === 'string' ? n.zone : String(n?.zone ?? 'core'),
        // Version control fields
        version: typeof n?.version === 'number' ? n.version : (n?.version ?? undefined),
        updated_at: updatedAt,
        data_hash: typeof n?.data_hash === 'string' ? n.data_hash : (n?.data_hash ?? undefined),
        // Ward ID for ward-based node grouping
        ward_id: typeof n?.ward_id === 'string' ? n.ward_id : (n?.ward_id ?? undefined)
    };
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
    updated_at?: string;
}

// L3: Service Facilities - Deprecated in favor of L3Facility
// export interface ServiceFacility { ... }

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
    vibe_tags: string[] | Record<string, any>; // Allow raw JSONB or string[]
    l2_status?: LiveStatus;
    l3_facilities?: L3Facility[];
    l4_cards?: ActionCard[];
    l1_dna?: L1_DNA_Data;
    external_links?: { title: LocaleString; url: string; icon?: string; bg?: string; tracking_id?: string; type?: string }[];
}

// Fetch nearby nodes
export async function fetchNearbyNodes(lat: number, lon: number, radiusMeters: number = 2000) {
    try {
        let data: any = null;
        let error: any = null;

        ({ data, error } = await supabase
            .rpc('nearby_nodes_v2', {
                center_lat: lat,
                center_lon: lon,
                radius_meters: radiusMeters,
                max_results: 25
            }));

        if (error) {
            ({ data, error } = await supabase
                .rpc('nearby_nodes', {
                    center_lat: lat,
                    center_lon: lon,
                    radius_meters: radiusMeters
                }));
        }

        if (error) {
            console.error('Error fetching nearby nodes:', error);
            return getFallbackNearbyNodes(lat, lon);
        }

        // Enforce Multilingual Names & Polyfill is_hub
        return (data || []).map((n: any) => enrichNodeData(normalizeNodeRow(n)));
    } catch (err) {
        console.warn('[fetchNearbyNodes] Using fallback due to error:', err);
        return getFallbackNearbyNodes(lat, lon);
    }
}

function getFallbackNearbyNodes(lat: number, lon: number) {
    return CORE_STATIONS_FALLBACK.filter(node => {
        const nodeLat = node.location.coordinates[1];
        const nodeLon = node.location.coordinates[0];
        // Simple rough distance check for fallback (approx 0.01 deg ~= 1km)
        return Math.abs(nodeLat - lat) < 0.05 && Math.abs(nodeLon - lon) < 0.05;
    }).map(n => {
        // Apply normalization first
        const normalized = normalizeNodeRow(n);
        // Then enrich
        return enrichNodeData(normalized);
    });
}

function enrichNodeData(n: any) {
    const seed = SEED_NODES.find(s => s.id === n.id);
    const name = n.name || (seed ? seed.name : 'Station');

    // V3.0 Logic: ID parent_hub_id is null, it is a Hub.
    const isHub = !n.parent_hub_id;

    // Custom Map Design Overrides
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
        name,
        is_hub: isHub,
        tier,
        mapDesign
    };
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
// Internal Node ID to ODPT Station ID Mapping

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

export function resolveRepresentativeOdptStationId(stationId: string): string | null {
    if (!stationId) return null;

    const isLineQualified = (id: string) => {
        if (!id.startsWith('odpt.Station:')) return false;
        const rest = id.replace(/^odpt\.Station:/, '');
        return rest.split('.').length >= 3;
    };

    if (stationId.startsWith('odpt.Station:')) {
        if (isLineQualified(stationId)) return stationId;

        const guessed = guessPhysicalOdptStationIds(stationId.replace(/^odpt\.Station:/, 'odpt:Station:'));
        if (guessed.length > 0) return guessed[0];

        const members = resolveHubStationMembers(stationId);
        for (const id of members) {
            if (typeof id === 'string' && isLineQualified(id)) return id;
        }
        return stationId;
    }

    const mapped = NODE_TO_ODPT[stationId];
    if (mapped) return mapped;

    const members = resolveHubStationMembers(stationId);
    for (const id of members) {
        if (typeof id === 'string' && isLineQualified(id)) return id;
    }

    const guessed = guessPhysicalOdptStationIds(stationId);
    if (guessed.length > 0) return guessed[0];

    return null;
}

export function buildStationIdSearchCandidates(stationId: string): string[] {
    const ids = new Set<string>();
    const add = (id: string | null | undefined) => {
        if (!id) return;
        for (const v of getStationIdVariants(id)) ids.add(v);
    };

    add(stationId);

    for (const id of resolveHubStationMembers(stationId)) add(id);

    for (const physical of guessPhysicalOdptStationIds(stationId)) {
        add(physical);
        for (const member of resolveHubStationMembers(physical)) add(member);
    }

    const rep = resolveRepresentativeOdptStationId(stationId);
    add(rep);
    if (rep) {
        for (const member of resolveHubStationMembers(rep)) add(member);
    }

    return Array.from(ids);
}

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
    'odpt.Station:TokyoMetro.Marunouchi.Otemachi': { lat: 35.6867, lon: 139.7639 },
    'odpt.Station:Toei.Asakusa.Oshiage': { lat: 35.7107, lon: 139.8127 },
    'odpt.Station:TokyoMetro.Hanzomon.Oshiage': { lat: 35.7107, lon: 139.8127 },
    'odpt.Station:TokyoMetro.Hibiya.Ningyocho': { lat: 35.6861, lon: 139.7822 },
    'odpt.Station:Toei.Asakusa.Ningyocho': { lat: 35.6861, lon: 139.7822 },
    'odpt.Station:TokyoMetro.Ginza.Nihombashi': { lat: 35.6817, lon: 139.7745 },
    'odpt.Station:Toei.Asakusa.Nihombashi': { lat: 35.6817, lon: 139.7745 }
};

// Helper to determine operator from ID
function getOperatorFromId(nodeId: string): string | null {
    if (nodeId.includes('TokyoMetro')) return 'TokyoMetro';
    if (nodeId.includes('Toei')) return 'Toei';
    if (nodeId.includes('JR-East')) return 'JR-East';
    return null;
}

function extractStationSlug(id: string): string {
    if (!id) return '';
    const lastDot = id.split('.').pop() || '';
    if (lastDot && !lastDot.includes(':')) return lastDot;
    return id.split(':').pop() || '';
}

export function findFallbackNodeForId(nodeId: string) {
    const slug = extractStationSlug(nodeId);
    if (!slug) return null;

    const operator = getOperatorFromId(nodeId);
    const candidates = CORE_STATIONS_FALLBACK.filter(n => extractStationSlug(n.id) === slug);
    if (candidates.length === 0) return null;

    if (operator) {
        const sameOperator = candidates.find(n => n.id.includes(operator));
        if (sameOperator) return sameOperator;
    }

    return candidates[0];
}

// Fetch single node with profile (Enhanced with Real-time)
export async function fetchNodeConfig(nodeId: string) {
    let finalNode: any = null;
    let finalProfile: any = null;

    let hubNode: any = null;
    let hubId: string | null = null;

    try {
        const { data: node, error: nodeError } = await supabase
            .from('nodes')
            .select('*')
            .eq('id', nodeId)
            .single();

        if (nodeError) throw nodeError;
        finalNode = node;
    } catch (err) {
        console.warn(`[fetchNodeConfig] Node fetch failed for ${nodeId}, using fallback:`, err);
        const fallbackNode = findFallbackNodeForId(nodeId);
        if (fallbackNode) {
            finalNode = {
                ...fallbackNode,
                location: { type: 'Point', coordinates: fallbackNode.location.coordinates }
            };
        }
    }

    hubId = finalNode?.parent_hub_id || null;
    let childNodes: any[] = [];

    // Unified is_hub logic: Prioritize explicit value
    const isNodeHub = typeof finalNode?.is_hub === 'boolean'
        ? finalNode.is_hub
        : !hubId;



    if (hubId) {
        // Case 1: Child Node -> Fetch Parent
        try {
            const { data: parent } = await supabase
                .from('nodes')
                .select('*')
                .eq('id', hubId)
                .maybeSingle();

            if (parent) hubNode = parent;
        } catch {
            hubNode = null;
        }
    } else if (isNodeHub) {
        // Case 2: Hub Node -> Fetch Children for Aggregation

        try {
            const { data: children, error } = await supabase
                .from('nodes')
                .select('*')
                .eq('parent_hub_id', nodeId);


            if (children) {
                childNodes = children;
                children.forEach((c: any) => {

                });
            }
        } catch (err) {
            console.warn('[fetchNodeConfig] Failed to fetch child nodes for hub aggregation:', err);
        }
    }

    // Initialize enriched profile structure
    let enrichedProfile: NodeProfile = {
        node_id: nodeId,
        category_counts: {
            medical: 0, shopping: 0, dining: 0, leisure: 0, education: 0, finance: 0
        },
        vibe_tags: [],
        l3_facilities: [],
        l4_cards: []
    };

    // 1. Populate L1 Data
    // Logic: 
    // - If Child: Merge Self + Parent (Hub)
    // - If Hub: Merge Self + All Children (Aggregation)

    const nodesToMerge = [hubNode, finalNode, ...childNodes].filter(Boolean);

    nodesToMerge.forEach(n => {
        // Merge Category Counts
        if (n?.facility_profile?.category_counts) {
            const counts = n.facility_profile.category_counts;
            Object.keys(counts).forEach(k => {
                const key = k as keyof CategoryCounts;
                const val = counts[key] || 0;
                if (typeof val === 'number') {
                    // Initialize if undefined (for custom keys)
                    if (typeof (enrichedProfile.category_counts as any)[key] === 'undefined') {
                        (enrichedProfile.category_counts as any)[key] = 0;
                    }
                    (enrichedProfile.category_counts as any)[key] += val;
                }
            });
        }

        // Merge Vibe Tags
        if (n?.vibe_tags) {
            const tags = Array.isArray(n.vibe_tags) ? n.vibe_tags : [];
            // Add unique tags
            tags.forEach((t: string) => {
                if (typeof t === 'string' && !(enrichedProfile.vibe_tags as string[]).includes(t)) {
                    (enrichedProfile.vibe_tags as string[]).push(t);
                }
            });
        }
    });

    // 2. Fetch L3 Facilities from `l3_facilities` table
    try {
        // Gather all relevant IDs: Self, Parent (if any), Children (if any)
        const stationIds = new Set<string>();
        if (nodeId) stationIds.add(nodeId);
        if (hubId) stationIds.add(hubId);
        childNodes.forEach(c => stationIds.add(c.id));

        const { data: facilities, error: facilityError } = await supabase
            .from('l3_facilities')
            .select('*')
            .in('station_id', Array.from(stationIds));

        if (facilityError) {
            console.warn('[fetchNodeConfig] L3 fetch failed:', facilityError);
        } else if (facilities) {
            enrichedProfile.l3_facilities = facilities.map((f: any) => {
                // Parse location if it's JSON, otherwise treat as string
                const locVal = typeof f.name_i18n === 'object' ? f.name_i18n : (f.location || 'Station');
                const locObj: LocaleString = (typeof locVal === 'string')
                    ? { ja: locVal, en: locVal, zh: locVal }
                    : { ja: locVal.ja || locVal.en, en: locVal.en || locVal.ja, zh: locVal.zh || locVal.ja };

                return {
                    id: f.id,
                    type: f.type,
                    name: locObj,
                    location: locObj, // Use same for now, or fetch distinct location field
                    attributes: {
                        ...f.attributes,
                        subCategory: f.attributes?.sub_category || f.type
                    }
                } as L3Facility;
            });
        }
    } catch (err) {
        console.warn('[fetchNodeConfig] L3 fetch error:', err);
    }


    // [New] Merge Static L1 Data if DB is empty
    const wisdomKeys: string[] = [];
    const baseKey = NODE_TO_ODPT[nodeId] || nodeId;
    wisdomKeys.push(baseKey);
    wisdomKeys.push(nodeId);

    if (hubId) {
        wisdomKeys.push(NODE_TO_ODPT[hubId] || hubId);
        wisdomKeys.push(hubId);
    }

    let wisdom: any = null;
    for (const key of wisdomKeys) {
        const hit = (STATION_WISDOM as any)[key];
        if (hit) {
            wisdom = hit;
            break;
        }
    }

    if (!enrichedProfile.l1_dna) {
        let staticData: any = null;
        const l1Keys = new Set<string>();

        const addL1Key = (id: string | null | undefined) => {
            if (!id) return;
            for (const v of buildStationIdSearchCandidates(id)) l1Keys.add(v);
        };

        wisdomKeys.forEach(addL1Key);

        // Method 1: ID-based lookup
        for (const key of l1Keys) {
            const hit = (STATIC_L1_DATA as any)[key];
            if (hit) {
                staticData = hit;
                break;
            }
        }

        // Method 2: Name-based lookup fallback (for OSM-based stations)
        if (!staticData && finalNode?.name) {
            const nameVariants: string[] = [];
            if (typeof finalNode.name === 'string') {
                nameVariants.push(finalNode.name);
            } else if (typeof finalNode.name === 'object') {
                if (finalNode.name.ja) nameVariants.push(finalNode.name.ja);
                if (finalNode.name.en) nameVariants.push(finalNode.name.en);
            }

            for (const name of nameVariants) {
                // Try direct name lookup
                const clusterId = L1_NAME_INDEX[name];
                if (clusterId) {
                    const hit = (STATIC_L1_DATA as any)[clusterId];
                    if (hit) {
                        staticData = hit;
                        break;
                    }
                }
            }
        }

        enrichedProfile.l1_dna = staticData || null;
    }

    // [New] L3 Data Strategy: DB (stations_static) > Wisdom File
    let dbL3Facilities: any[] | null = [];
    const l3StationIds = Array.from(
        new Set([
            ...buildStationIdSearchCandidates(nodeId),
            ...(hubId ? buildStationIdSearchCandidates(hubId) : [])
        ])
    );

    try {
        const { data: staticDbData } = await supabase
            .from('stations_static')
            .select('l3_services')
            .in('id', l3StationIds);

        if (staticDbData) {
            staticDbData.forEach((row: any) => {
                if (Array.isArray(row.l3_services) && row.l3_services.length > 0) {
                    if (!dbL3Facilities) dbL3Facilities = [];
                    dbL3Facilities = [...dbL3Facilities, ...row.l3_services];
                }
            });
        }
    } catch (err) {
        console.warn(`[fetchNodeConfig] L3 DB fetch failed for ${nodeId}`, err);
    }

    // Fallback if aggregation turned up nothing (ensure null if truly empty so fallback logic works if applicable)
    if (dbL3Facilities && dbL3Facilities.length === 0) {
        dbL3Facilities = null;
    }



    // 3. Determine Final L3 Data
    let finalL3 = dbL3Facilities || (wisdom ? wisdom.l3Facilities : []);

    if (finalL3 && finalL3.length > 0) {
        // Map StationFacility to L3Facility format
        const wisdomFacilities = finalL3.map((f: any, idx: number) => {
            // [Localization] Handle both string (legacy) and object (multilingual) formats
            const rawLoc = f.location || {};
            const locObj: LocaleString = (typeof rawLoc === 'string')
                ? { zh: rawLoc, en: rawLoc, ja: rawLoc }
                : {
                    zh: rawLoc.zh || rawLoc['zh-TW'] || 'N/A',
                    en: rawLoc.en || 'N/A',
                    ja: rawLoc.ja || 'N/A'
                };

            // Name should ideally be distinct from location, but fallback to location if missing
            const nameObj: LocaleString = f.name_i18n
                ? {
                    ja: f.name_i18n.ja || f.name_i18n.en,
                    en: f.name_i18n.en || f.name_i18n.ja,
                    zh: f.name_i18n.zh || f.name_i18n.ja
                }
                : locObj;

            return {
                id: `${nodeId}-l3-${idx}`,
                type: f.type, // Map to correct property for UI Icons
                name: nameObj, // Use the localized object for the name
                location: locObj, // Use localized object for location
                details: f.attributes ? Object.entries(f.attributes).map(([k, v]) => {
                    return `${k}: ${v}`; // Simplify details to string[] or handle LocaleString[] later if needed
                    // stationStandard says details?: LocaleString[]
                    // So we should map to LocaleString objects
                }).map(s => ({ ja: s, en: s, zh: s })) : [],
                attributes: {
                    ...f.attributes,
                    floor: f.floor,
                    operator: f.operator,
                    source: f.source,
                    direction: {
                        zh: `${f.operator || ''} ${f.floor || ''}`,
                        en: `${f.operator || ''} ${f.floor || ''}`,
                        ja: `${f.operator || ''} ${f.floor || ''}`
                    }
                }
            } as L3Facility;
        });

        enrichedProfile.l3_facilities = wisdomFacilities;
    }

    // [New] Inject External Links (e.g. Toilet Vacancy)
    if (wisdom && wisdom.links) {
        enrichedProfile.external_links = wisdom.links.map((link: any, idx: number) => {
            const title =
                typeof link.title === 'string'
                    ? { ja: link.title, en: link.title, zh: link.title }
                    : link.title;

            const trackingId =
                typeof link.tracking_id === 'string' && link.tracking_id
                    ? link.tracking_id
                    : `ext_${nodeId}_${idx}`;

            return {
                ...link,
                title,
                tracking_id: trackingId
            };
        });
    }

    // --- L4: LUTAGU STRATEGY CARDS (V5 PASSIVE) ---
    // Cards are now PASSIVE – only shown after user query in L4_Bambi.
    // Pre-population from wisdom.traps/hacks disabled.
    const l4_cards: any[] = [];

    // Fallback Accessibility Card disabled for passive KB.

    // Inject L4 Cards
    enrichedProfile.l4_cards = l4_cards;

    // --- L4 RIDING KNOWLEDGE AGGREGATION FROM HUB MEMBERS ---
    // If the current node doesn't have riding_knowledge, check hub members
    let aggregatedRidingKnowledge: any = null;

    // First check the already-fetched nodes
    const ridingKnowledgeSourceNodes = [finalNode, hubNode, ...childNodes].filter(Boolean);

    for (const n of ridingKnowledgeSourceNodes) {
        if (n?.riding_knowledge) {
            const rk = n.riding_knowledge;
            // Check if it has actual content (not just empty arrays)
            const hasTraps = Array.isArray(rk.traps) && rk.traps.length > 0;
            const hasHacks = Array.isArray(rk.hacks) && rk.hacks.length > 0;

            if (hasTraps || hasHacks) {
                // Merge if we already have some, otherwise use this one
                if (!aggregatedRidingKnowledge) {
                    aggregatedRidingKnowledge = { traps: [], hacks: [] };
                }
                if (hasTraps) {
                    aggregatedRidingKnowledge.traps = [
                        ...(aggregatedRidingKnowledge.traps || []),
                        ...rk.traps
                    ];
                }
                if (hasHacks) {
                    aggregatedRidingKnowledge.hacks = [
                        ...(aggregatedRidingKnowledge.hacks || []),
                        ...rk.hacks
                    ];
                }
            }
        }
    }

    // If still no riding_knowledge, check peer station members using resolveHubStationMembers
    // This handles cases like JR-East.Ueno where riding_knowledge is on TokyoMetro.Ginza.Ueno
    if (!aggregatedRidingKnowledge && nodeId) {
        try {
            const hubMemberIds = resolveHubStationMembers(nodeId);


            // Filter out the current nodeId and already-checked nodes
            const checkedIds = new Set([nodeId, hubId, ...childNodes.map(c => c.id)].filter(Boolean));
            const uncheckedMemberIds = hubMemberIds.filter(id => !checkedIds.has(id));

            if (uncheckedMemberIds.length > 0) {
                // Generate all possible ID variants for each member (odpt.Station: vs odpt:Station:)
                const allVariantIds = new Set<string>();
                uncheckedMemberIds.forEach(id => {
                    getStationIdVariants(id).forEach(v => allVariantIds.add(v));
                });
                const variantIdArray = Array.from(allVariantIds);


                // Query Supabase for these member nodes
                const { data: memberNodes, error: memberError } = await supabase
                    .from('nodes')
                    .select('id, riding_knowledge')
                    .in('id', variantIdArray);

                if (!memberError && memberNodes) {
                    console.log(`[fetchNodeConfig] Found ${memberNodes.length} hub member nodes`);
                    for (const m of memberNodes) {
                        if (m.riding_knowledge) {
                            const rk = m.riding_knowledge as any;
                            const hasTraps = Array.isArray(rk.traps) && rk.traps.length > 0;
                            const hasHacks = Array.isArray(rk.hacks) && rk.hacks.length > 0;

                            console.log(`[fetchNodeConfig] Member ${m.id} has traps: ${hasTraps}, hacks: ${hasHacks}`);

                            if (hasTraps || hasHacks) {
                                if (!aggregatedRidingKnowledge) {
                                    aggregatedRidingKnowledge = { traps: [], hacks: [] };
                                }
                                if (hasTraps) {
                                    aggregatedRidingKnowledge.traps = [
                                        ...(aggregatedRidingKnowledge.traps || []),
                                        ...rk.traps
                                    ];
                                }
                                if (hasHacks) {
                                    aggregatedRidingKnowledge.hacks = [
                                        ...(aggregatedRidingKnowledge.hacks || []),
                                        ...rk.hacks
                                    ];
                                }
                            }
                        }
                    }
                }
            }
        } catch (err) {
            console.warn('[fetchNodeConfig] Failed to fetch hub member riding_knowledge:', err);
        }
    }

    // Attach aggregated riding_knowledge to finalNode for downstream use
    if (aggregatedRidingKnowledge && finalNode) {
        finalNode.riding_knowledge = aggregatedRidingKnowledge;
        console.log('[fetchNodeConfig] Aggregated riding_knowledge for', nodeId, ':', aggregatedRidingKnowledge);
    }

    // --- REAL-TIME STATUS INJECTION (Database First) ---

    // [Fix] Initialize with Default "Normal" Status first to strictly prevent empty UI
    const servedLines = STATION_LINES[nodeId] || (hubId ? STATION_LINES[hubId] : null) || [
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
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (typeof window !== 'undefined') {
            const tryIds = Array.from(new Set([nodeId, hubId].filter(Boolean))) as string[];
            for (const id of tryIds) {
                const l2Res = await fetch(`/api/l2/status?station_id=${encodeURIComponent(id)}`);
                if (!l2Res.ok) continue;
                const l2Data = await l2Res.json();
                if (l2Data) {
                    enrichedProfile.l2_status = l2Data;
                    console.log(`[L2] Applied real-time data for ${id}`, l2Data);
                    break;
                }
            }
        } else if (supabaseUrl && supabaseKey) {
            // Server-side fetch (Direct DB or internal call if needed, but for now we rely on client or pre-fetch)
            const candidates = Array.from(
                new Set([
                    nodeId,
                    NODE_TO_ODPT[nodeId] || null,
                    hubId,
                    hubId ? (NODE_TO_ODPT[hubId] || null) : null
                ].filter(Boolean))
            ) as string[];

            for (const stationId of candidates) {
                const { data: l2Data } = await supabase
                    .from('transit_dynamic_snapshot')
                    .select('*')
                    .eq('station_id', stationId)
                    .maybeSingle();

                if (!l2Data) continue;

                const reasonJa = l2Data.reason_ja || '';
                const isStationDelay = l2Data.status_code === 'DELAY' &&
                    !reasonJa.includes('平常') &&
                    !reasonJa.includes('通常');

                enrichedProfile.l2_status = {
                    congestion: isStationDelay ? 4 : (l2Data.crowd_level || 2),
                    line_status: servedLines.map(line => {
                        // More granular check: only mark as delay if it's a station-wide delay 
                        // or if the line name (English or Japanese) is mentioned in the reason.
                        const lineMatchesReason = reasonJa.includes(line.name.ja) ||
                            (line.name.en && reasonJa.includes(line.name.en));

                        const shouldShowDelay = isStationDelay && (reasonJa.length < 5 || lineMatchesReason);

                        return {
                            line: line.name.en,
                            name: line.name,
                            operator: line.operator,
                            color: line.color,
                            status: shouldShowDelay ? 'delay' : 'normal',
                            message: shouldShowDelay ? l2Data.reason_ja : undefined
                        };
                    }),
                    weather: {
                        temp: l2Data.weather_info?.temp || 0,
                        condition: l2Data.weather_info?.condition || 'Unknown'
                    },
                    updated_at: l2Data.updated_at
                };

                break;
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
        node: { ...finalNode, location: parseLocation((finalNode as any).location ?? (finalNode as any).coordinates) },
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
        .is('parent_hub_id', null);

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
    let data: any = null;
    let error: any = null;
    ({ data, error } = await supabase
        .rpc('nearby_nodes_v2', {
            center_lat: 35.6895,
            center_lon: 139.6917,
            radius_meters: 50000,
            max_results: 8000
        }));
    if (error) {
        ({ data, error } = await supabase
            .rpc('nearby_nodes', {
                center_lat: 35.6895,
                center_lon: 139.6917,
                radius_meters: 50000
            }));
    }

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
            type: String(n?.type ?? n?.node_type ?? 'station'),
            location: parseLocation(n?.location ?? n?.coordinates),
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

export interface ViewportNodesQuery {
    swLat: number;
    swLon: number;
    neLat: number;
    neLon: number;
    zoom: number;
    page?: number;
    pageSize?: number;
    hubsOnly?: boolean;
}

export interface ViewportNodesResult {
    nodes: NodeDatum[];
    page: number;
    page_size: number;
    next_page: number | null;
    hubs_only: boolean;
    zoom: number;
    stats?: {
        candidates: number;
        after_filter: number;
        returned: number;
    };
}

export async function fetchNodesByViewport(query: ViewportNodesQuery, opts?: { signal?: AbortSignal }) {
    const url = new URL('/api/nodes/viewport', typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    url.searchParams.set('swLat', String(query.swLat));
    url.searchParams.set('swLon', String(query.swLon));
    url.searchParams.set('neLat', String(query.neLat));
    url.searchParams.set('neLon', String(query.neLon));
    url.searchParams.set('zoom', String(query.zoom));
    if (typeof query.page === 'number') url.searchParams.set('page', String(query.page));
    if (typeof query.pageSize === 'number') url.searchParams.set('page_size', String(query.pageSize));
    if (typeof query.hubsOnly === 'boolean') url.searchParams.set('hubs_only', query.hubsOnly ? '1' : '0');

    const res = await fetch(url.toString(), {
        method: 'GET',
        signal: opts?.signal,
        headers: { 'Accept': 'application/json' }
    });

    if (!res.ok) {
        throw new Error(`Failed to load viewport nodes (${res.status})`);
    }

    const json = (await res.json()) as ViewportNodesResult | { error: string };
    if ((json as any).error) {
        throw new Error((json as any).error);
    }

    return json as ViewportNodesResult;
}
