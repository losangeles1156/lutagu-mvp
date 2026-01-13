import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SEED_NODES } from '@/lib/nodes/seedNodes';


export const dynamic = 'force-dynamic';

// Simple in-memory cache for viewport requests
const cache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 300000; // 5 minutes

function getCacheKey(params: any) {
    return JSON.stringify(params);
}

function toNumber(value: string | null): number | null {
    if (value === null) return null;
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    return n;
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function haversineMeters(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
    const R = 6371000;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lon - a.lon);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

function parseLocation(loc: any): { coordinates: [number, number] } {
    if (!loc) return { coordinates: [0, 0] };
    if (Array.isArray(loc) && loc.length >= 2) {
        return { coordinates: [Number(loc[0]), Number(loc[1])] };
    }
    if (loc.coordinates?.coordinates && Array.isArray(loc.coordinates.coordinates)) {
        return { coordinates: [loc.coordinates.coordinates[0], loc.coordinates.coordinates[1]] };
    }
    if (loc.coordinates && Array.isArray(loc.coordinates)) {
        return { coordinates: [loc.coordinates[0], loc.coordinates[1]] };
    }
    if (typeof loc === 'string' && loc.startsWith('POINT')) {
        const matches = loc.match(/\(([^)]+)\)/);
        if (matches) {
            const parts = matches[1].trim().split(/\s+/);
            return { coordinates: [parseFloat(parts[0]), parseFloat(parts[1])] };
        }
    }
    if (loc.type === 'Point' && loc.coordinates) {
        return { coordinates: loc.coordinates as [number, number] };
    }
    return { coordinates: [0, 0] };
}

/**
 * Parse node ID to extract operator and station name
 * Format: odpt.Station:{Operator}.{Line}.{StationName} or odpt.Station:{Operator}.{StationName}
 */
function parseNodeId(id: string): { operator: string; stationName: string; line?: string } | null {
    if (!id || !id.startsWith('odpt.Station:')) return null;

    const parts = id.replace('odpt.Station:', '').split('.');
    if (parts.length < 2) return null;

    const operator = parts[0];
    // If 3+ parts, format is Operator.Line.StationName
    // If 2 parts, format is Operator.StationName
    if (parts.length >= 3) {
        return {
            operator,
            line: parts[1],
            stationName: parts.slice(2).join('.') // Handle station names with dots
        };
    } else {
        return {
            operator,
            stationName: parts[1]
        };
    }
}

/**
 * Through-service priority map: station name (LOWERCASE) -> primary operator
 * For stations shared between operators via through-service, only show the primary operator
 */
const THROUGH_SERVICE_PRIMARY_OPERATOR: Record<string, string> = {
    // Tokyo Metro <-> Tokyu through-service
    'nakameguro': 'Tokyu',
    'denenchofu': 'Tokyu',
    'kikuna': 'Tokyu',

    // Tokyo Metro <-> Seibu through-service  
    'kotakemukaihara': 'TokyoMetro',
    'nerimakasugacho': 'TokyoMetro',

    // Tokyo Metro <-> Tobu through-service
    'wakoshi': 'TokyoMetro',

    // Toei <-> Keikyu through-service
    'sengakuji': 'Toei',

    // Add more as needed based on actual through-service arrangements
};

/**
 * Operator display priority (lower = higher priority for co-located stations)
 * Used when multiple operators have stations at the same location
 */
const OPERATOR_PRIORITY: Record<string, number> = {
    'JR-East': 1,
    'TokyoMetro': 2,
    'Toei': 3,
    'Tokyu': 4,
    'Keio': 5,
    'Odakyu': 6,
    'Seibu': 7,
    'Tobu': 8,
    'Keisei': 9,
    'Keikyu': 10,
    'TWR': 11,
    'Yurikamome': 12,
    'TokyoMonorail': 13
};

/**
 * Deduplicate nodes by (Operator, StationName) - same operator different lines = 1 node
 * Also applies through-service logic to hide secondary operator nodes
 */
