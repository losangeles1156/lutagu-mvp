import { logger } from '@/lib/utils/logger';

const RUST_L2_URL = process.env.L2_SERVICE_URL || process.env.L2_STATUS_API_URL || 'http://localhost:8081';

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
        userVotes: any;
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
    private static instance: RustL2Client;
    private baseUrl: string;

    private constructor() {
        this.baseUrl = RUST_L2_URL;
    }

    public static getInstance(): RustL2Client {
        if (!RustL2Client.instance) {
            RustL2Client.instance = new RustL2Client();
        }
        return RustL2Client.instance;
    }

    public async getStatus(stationId: string): Promise<L2Status | null> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout

            const url = `${this.baseUrl}/l2/status?station_id=${encodeURIComponent(stationId)}`;
            const response = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json'
                }
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                logger.warn(`[RustL2Client] L2 service error: ${response.status} ${response.statusText}`);
                return null;
            }

            const data = await response.json();
            return data as L2Status;
        } catch (error) {
            // logger.error('[RustL2Client] Failed to fetch L2 status', error);
            // Suppress error log to avoid noise when service is down (fallback will handle it)
            return null;
        }
    }
}

export const rustL2Client = RustL2Client.getInstance();
