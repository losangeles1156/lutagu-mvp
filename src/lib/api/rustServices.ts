import { normalizeOdptStationId } from '@/lib/l4/assistantEngine';

const L4_API_URL = process.env.L4_ROUTING_API_URL || 'http://localhost:8082'; // Default to local
const L2_API_URL = process.env.L2_STATUS_API_URL || 'http://localhost:8083';

if (process.env.NODE_ENV === 'production' && (!process.env.L4_ROUTING_API_URL || !process.env.L2_STATUS_API_URL)) {
    console.warn('[RustServices] Warning: Missing Rust Service URLs in Production. Falling back to localhost which may fail.');
}

export interface RustRouteResponse {
    routes: RustRoute[];
    error: string | null;
}

export interface RustRoute {
    key: string;
    path: string[]; // List of station IDs
    edge_railways: string[]; // List of railway IDs between nodes
    costs: {
        time: number;
        transfers: number;
        hops: number;
        transfer_distance: number;
        crowding: number;
    };
}

export interface RustL2Status {
    congestion: number;
    crowd: {
        level: number;
        trend: string;
        userVotes: {
            distribution: number[];
            total: number;
        };
    };
    line_status: RustLineStatus[];
    weather: {
        condition: string;
        temp: number;
        wind: number;
    };
    updated_at: string;
    is_stale: boolean;
    disruption_history: any[];
}

export interface RustLineStatus {
    line: string;
    status: string; // 'normal' | 'delay' | 'suspended'
    delay_minutes?: number; // Optional in Rust struct?
    message?: string;
    name?: { ja: string; en: string;[key: string]: string };
}

export async function fetchL4Routes(originId: string, destId: string): Promise<RustRouteResponse | null> {
    try {
        const origin = normalizeOdptStationId(originId);
        const dest = normalizeOdptStationId(destId);

        const url = `${L4_API_URL}/l4/route?from=${encodeURIComponent(origin)}&to=${encodeURIComponent(dest)}`;
        const res = await fetch(url, { next: { revalidate: 60 } }); // Cache for 60s
        if (!res.ok) return null;

        return await res.json();
    } catch (e) {
        console.error('[RustServices] L4 Route fetch failed:', e);
        return null;
    }
}

export async function fetchL2Status(stationId: string): Promise<RustL2Status | null> {
    try {
        const id = normalizeOdptStationId(stationId);
        const url = `${L2_API_URL}/l2/status?station_id=${encodeURIComponent(id)}`;

        const res = await fetch(url, { next: { revalidate: 30 } }); // Cache for 30s
        if (!res.ok) return null;

        return await res.json();
    } catch (e) {
        console.error('[RustServices] L2 Status fetch failed:', e);
        return null;
    }
}
