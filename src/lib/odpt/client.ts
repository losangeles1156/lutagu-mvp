import { OdptRailway, OdptStation, OdptTrainTimetable, OdptRailwayFare } from './types';

const API_PUBLIC = 'https://api-public.odpt.org/api/v4';
const API_DEV = 'https://api.odpt.org/api/v4';
const API_CHALLENGE = 'https://api-challenge.odpt.org/api/v4';

const TOKEN_DEV = process.env.ODPT_API_TOKEN;        // For Metro, MIR
const TOKEN_CHALLENGE = process.env.ODPT_API_TOKEN_BACKUP; // For JR East

async function fetchOdpt<T>(type: string, params: Record<string, string> = {}): Promise<T[]> {
    const operator = params['odpt:operator'] || '';

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

    const res = await fetch(url, {
        next: { revalidate: 3600 }
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`ODPT API Error (${res.status}): ${text}`);
    }

    return res.json();
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

    getFares: (fromStation: string, toStation: string, operator?: string) => {
        const params: Record<string, string> = {
            'odpt:fromStation': fromStation,
            'odpt:toStation': toStation
        };
        if (operator) params['odpt:operator'] = operator;
        return fetchOdpt<OdptRailwayFare>('odpt:RailwayFare', params);
    }
};
