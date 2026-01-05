import { OdptRailway, OdptStation, OdptTrainTimetable, OdptRailwayFare } from './types';
import { fetchWithRetry, RetryConfig } from '@/lib/utils/retry';

const API_PUBLIC = 'https://api-public.odpt.org/api/v4';
const API_DEV = 'https://api.odpt.org/api/v4';
const API_CHALLENGE = 'https://api-challenge.odpt.org/api/v4';

const TOKEN_DEV = process.env.ODPT_API_TOKEN || process.env.ODPT_API_KEY || process.env.ODPT_API_KEY_PUBLIC;  // For Metro, MIR
const TOKEN_CHALLENGE = process.env.ODPT_API_TOKEN_BACKUP || process.env.ODPT_API_KEY_CHALLENGE2025;                  // For JR East

/**
 * ODPT API retry configuration
 * Moderate settings with exponential backoff for reliability
 */
const ODPT_RETRY_CONFIG: Partial<RetryConfig> = {
    maxRetries: 3,
    initialDelayMs: 2000,
    maxDelayMs: 60000,
    backoffMultiplier: 2,
    jitterRange: 0.2
};

async function fetchOdpt<T>(type: string, params: Record<string, string> = {}): Promise<T[]> {
    let operator = params['odpt:operator'] || '';

    // Infer operator from other params if missing
    if (!operator) {
        const potentialIds = [
            params['odpt:station'],
            params['odpt:fromStation'],
            params['odpt:toStation'],
            params['owl:sameAs']
        ].filter(Boolean);

        for (const id of potentialIds) {
            if (id.includes('Toei')) { operator = 'Toei'; break; }
            if (id.includes('JR-East')) { operator = 'JR-East'; break; }
            if (id.includes('TokyoMetro')) { operator = 'TokyoMetro'; break; }
        }
    }

    // Strategy Selection
    let baseUrl = API_DEV;
    let token = TOKEN_DEV;

    if (operator.includes('Toei')) {
        // Strategy A: Toei -> Public API, No Token
        baseUrl = API_PUBLIC;
        token = undefined;
    } else if (operator.includes('JR-East')) {
        // Strategy B: JR East -> Challenge API, Challenge Token
        baseUrl = API_CHALLENGE;
        token = TOKEN_CHALLENGE;
        if (!token) throw new Error('ODPT_API_TOKEN_BACKUP missing for JR-East');
    } else {
        // Strategy C: Metro, MIR -> Developer API, Standard Token
        baseUrl = API_DEV;
        token = TOKEN_DEV;
        if (!token) throw new Error('ODPT_API_TOKEN missing for Metro/MIR');
    }

    const searchParams = new URLSearchParams(params);

    if (token) {
        searchParams.append('acl:consumerKey', token);
    }

    // Filter null/undefined params
    Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);

    const url = `${baseUrl}/${type}?${searchParams.toString()}`;

    const strategyName = operator.includes('Toei') ? 'Public' : (operator.includes('JR') ? 'Challenge' : 'Dev');
    console.log(`[ODPT Client] Fetching (${strategyName}): ${type} for ${operator || 'Unknown'}`);

    // Use retry-enabled fetch with caching via Next.js fetch
    try {
        const res = await fetchWithRetry<any>(url, {
            next: { revalidate: 3600 }
        }, ODPT_RETRY_CONFIG);
        return res;
    } catch (error) {
        // Log and re-throw with context
        const err = error instanceof Error ? error : new Error(String(error));
        console.error(`[ODPT Client] Failed after retries: ${err.message}`);
        throw new Error(`ODPT API Error: ${err.message}`);
    }
}

export const odptClient = {
    getRailways: (operator?: string) => {
        const params: Record<string, string> = {};
        if (operator) params['odpt:operator'] = operator;
        return fetchOdpt<OdptRailway>('odpt:Railway', params);
    },

    getStations: (operator?: string) => {
        const params: Record<string, string> = {};
        if (operator) params['odpt:operator'] = operator;
        return fetchOdpt<OdptStation>('odpt:Station', params);
    },

    getStation: (stationId: string) => {
        return fetchOdpt<OdptStation>('odpt:Station', { 'owl:sameAs': stationId });
    },

    // Note: Timetables are often large, filtering by other params is recommended
    getStationTimetable: (station: string, operator?: string) => {
        const params: Record<string, string> = { 'odpt:station': station };
        if (operator) params['odpt:operator'] = operator;
        // StationTimetable logic might vary, usually type is odpt:StationTimetable
        return fetchOdpt<any>('odpt:StationTimetable', params);
    },

    getTrainTimetable: (operator: string, railDirection?: string, railway?: string) => {
        const params: Record<string, string> = { 'odpt:operator': operator };
        if (railDirection) params['odpt:railDirection'] = railDirection;
        if (railway) params['odpt:railway'] = railway;
        return fetchOdpt<OdptTrainTimetable>('odpt:TrainTimetable', params);
    },

    getFares: (fromStation: string, toStation?: string, operator?: string) => {
        const params: Record<string, string> = {
            'odpt:fromStation': fromStation
        };
        if (toStation) params['odpt:toStation'] = toStation;
        if (operator) params['odpt:operator'] = operator;
        return fetchOdpt<OdptRailwayFare>('odpt:RailwayFare', params);
    },

    getTrainInformation: (operator?: string, railway?: string) => {
        const params: Record<string, string> = {};
        if (operator) params['odpt:operator'] = operator;
        if (railway) params['odpt:railway'] = railway;
        return fetchOdpt<import('./types').OdptTrainInformation>('odpt:TrainInformation', params);
    }
};
