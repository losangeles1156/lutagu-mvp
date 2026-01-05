import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SEED_NODES } from '@/lib/nodes/seedNodes';
import { resolveHubStationMembers } from '@/lib/constants/stationLines';

export const dynamic = 'force-dynamic';

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

    const maxDataSizeKb = clamp(Math.floor(toNumber(url.searchParams.get('max_kb')) ?? 350), 50, 2000);

    const defaultPageSize = zoom < 11 ? 200 : zoom < 14 ? 500 : 900;
    const requestedPageSize = Math.floor(toNumber(url.searchParams.get('page_size')) ?? defaultPageSize);
    const pageSize = clamp(requestedPageSize, 50, 1000);

    const hubsOnlyParam = url.searchParams.get('hubs_only');
    // Always return hubs only for better performance (per station grouping design)
    const hubsOnly = hubsOnlyParam === '1' || hubsOnlyParam === 'true' || zoom < 14;
    
    // [NEW] Ward-based query support
    const wardId = url.searchParams.get('ward_id');
    const showStationsOnly = url.searchParams.get('stations_only') === '1';

    const minLat = Math.min(swLat, neLat);
    const maxLat = Math.max(swLat, neLat);
    const minLon = Math.min(swLon, neLon);
    const maxLon = Math.max(swLon, neLon);

    const center = { lat: (minLat + maxLat) / 2, lon: (minLon + maxLon) / 2 };
    const corner = { lat: maxLat, lon: maxLon };

    const radiusMetersRaw = haversineMeters(center, corner) * 1.12;
    const maxRadius = zoom < 11 ? 80000 : zoom < 14 ? 50000 : 25000;
    const radiusMeters = clamp(radiusMetersRaw, 800, maxRadius);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    // Check if we should use fallback due to missing config or explicit request
    const useFallback = !supabaseUrl || !supabaseKey || url.searchParams.get('fallback') === '1';
    
    let candidates: any[] = [];
    let degraded = false;
    let source: 'supabase' | 'fallback' = 'supabase';
    let supabaseClient: any = null;

    if (useFallback) {
        degraded = true;
        source = 'fallback';
        candidates = getFallbackNodes();
        if (!supabaseUrl || !supabaseKey) {
            console.log('[api/nodes/viewport] Supabase configuration missing, using fallback data');
        }
    } else {
        try {
            supabaseClient = createClient(supabaseUrl, supabaseKey);
            let data: any = null;
            let error: any = null;

            ({ data, error } = await supabaseClient.rpc('nearby_nodes_v2', {
                center_lat: center.lat,
                center_lon: center.lon,
                radius_meters: Math.round(radiusMeters),
                max_results: 8000
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
    const filtered = candidates
        .map(n => {
            const location = parseLocation((n as any).location ?? (n as any).coordinates);
            const parentHubId = (n as any).parent_hub_id;
            const hasParentHub = parentHubId !== null && parentHubId !== undefined;
            const isHub = !hasParentHub;

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
        .filter((n, idx) => {
            const [lon, lat] = n.location.coordinates;
            if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
            if (lat === 0 && lon === 0) return false;
            if (lat < minLat || lat > maxLat || lon < minLon || lon > maxLon) return false;
            
            // [NEW] Filter out non-station nodes (bus stops, POIs, etc.)
            const nodeType = n.type;
            const excludedTypes = ['bus_stop', 'poi', 'place', 'facility', 'entrance', 'exit', 'shopping', 'restaurant'];
            if (excludedTypes.includes(nodeType)) {
                return false;
            }
            
            // [FIX] When hubsOnly is true, only show actual station hubs (not standalone non-hubs)
            // Bus stops have is_hub=true but are not stations - already filtered above
            if (hubsOnly && !n.is_hub) return false;
            
            return true;
        })
        .sort((a, b) => {
            const da = (a.location.coordinates[1] - center.lat) ** 2 + (a.location.coordinates[0] - center.lon) ** 2;
            const db = (b.location.coordinates[1] - center.lat) ** 2 + (b.location.coordinates[0] - center.lon) ** 2;
            return da - db;
        });

    // Deduplicate nodes by ID
    const seenHubs = new Set<string>();
    const deduplicated = [];

    for (const node of filtered) {
        if (seenHubs.has(node.id)) continue;
        seenHubs.add(node.id);
        deduplicated.push(node);
    }

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

                if (metadata || memberCount > 0) {
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
    }

    return NextResponse.json({
        nodes: limitedNodes,
        page,
        next_page: hasMore ? page + 1 : null,
        page_size: pageSize,
        total_in_viewport: deduplicated.length,
        has_more: hasMore,
        degraded,
        source,
        hub_details: hubDetails
    });
}
