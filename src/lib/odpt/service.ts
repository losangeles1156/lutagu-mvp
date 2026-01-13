
const TOKEN_STANDARD = process.env.ODPT_API_KEY || process.env.ODPT_API_TOKEN || process.env.ODPT_API_KEY_PUBLIC;
const TOKEN_CHALLENGE = process.env.ODPT_API_TOKEN_BACKUP || process.env.ODPT_API_KEY || process.env.ODPT_API_KEY_CHALLENGE2025;

// Base URLs
const BASE_URL_STANDARD = 'https://api.odpt.org/api/v4';
const BASE_URL_CHALLENGE = 'https://api-challenge.odpt.org/api/v4';

const OPERATOR_MAP: Record<string, string[]> = {
    'TokyoMetro': ['odpt.Operator:TokyoMetro'],
    'Toei': ['odpt.Operator:Toei'],
    'JR-East': ['odpt.Operator:JR-East', 'odpt.Operator:jre-is'],
    'Keikyu': ['odpt.Operator:Keikyu'],
    'Seibu': ['odpt.Operator:Seibu'],
    'Tobu': ['odpt.Operator:Tobu'],
    'Tokyu': ['odpt.Operator:Tokyu'],
    'TWR': ['odpt.Operator:TWR'],
    'MIR': ['odpt.Operator:MIR']
};

// Global Request Cache to prevent concurrent fetch storms
declare global {
    var __odptRequestCache: Map<string, { promise: Promise<any[]>, expiresAt: number }> | undefined;
}

if (!globalThis.__odptRequestCache) {
    globalThis.__odptRequestCache = new Map();
}

const CACHE_TTL_MS = 20 * 1000; // 20 seconds deduplication window

async function fetchForOperator(key: string, ids: string[]) {
    // Challenge API operators
    const challengeOperators = ['JR-East', 'Keikyu', 'Seibu', 'Tobu', 'Tokyu'];
    const baseUrl = challengeOperators.includes(key) ? BASE_URL_CHALLENGE : BASE_URL_STANDARD;
    const token = challengeOperators.includes(key) ? TOKEN_CHALLENGE : TOKEN_STANDARD;
    if (!token) return [];

    // Cache Key: Operator + Token Type (Standard/Challenge)
    const cacheKey = `op:${key}`;
    const now = Date.now();

    // Check Cache
    const cached = globalThis.__odptRequestCache?.get(cacheKey);
    if (cached && cached.expiresAt > now) {
        return cached.promise;
    }

    // Create new fetch promise
    const fetchPromise = (async () => {
        // Optimization: Fetch all IDs in parallel but consider batching if API supports it (currently via loop)
        // ODPT v4 supports ?odpt:operator=ID,ID but usually per-railway queries are safer standard
        // We stick to parallel fetch for now, but strictly cached.

        const fetchPromises = ids.map(async (id) => {
            const odptSearchParams = new URLSearchParams({
                'odpt:operator': id,
                'acl:consumerKey': token
            });
            const apiUrl = `${baseUrl}/odpt:TrainInformation?${odptSearchParams.toString()}`;

            try {
                // Remove Next.js excessive revalidate if we are manually caching in RAM
                const res = await fetch(apiUrl);
                if (!res.ok) return [];
                return await res.json();
            } catch (e) {
                console.error(`Fetch failed for ${key} (ID: ${id})`, e);
                return [];
            }
        });

        const results = await Promise.all(fetchPromises);
        return results.flat();
    })();

    // Store in Cache
    globalThis.__odptRequestCache?.set(cacheKey, {
        promise: fetchPromise,
        expiresAt: now + CACHE_TTL_MS
    });

    return fetchPromise;
}

import { fetchYahooStatus, YAHOO_TO_ODPT_MAP } from '@/lib/external/yahooService';

/**
 * Enhanced getTrainStatus with centralized caching
 */
export async function getTrainStatus(operator?: string) {
    if (!TOKEN_STANDARD && !TOKEN_CHALLENGE) {
        // Non-blocking warning instead of throw to allow graceful degradation
        console.warn('Missing ODPT API Key, returning empty status');
        return [];
    }

    // 1. Fetch ODPT Data (Parallel, Cached)
    let odptPromise: Promise<any[]>;
    if (operator && OPERATOR_MAP[operator]) {
        odptPromise = fetchForOperator(operator, OPERATOR_MAP[operator]);
    } else {
        const promises = Object.entries(OPERATOR_MAP).map(([key, ids]) => fetchForOperator(key, ids));
        odptPromise = Promise.all(promises).then(r => r.flat());
    }

    // 2. Fetch Yahoo Data (Parallel) - only scrape if we are fetching all or relevant operators
    // For simplicity, we always fetch Yahoo as it's cached globally
    const yahooPromise = fetchYahooStatus();

    const [odptResults, yahooResults] = await Promise.all([odptPromise, yahooPromise]);

    // 3. Merge Yahoo Data into ODPT Results
    // We create a map of ODPT Railway IDs to Yahoo Status
    const yahooStatusMap = new Map<string, string>();
    yahooResults.forEach(y => {
        // Normalize Yahoo name usually involves full width chars, map handles exact matches
        // But we might need fuzzy match later. For now, try direct map.
        const mappedId = YAHOO_TO_ODPT_MAP[y.name];
        if (mappedId) {
            yahooStatusMap.set(mappedId, y.status);
        }
    });

    // 4. Enhance ODPT items
    const enhancedResults = odptResults.map(item => {
        const railwayId = item['odpt:railway'];
        if (railwayId && yahooStatusMap.has(railwayId)) {
            return {
                ...item,
                'odpt:trainInformationText': {
                    ...item['odpt:trainInformationText'],
                    // Append Yahoo warning to English text or add a specific field
                    en: (item['odpt:trainInformationText']?.en || 'Normal') + ` [Yahoo: ${yahooStatusMap.get(railwayId)}]`
                },
                'secondary_source': 'Yahoo Transit',
                'secondary_status': yahooStatusMap.get(railwayId)
            };
        }
        return item;
    });

    return enhancedResults;
}
