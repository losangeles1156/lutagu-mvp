
const RUST_L2_URL = process.env.L2_SERVICE_URL || process.env.L2_STATUS_API_URL || 'http://localhost:8081';

if (RUST_L2_URL.includes('localhost') && process.env.NODE_ENV === 'production') {
    console.error('⚠️ [RustL2Client] RUST_L2_URL is defaulting to localhost in production!');
}

export interface LineStatus {
    line: string;
    name: { ja: string; en: string; zh: string };
    line_name: { ja: string; en: string; zh: string };
    operator: string;
    color: string;
    railway_id?: string;
    status: string;
    status_detail: string;
    delay_minutes?: number;
    severity?: string;
    message?: { ja: string; en: string; zh: string };
}

export interface L2Status {
    congestion: number;
    crowd: {
        level: number;
        trend: string;
        userVotes: any; // Simplified for client
    };
    line_status: LineStatus[];
    weather: {
        temp: number;
        condition: string;
        wind: number;
    };
    updated_at: string;
    is_stale: boolean;
    disruption_history: any[];
}

export class RustL2Client {
    /**
     * Helper to normalize station ID for the service
     */
    private normalizeStationId(id: string): string {
        return id.replace(/^odpt:Station:/, 'odpt.Station:').trim();
    }

    /**
     * Gets live status (L2) for a station from the high-performance Rust microservice.
     */
    async getStatus(stationId: string): Promise<L2Status | null> {
        const id = this.normalizeStationId(stationId);
        if (!id) return null;

        try {
            const url = new URL(`${RUST_L2_URL}/l2/status`);
            url.searchParams.append('station_id', id);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout for status

            const res = await fetch(url.toString(), {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json'
                }
            });
            clearTimeout(timeoutId);

            if (!res.ok) {
                // 404 means no status available, which is fine
                if (res.status !== 404) {
                    console.warn(`[RustL2Client] Service returned status ${res.status} for ${id}`);
                }
                return null;
            }

            const data = await res.json() as L2Status;
            return data;
        } catch (error) {
            console.error(`[RustL2Client] Request failed for ${id}:`, error);
            return null;
        }
    }
}

export const rustL2Client = new RustL2Client();
