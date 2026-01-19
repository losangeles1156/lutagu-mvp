import {
    OdptRailway,
    OdptStation,
    OdptTrainTimetable,
    OdptRailwayFare,
    OdptBus,
    OdptBusroutePattern,
    OdptBusTimetable,
    OdptBusstopPole,
    OdptBusstopPoleTimetable
} from './types';
import { fetchWithRetry, RetryConfig } from '@/lib/utils/retry';

const API_PUBLIC = 'https://api-public.odpt.org/api/v4';
const API_DEV = 'https://api.odpt.org/api/v4';
const API_CHALLENGE = 'https://api-challenge.odpt.org/api/v4';

// Updated Token Mapping for clear separation
const TOKENS = {
    METRO: process.env.ODPT_API_KEY_METRO || process.env.ODPT_API_TOKEN_STANDARD || process.env.ODPT_API_KEY,
    JR_EAST: process.env.ODPT_API_KEY_JR_EAST || process.env.ODPT_API_TOKEN_CHALLENGE || process.env.ODPT_CHALLENGE_KEY || process.env.ODPT_API_TOKEN_BACKUP,
    PUBLIC: process.env.ODPT_API_KEY_PUBLIC || process.env.ODPT_API_KEY_PUBLIC_DEV
};

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
            if (id.includes('MIR')) { operator = 'MIR'; break; }
            if (id.includes('Keio')) { operator = 'Keio'; break; }
            if (id.includes('Keikyu')) { operator = 'Keikyu'; break; }
            if (id.includes('Keisei')) { operator = 'Keisei'; break; }
            if (id.includes('Odakyu')) { operator = 'Odakyu'; break; }
            if (id.includes('Seibu')) { operator = 'Seibu'; break; }
            if (id.includes('Tobu')) { operator = 'Tobu'; break; }
            if (id.includes('Tokyu')) { operator = 'Tokyu'; break; }
            if (id.includes('Yurikamome')) { operator = 'Yurikamome'; break; }
        }
    }

    // Strategy Selection
    let baseUrl = API_DEV;
    let token = TOKENS.METRO;

    if (operator.includes('Toei')) {
        // Strategy A: Toei -> Public API, Optional Public Token
        baseUrl = API_PUBLIC;
        token = TOKENS.PUBLIC;
    } else if (operator.includes('JR-East') || operator.includes('Keio') || operator.includes('Keikyu') ||
               operator.includes('Keisei') || operator.includes('Odakyu') || operator.includes('Seibu') ||
               operator.includes('Tobu') || operator.includes('Tokyu') || operator.includes('Yurikamome')) {
        // Strategy B: JR East & Private Railways -> Challenge API, JR East/Challenge Token
        baseUrl = API_CHALLENGE;
        token = TOKENS.JR_EAST;
        if (!token) throw new Error(`ODPT_API_KEY_JR_EAST missing for ${operator} (Challenge API)`);
    } else {
        // Strategy C: Metro, MIR -> Developer API, Metro Token
        baseUrl = API_DEV;
        token = TOKENS.METRO;
        if (!token) throw new Error('ODPT_API_KEY_METRO missing for Metro/MIR (Developer API)');
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
        const response = await fetch(url, {
            next: { revalidate: 3600 }
        });

        if (response.status === 403) {
            console.warn(`[ODPT Client] 403 Forbidden for ${operator} via ${strategyName}. Check API keys.`);
            // Fallback for Strategy B (Challenge) -> Try Strategy A (Public) if applicable
            if (strategyName === 'Challenge' && TOKENS.PUBLIC) {
                const fallbackUrl = `${API_PUBLIC}/${type}?${searchParams.toString()}`;
                console.log(`[ODPT Client] Attempting fallback to Public API for ${operator}...`);
                const fallbackRes = await fetch(fallbackUrl, { next: { revalidate: 3600 } });
                if (fallbackRes.ok) return await fallbackRes.json();
            }
            return [] as any; // Graceful failure
        }

        if (!response.ok) {
            throw new Error(`ODPT API error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error(`[ODPT Client] Failed: ${err.message}`);
        return [] as any;
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
    },

    getBusroutePatterns: (options?: { operator?: string; title?: string; busroute?: string; sameAs?: string }) => {
        const params: Record<string, string> = {};
        if (options?.operator) params['odpt:operator'] = options.operator;
        if (options?.title) params['dc:title'] = options.title;
        if (options?.busroute) params['odpt:busroute'] = options.busroute;
        if (options?.sameAs) params['owl:sameAs'] = options.sameAs;
        return fetchOdpt<OdptBusroutePattern>('odpt:BusroutePattern', params);
    },

    getBusTimetables: (options?: { operator?: string; calendar?: string; busroutePattern?: string; sameAs?: string }) => {
        const params: Record<string, string> = {};
        if (options?.operator) params['odpt:operator'] = options.operator;
        if (options?.calendar) params['odpt:calendar'] = options.calendar;
        if (options?.busroutePattern) params['odpt:busroutePattern'] = options.busroutePattern;
        if (options?.sameAs) params['owl:sameAs'] = options.sameAs;
        return fetchOdpt<OdptBusTimetable>('odpt:BusTimetable', params);
    },

    getBusstopPoles: (options?: { operator?: string; title?: string; busroutePattern?: string; busstopPoleNumber?: string; sameAs?: string }) => {
        const params: Record<string, string> = {};
        if (options?.operator) params['odpt:operator'] = options.operator;
        if (options?.title) params['dc:title'] = options.title;
        if (options?.busroutePattern) params['odpt:busroutePattern'] = options.busroutePattern;
        if (options?.busstopPoleNumber) params['odpt:busstopPoleNumber'] = options.busstopPoleNumber;
        if (options?.sameAs) params['owl:sameAs'] = options.sameAs;
        return fetchOdpt<OdptBusstopPole>('odpt:BusstopPole', params);
    },

    getBusstopPolesNearby: (options: { lat: number; lon: number; radiusMeters?: number; operator?: string }) => {
        const params: Record<string, string> = {
            'geo:lat': String(options.lat),
            'geo:long': String(options.lon)
        };
        if (typeof options.radiusMeters === 'number') params['geo:radius'] = String(options.radiusMeters);
        if (options.operator) params['odpt:operator'] = options.operator;
        return fetchOdpt<OdptBusstopPole>('odpt:BusstopPole', params);
    },

    getBusstopPoleTimetables: (options?: { operator?: string; calendar?: string; busstopPole?: string; busroute?: string; busDirection?: string; sameAs?: string }) => {
        const params: Record<string, string> = {};
        if (options?.operator) params['odpt:operator'] = options.operator;
        if (options?.calendar) params['odpt:calendar'] = options.calendar;
        if (options?.busstopPole) params['odpt:busstopPole'] = options.busstopPole;
        if (options?.busroute) params['odpt:busroute'] = options.busroute;
        if (options?.busDirection) params['odpt:busDirection'] = options.busDirection;
        if (options?.sameAs) params['owl:sameAs'] = options.sameAs;
        return fetchOdpt<OdptBusstopPoleTimetable>('odpt:BusstopPoleTimetable', params);
    },

    getBuses: (options?: { operator?: string; busroutePattern?: string; fromBusstopPole?: string; toBusstopPole?: string; sameAs?: string }) => {
        const params: Record<string, string> = {};
        if (options?.operator) params['odpt:operator'] = options.operator;
        if (options?.busroutePattern) params['odpt:busroutePattern'] = options.busroutePattern;
        if (options?.fromBusstopPole) params['odpt:fromBusstopPole'] = options.fromBusstopPole;
        if (options?.toBusstopPole) params['odpt:toBusstopPole'] = options.toBusstopPole;
        if (options?.sameAs) params['owl:sameAs'] = options.sameAs;
        return fetchOdpt<OdptBus>('odpt:Bus', params);
    }
};