function deduplicateByOperatorStation<T extends { id: string; location: { coordinates: [number, number] } }>(
    nodes: T[]
): T[] {
    const seen = new Map<string, T>(); // key: "operator:stationName"
    const stationOperators = new Map<string, Set<string>>(); // key: stationName, value: set of operators

    // First pass: collect all operators per station name
    for (const node of nodes) {
        const parsed = parseNodeId(node.id);
        if (!parsed) {
            // Non-ODPT nodes, keep as-is
            seen.set(node.id, node);
            continue;
        }

        const operators = stationOperators.get(parsed.stationName) || new Set();
        operators.add(parsed.operator);
        stationOperators.set(parsed.stationName, operators);
    }

    // Second pass: deduplicate
    for (const node of nodes) {
        const parsed = parseNodeId(node.id);
        if (!parsed) continue;

        const { operator, stationName } = parsed;

        // Check through-service priority (use lowercase for case-insensitive matching)
        const primaryOperator = THROUGH_SERVICE_PRIMARY_OPERATOR[stationName.toLowerCase()];
        if (primaryOperator && operator !== primaryOperator) {
            // This station has a designated primary operator, and this node is not it
            // Skip this node (it will be represented by the primary operator's node)
            continue;
        }

        // Deduplicate by (operator, stationName)
        const key = `${operator}:${stationName}`;
        if (!seen.has(key)) {
            seen.set(key, node);
        }
        // If already seen, skip (first occurrence wins, which is usually the main line)
    }

    return Array.from(seen.values());
}

function getFallbackNodes() {
    return SEED_NODES.map((n: any) => {
        const location = parseLocation(n.location);

        // Unified is_hub logic
        const explicitIsHub = n.is_hub;
        const isHub = typeof explicitIsHub === 'boolean'
            ? explicitIsHub
            : (n.parent_hub_id === null || n.parent_hub_id === undefined);

        return {
            id: String(n.id ?? ''),
            city_id: String(n.city_id ?? ''),
            name: n.name ?? { 'zh-TW': '車站', ja: '駅', en: 'Station' },
            type: String(n.node_type ?? n.type ?? 'station').toLowerCase(),
            location,
            geohash: String(n.geohash ?? ''),
            vibe: n.vibe ?? null,
            is_hub: isHub,
            parent_hub_id: n.parent_hub_id ?? null,
            zone: String(n.zone ?? 'core')
        };
    }).filter(n => Boolean(n.id));
}

// Type definitions for hub metadata
interface HubMetadata {
    hub_id: string;
    transfer_type: string;
    walking_distance_meters: number | null;
    indoor_connection_notes: string | null;
    transfer_complexity: string;
}

interface HubMember {
    member_id: string;
    member_name: any;
    operator: string;
    line_name: string | null;
    transfer_type: string;
    walking_seconds: number | null;
    sort_order: number;
}

interface HubDetails {
    member_count: number;
    transfer_type: string;
    transfer_complexity: string;
    walking_distance_meters: number | null;
    indoor_connection_notes: string | null;
    members: HubMember[];
}

// Fetch hub metadata from database
async function fetchHubMetadata(supabase: any, hubIds: string[]): Promise<Map<string, HubMetadata>> {
    if (hubIds.length === 0) return new Map();

    const { data, error } = await supabase
        .from('hub_metadata')
        .select('*')
        .in('hub_id', hubIds)
        .eq('is_active', true);

    if (error) {
        console.warn('[api/nodes/viewport] Failed to fetch hub_metadata:', error.message);
        return new Map();
    }

    const map = new Map<string, HubMetadata>();
    for (const row of (data || [])) {
        map.set(row.hub_id, {
            hub_id: row.hub_id,
            transfer_type: row.transfer_type,
            walking_distance_meters: row.walking_distance_meters,
            indoor_connection_notes: row.indoor_connection_notes,
            transfer_complexity: row.transfer_complexity
        });
    }
    return map;
}

// Fetch hub members from database
async function fetchHubMembers(supabase: any, hubIds: string[]): Promise<Map<string, HubMember[]>> {
    if (hubIds.length === 0) return new Map();

    const { data, error } = await supabase
        .from('hub_members')
        .select('*')
        .in('hub_id', hubIds)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

    if (error) {
        console.warn('[api/nodes/viewport] Failed to fetch hub_members:', error.message);
        return new Map();
    }

    const map = new Map<string, HubMember[]>();
    for (const row of (data || [])) {
        const members = map.get(row.hub_id) || [];
        members.push({
            member_id: row.member_id,
            member_name: row.member_name,
            operator: row.operator,
            line_name: row.line_name,
            transfer_type: row.transfer_type,
            walking_seconds: row.walking_seconds,
            sort_order: row.sort_order
        });
        map.set(row.hub_id, members);
    }
    return map;
}

export async function GET(req: Request) {
    const url = new URL(req.url);

    const swLat = toNumber(url.searchParams.get('swLat'));
    const swLon = toNumber(url.searchParams.get('swLon'));
    const neLat = toNumber(url.searchParams.get('neLat'));
    const neLon = toNumber(url.searchParams.get('neLon'));
    const zoomRaw = toNumber(url.searchParams.get('zoom'));

    if (swLat === null || swLon === null || neLat === null || neLon === null || zoomRaw === null) {
        return NextResponse.json({ error: 'Missing or invalid viewport parameters' }, { status: 400 });
    }

    const zoom = clamp(Math.round(zoomRaw), 1, 22);
    const page = clamp(Math.floor(toNumber(url.searchParams.get('page')) ?? 0), 0, 1000);

    const maxDataSizeKb = clamp(Math.floor(toNumber(url.searchParams.get('max_kb')) ?? 250), 50, 1000);

    const defaultPageSize = zoom < 11 ? 200 : zoom < 14 ? 350 : 500;
    const requestedPageSize = Math.floor(toNumber(url.searchParams.get('page_size')) ?? defaultPageSize);
    const pageSize = clamp(requestedPageSize, 50, 500);

    // [RESTORED] hubsOnly filter: show only hubs at low zoom for performance and visual clarity
    // This ensures same-operator stations are grouped as single nodes
    const hubsOnlyParam = url.searchParams.get('hubs_only') ?? url.searchParams.get('hubsOnly');
    const hubsOnly = hubsOnlyParam === '1' || hubsOnlyParam === 'true' || zoom < 14;

    // [DISABLED] Ward-based filtering relaxed per user request
    const wardId = url.searchParams.get('ward_id');
    const coreOnly = false; // Disabled: url.searchParams.get('coreOnly') === 'true' || url.searchParams.get('core_only') === 'true';
    const showStationsOnly = url.searchParams.get('stations_only') === '1';

    const minLat = Math.min(swLat, neLat);
    const maxLat = Math.max(swLat, neLat);
    const minLon = Math.min(swLon, neLon);
    const maxLon = Math.max(swLon, neLon);

    // [CACHE] Check for existing data
    const cacheKey = getCacheKey({ swLat, swLon, neLat, neLon, zoomRaw });
    const cached = cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        console.log('[api/nodes/viewport] Cache Hit:', cacheKey.substring(0, 50) + '...');
        return NextResponse.json(cached.data);
    }

    const center = { lat: (minLat + maxLat) / 2, lon: (minLon + maxLon) / 2 };
    const corner = { lat: maxLat, lon: maxLon };

    const radiusMetersRaw = haversineMeters(center, corner) * 1.12;
    const maxRadius = zoom < 11 ? 80000 : zoom < 14 ? 50000 : 25000;
    const radiusMeters = clamp(radiusMetersRaw, 800, maxRadius);

    const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const envKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const supabaseUrl = envUrl || '';
    const supabaseKey = envKey || '';

    // Check if we should use fallback due to missing config (only if both Env and Fallback are missing, effectively never now)
    // But we might want 'fallback' manual override
    const useFallback = url.searchParams.get('fallback') === '1';

    let candidates: any[] = [];
    let degraded = false;
    let source: 'supabase' | 'fallback' = 'supabase';
    let supabaseClient: any = null;

    if (useFallback) {
        degraded = true;
        source = 'fallback';
        candidates = getFallbackNodes();
        if (!supabaseUrl || !supabaseKey) {
            // Log only once or in development
        }
    } else {
        try {
            if (!supabaseUrl || !supabaseKey) {
                console.error('[Viewport] Missing Supabase Credentials for fallback ingestion');
                return NextResponse.json({ error: 'Missing configuration' }, { status: 500 });
            }
            supabaseClient = createClient(supabaseUrl, supabaseKey);
            let data: any = null;
            let error: any = null;

            ({ data, error } = await supabaseClient.rpc('nearby_nodes_v2', {
                center_lat: center.lat,
                center_lon: center.lon,
                radius_meters: Math.round(radiusMeters),
                max_results: 700
            }));

            if (error) {
                ({ data, error } = await supabaseClient.rpc('nearby_nodes', {
                    center_lat: center.lat,
                    center_lon: center.lon,
                    radius_meters: Math.round(radiusMeters)
                }));
            }

            if (error) {
                degraded = true;
                source = 'fallback';
                candidates = getFallbackNodes();

                console.warn('[api/nodes/viewport] Supabase RPC failed, using fallback', {
                    code: (error as any).code,
                    message: (error as any).message
                });
            } else {
                // Filter out inactive nodes (Phase 4: only return approved data)
                candidates = ((data as any[] | null | undefined) || []).filter(
                    (n: any) => (n as any).is_active !== false
                );
            }
        } catch (err: any) {
            degraded = true;
            source = 'fallback';
            candidates = getFallbackNodes();
            console.error('[api/nodes/viewport] Unexpected error fetching from Supabase:', err.message);
        }
    }

    // Filter to show only hub nodes and standalone stations (hide child nodes)
    const filteredBase = candidates
        .map(n => {
            const location = parseLocation((n as any).location ?? (n as any).coordinates);
            const parentHubId = (n as any).parent_hub_id;
            const hasParentHub = parentHubId !== null && parentHubId !== undefined;
            let isHub = !hasParentHub;

            // [DISABLED] Removed HOTFIX that was hiding major Yamanote stations
            // Now showing all nodes without filtering

            return {
                id: String((n as any).id ?? ''),
                city_id: String((n as any).city_id ?? ''),
                name: (n as any).name ?? { 'zh-TW': '車站', ja: '駅', en: 'Station' },
                type: String((n as any).type ?? (n as any).node_type ?? 'station'),
                location,
                geohash: String((n as any).geohash ?? ''),
                vibe: (n as any).vibe ?? null,
                is_hub: isHub,
                parent_hub_id: parentHubId ?? null,
                zone: String((n as any).zone ?? 'core'),
                ward_id: (n as any).ward_id ?? null
            };
        })
        .filter((n) => {
            const [lon, lat] = n.location.coordinates;
            if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
            if (lat === 0 && lon === 0) return false;
            if (lat < minLat || lat > maxLat || lon < minLon || lon > maxLon) return false;

            // [FIX] Ward/Core filtering disabled by user request to ensure node visibility.
            // We rely on the viewport bounds and pageSize limit for performance.
            /*
            if (wardId) {
                if (n.ward_id === 'ward:airport') {
                    // Always show airports
                } else if (n.ward_id !== wardId) {
                    return false;
                }
            }
    
            if (coreOnly) {
                const isAirport = n.ward_id === 'ward:airport';
                const isCoreWard = n.ward_id && [
                    'ward:chiyoda', 'ward:chuo', 'ward:minato', 'ward:shinjuku', 'ward:bunkyo', 
                    'ward:taito', 'ward:sumida', 'ward:koto', 'ward:shinagawa', 'ward:meguro', 'ward:shibuya'
                ].includes(n.ward_id);
                
                // Keep if Airport, Core Ward, or Unknown (FAIL OPEN)
                if (!isAirport && !isCoreWard && n.ward_id) {
                    return false;
                }
            }
            */

            // [NEW] Filter out non-station nodes (bus stops, POIs, etc.)
            const nodeType = n.type;
            const excludedTypes = ['bus_stop', 'poi', 'place', 'facility', 'entrance', 'exit', 'shopping', 'restaurant'];
            if (excludedTypes.includes(nodeType)) {
                return false;
            }

            // [FIX] When hubsOnly is true, only show actual station hubs (not standalone non-hubs)
            if (hubsOnly && !n.is_hub) return false;

            return true;
        })

    // [FIX] Do NOT merge fallback nodes if we successfully fetched from Supabase
    // Only use fallback nodes if we are in degraded mode or strictly using fallback source
    // The previous logic for supplementalSeed was causing zombie nodes and is removed.
    const supplementalSeed: any[] = [];

    // If source is supabase, filteredBase contains our DB nodes. 
    // If source is fallback, filteredBase contains fallback nodes (assigned to candidates earlier).
    // The previous logic was double-dipping or force-injecting seeds.
    // However, checking the logic above:
    // If useFallback is true -> candidates = getFallbackNodes()
    // If supabase fails -> candidates = getFallbackNodes()
    // If supabase succeeds -> candidates = data from DB

    // So 'filteredBase' ALREADY contains the correct set of nodes based on the source.
    // We should NOT add getFallbackNodes() again unless we specifically want to supplement DB data with local data (which causes the zombie node issue).
    // So we can simply remove the supplementalSeed merging or make it empty.

    const filtered = dedupeById([...filteredBase])
        .sort((a, b) => {
            const da = (a.location.coordinates[1] - center.lat) ** 2 + (a.location.coordinates[0] - center.lon) ** 2;
            const db = (b.location.coordinates[1] - center.lat) ** 2 + (b.location.coordinates[0] - center.lon) ** 2;
            return da - db;
        });

    function dedupeById<T extends { id: string }>(arr: T[]): T[] {
        const seen = new Set<string>();
        const out: T[] = [];
        for (const item of arr) {
            if (!item?.id) continue;
            if (seen.has(item.id)) continue;
            seen.add(item.id);
            out.push(item);
        }
        return out;
    }

    // [NEW] Apply operator+station deduplication to reduce same-operator different-line duplicates
    const deduplicatedByOperator = deduplicateByOperatorStation(filtered);
    const deduplicated = deduplicatedByOperator;

    // Implement truncation to respect maxDataSizeKb
    // A rough estimation: each node is about 0.4KB to 0.6KB in JSON
    const estimatedNodeSizeKb = 0.5;
    const maxNodesAllowed = Math.floor(maxDataSizeKb / estimatedNodeSizeKb);

    const start = page * pageSize;
    const end = start + pageSize;
    const limitedNodes = deduplicated.slice(start, Math.min(deduplicated.length, end, start + maxNodesAllowed));
    const hasMore = deduplicated.length > end;

    // Fetch hub metadata and members for the returned nodes
    const hubDetails: Record<string, HubDetails> = {};

    if (supabaseClient && limitedNodes.length > 0) {
        const hubIds = limitedNodes.filter(n => n.is_hub).map(n => n.id);

        if (hubIds.length > 0) {
            const [metadataMap, membersMap] = await Promise.all([
                fetchHubMetadata(supabaseClient, hubIds),
                fetchHubMembers(supabaseClient, hubIds)
            ]);

            for (const hubId of hubIds) {
                const metadata = metadataMap.get(hubId);
                const members = membersMap.get(hubId) || [];
                const memberCount = members.length;

                // [FIX] Always generate hubDetails for all hub nodes
                // This ensures all stations display properly with labels on the map
                hubDetails[hubId] = {
                    member_count: memberCount,
                    transfer_type: metadata?.transfer_type || 'indoor',
                    transfer_complexity: metadata?.transfer_complexity || 'simple',
                    walking_distance_meters: metadata?.walking_distance_meters || null,
                    indoor_connection_notes: metadata?.indoor_connection_notes || null,
                    members: members
                };
            }
        }
    }

    // Post-process to remove spatial overlaps and ensure data integrity
    const uniqueNodes = [];
    const seenCoords = new Set<string>();

    // Priority sorting: 
    // 1. Hubs always win over non-hubs
    // 2. Nodes with more complete metadata win (using ID length as proxy)
    const sortedNodes = [...limitedNodes].sort((a: any, b: any) => {
        if (a.is_hub !== b.is_hub) return a.is_hub ? -1 : 1;
        return (b.id?.length ?? 0) - (a.id?.length ?? 0);
    });

    for (const node of sortedNodes) {
        const coordKey = `${node.location.coordinates[0].toFixed(5)},${node.location.coordinates[1].toFixed(5)}`;

        // If we've seen this coordinate and the current node is not a hub, skip it
        if (seenCoords.has(coordKey) && !node.is_hub) {
            continue;
        }

        uniqueNodes.push(node);
        seenCoords.add(coordKey);
    }

    const responseData = {
        nodes: uniqueNodes,
        page,
        next_page: hasMore ? page + 1 : null,
        page_size: pageSize,
        total_in_viewport: deduplicated.length,
        has_more: hasMore,
        degraded,
        source,
        hub_details: hubDetails
    };

    // [CACHE] Store for future requests
    cache.set(cacheKey, { data: responseData, timestamp: Date.now() });

    // Prevent cache from growing too large
    if (cache.size > 100) {
        const oldestKey = cache.keys().next().value;
        if (oldestKey) cache.delete(oldestKey);
    }

    return NextResponse.json(responseData);
}
