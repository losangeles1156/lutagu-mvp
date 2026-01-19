


function getTokens() {
    return {
        standard: process.env.ODPT_API_KEY || process.env.ODPT_API_TOKEN || process.env.ODPT_API_KEY_PUBLIC,
        challenge: process.env.ODPT_CHALLENGE_KEY || process.env.ODPT_API_TOKEN_BACKUP || process.env.ODPT_API_KEY || process.env.ODPT_API_KEY_CHALLENGE2025
    };
}



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

import { getRedisCache, initRedisCacheFromEnv } from '@/lib/cache/redisCacheService';
import { createHash } from 'node:crypto';

const redisCache = getRedisCache<any>('odpt');
let redisInit: Promise<any> | null = null;

async function ensureRedis() {
    if (!redisInit) {
        redisInit = initRedisCacheFromEnv();
    }
    return redisInit;
}

declare global {
    var __odptRequestCache: Map<string, { promise: Promise<any[]>, expiresAt: number }> | undefined;
}

if (!globalThis.__odptRequestCache) {
    globalThis.__odptRequestCache = new Map();
}

const MEMORY_DEDUP_TTL_MS = 20 * 1000;
const SHARED_CACHE_TTL_MS = 60 * 1000;

async function fetchForOperator(key: string, ids: string[]) {
    // Challenge API operators
    const challengeOperators = ['JR-East', 'Keikyu', 'Seibu', 'Tobu', 'Tokyu'];
    const baseUrl = challengeOperators.includes(key) ? BASE_URL_CHALLENGE : BASE_URL_STANDARD;
    const tokens = getTokens();
    const token = challengeOperators.includes(key) ? tokens.challenge : tokens.standard;
    if (!token) return [];

    // Cache Key: Operator
    const cacheKey = `op:${key}`;
    const now = Date.now();

    // Check Cache
    const cached = globalThis.__odptRequestCache?.get(cacheKey);
    if (cached && cached.expiresAt > now) {
        return cached.promise;
    }

    await ensureRedis();
    const sharedKey = `odpt:train-info:${cacheKey}`;
    try {
        const sharedCached = await redisCache.get(sharedKey);
        if (sharedCached) {
            globalThis.__odptRequestCache?.set(cacheKey, {
                promise: Promise.resolve(sharedCached),
                expiresAt: now + MEMORY_DEDUP_TTL_MS
            });
            return sharedCached;
        }
    } catch {
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
        const flattened = results.flat();
        try {
            await redisCache.set(sharedKey, flattened, SHARED_CACHE_TTL_MS);
        } catch {
        }
        return flattened;
    })();

    // Store in Cache
    globalThis.__odptRequestCache?.set(cacheKey, {
        promise: fetchPromise,
        expiresAt: now + MEMORY_DEDUP_TTL_MS
    });

    return fetchPromise;
}

import { fetchYahooStatus, YAHOO_TO_ODPT_MAP } from '@/lib/external/yahooService';

type JrEastKantoSnapshot = {
    url: string;
    fetched_at: string;
    http_status: number;
    html_sha256: string;
    html_bytes: number;
    parsed?: {
        updatedAtText?: string;
        lineStatusTextMapJa: Record<string, string>;
    };
};

function sha256Hex(input: string): string {
    try {
        return createHash('sha256').update(input).digest('hex');
    } catch {
        return '';
    }
}

function deriveOfficialStatusFromText(statusTextJa?: string): {
    derived: 'normal' | 'delay' | 'suspended' | 'unknown';
    evidence: string[];
} {
    const t = String(statusTextJa || '').replace(/\s+/g, ' ').trim();
    if (!t) return { derived: 'unknown', evidence: [] };

    const evidence: string[] = [];
    const add = (s: string) => {
        if (!evidence.includes(s)) evidence.push(s);
    };

    if (/(運転見合わせ|見合せ|運転見合せ|運転中止|運休|運転を見合わせ)/.test(t)) {
        add('運転見合わせ/運休');
        return { derived: 'suspended', evidence };
    }
    if (/(遅れ|遅延|ダイヤ乱れ|運転間隔が乱れ|一部運休|列車に遅れ|運転本数が少なく)/.test(t)) {
        add('遅れ/遅延');
        return { derived: 'delay', evidence };
    }
    if (/(平常運転|通常運転|ほぼ平常どおり|おおむね平常)/.test(t)) {
        add('平常運転');
        return { derived: 'normal', evidence };
    }

    return { derived: 'unknown', evidence };
}

function inferOdptOperatorFromRailwayId(railwayId: string): string | null {
    const cleaned = railwayId.replace(/^odpt[.:]Railway:/, '');
    const op = cleaned.split('.')[0];
    if (!op) return null;
    return `odpt.Operator:${op}`;
}

const JR_EAST_RAILWAY_HINT_JA: Record<string, string> = {
    'odpt.Railway:JR-East.Yamanote': '山手線',
    'odpt.Railway:JR-East.KeihinTohoku': '京浜東北線',
    'odpt.Railway:JR-East.ChuoKaisoku': '中央線快速',
    'odpt.Railway:JR-East.ChuoSobu': '中央・総武各駅停車',
    'odpt.Railway:JR-East.SobuKaisoku': '総武快速線',
    'odpt.Railway:JR-East.Saikyo': '埼京線',
    'odpt.Railway:JR-East.ShonanShinjuku': '湘南新宿ライン',
    'odpt.Railway:JR-East.Tokaido': '東海道線',
    'odpt.Railway:JR-East.Keiyo': '京葉線',
    'odpt.Railway:JR-East.Joban': '常磐線'
};

async function fetchJrEastKantoSnapshotCached(): Promise<JrEastKantoSnapshot | null> {
    const cacheKey = 'external:jreast:kanto:snapshot:v1';
    const cached = await redisCache.get(cacheKey);
    if (cached) return cached as JrEastKantoSnapshot;

    const url = 'https://traininfo.jreast.co.jp/train_info/kanto.aspx';
    const fetchedAt = new Date().toISOString();
    try {
        const res = await fetch(url, {
            headers: {
                'user-agent': 'Lutagu/odpt-service',
                'accept': 'text/html,application/xhtml+xml',
                'accept-language': 'ja-JP,ja;q=0.9,en;q=0.5'
            }
        });
        const httpStatus = res.status;
        const html = await res.text();
        const lineStatusTextMapJa: Record<string, string> = {};
        const linesToCheck = Array.from(new Set(Object.values(JR_EAST_RAILWAY_HINT_JA)));
        for (const ln of linesToCheck) {
            const idx = html.indexOf(ln);
            if (idx >= 0) {
                const window = html.slice(Math.max(0, idx - 200), Math.min(html.length, idx + 400));
                const cleaned = window
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
                lineStatusTextMapJa[ln] = cleaned;
            }
        }

        const updatedAtText = (() => {
            const m = html.match(/(更新\s*[:：]?\s*\d{1,2}[:：]\d{2})/);
            return m?.[1];
        })();

        const snap: JrEastKantoSnapshot = {
            url,
            fetched_at: fetchedAt,
            http_status: httpStatus,
            html_sha256: sha256Hex(html),
            html_bytes: Buffer.byteLength(html, 'utf-8'),
            parsed: {
                updatedAtText,
                lineStatusTextMapJa
            }
        };

        await redisCache.set(cacheKey, snap, 60_000);
        return snap;
    } catch {
        return null;
    }
}

export async function getTrainStatus(operator?: string) {
    const tokens = getTokens();
    if (!tokens.standard && !tokens.challenge) {
        console.warn('Missing ODPT API Key, returning empty status');
        return [];
    }

    let odptPromise: Promise<any[]>;
    if (operator && OPERATOR_MAP[operator]) {
        odptPromise = fetchForOperator(operator, OPERATOR_MAP[operator]);
    } else {
        const promises = Object.entries(OPERATOR_MAP).map(([key, ids]) => fetchForOperator(key, ids));
        odptPromise = Promise.all(promises).then(r => r.flat());
    }

    const yahooPromise = fetchYahooStatus();

    const [odptResults, yahooResults] = await Promise.all([odptPromise, yahooPromise]);

    const yahooStatusMap = new Map<string, string>();
    const yahooNameByRailway = new Map<string, string>();
    for (const y of yahooResults) {
        const mappedId = YAHOO_TO_ODPT_MAP[y.name];
        if (!mappedId) continue;
        yahooStatusMap.set(mappedId, y.status);
        yahooNameByRailway.set(mappedId, y.name);
    }

    const odptRailways = new Set<string>();
    for (const item of odptResults) {
        const railwayId = item?.['odpt:railway'];
        if (typeof railwayId === 'string' && railwayId) odptRailways.add(railwayId);
    }

    const jrEastNeedsConfirm = Array.from(yahooStatusMap.keys()).some((rid) => rid.startsWith('odpt.Railway:JR-East.'));
    const jrEastSnapshot = jrEastNeedsConfirm ? await fetchJrEastKantoSnapshotCached() : null;

    const shouldInjectYahoo = (railwayId: string): { ok: boolean; official?: { derived: string; snippet?: string } } => {
        if (!railwayId.startsWith('odpt.Railway:JR-East.')) return { ok: true };
        const hintJa = JR_EAST_RAILWAY_HINT_JA[railwayId];
        if (!hintJa) return { ok: true };
        const snippet = jrEastSnapshot?.parsed?.lineStatusTextMapJa?.[hintJa];
        const derived = deriveOfficialStatusFromText(snippet);
        if (derived.derived === 'normal') return { ok: false, official: { derived: derived.derived, snippet } };
        return { ok: true, official: { derived: derived.derived, snippet } };
    };

    const injectedFromYahoo: any[] = [];
    for (const [railwayId, yahooStatus] of yahooStatusMap.entries()) {
        if (odptRailways.has(railwayId)) continue;
        const check = shouldInjectYahoo(railwayId);
        if (!check.ok) continue;

        const operatorId = inferOdptOperatorFromRailwayId(railwayId);
        const yahooName = yahooNameByRailway.get(railwayId) || railwayId;
        const officialTag = (() => {
            const derived = check.official?.derived;
            if (!derived || derived === 'unknown') return '';
            return ` [JR-East: ${derived}]`;
        })();

        injectedFromYahoo.push({
            '@id': `synthetic:yahoo:${railwayId}`,
            'owl:sameAs': `yahoo:${railwayId}`,
            'odpt:operator': operatorId,
            'odpt:railway': railwayId,
            'odpt:trainInformationStatus': { ja: '運行情報', en: 'Service Update' },
            'odpt:trainInformationText': {
                ja: `[Yahoo] ${yahooName}: ${yahooStatus}${officialTag}`,
                en: `[Yahoo] ${yahooName}: ${yahooStatus}${officialTag}`,
                'zh-TW': `[Yahoo] ${yahooName}: ${yahooStatus}${officialTag}`
            },
            'dc:date': new Date().toISOString(),
            secondary_source: 'Yahoo Transit',
            secondary_status: yahooStatus
        });
    }

    const enhancedResults = odptResults.map(item => {
        const railwayId = item['odpt:railway'];
        if (railwayId && yahooStatusMap.has(railwayId)) {
            const yahooStatus = yahooStatusMap.get(railwayId);
            const yahooName = yahooNameByRailway.get(railwayId);
            const suffix = yahooStatus ? ` [Yahoo: ${yahooStatus}${yahooName ? ` / ${yahooName}` : ''}]` : '';

            const existingText = item['odpt:trainInformationText'];
            const existingTextObj = (typeof existingText === 'object' && existingText !== null) ? existingText : {};
            const baseEn = (typeof existingText === 'object' && existingText !== null && typeof existingText.en === 'string')
                ? existingText.en
                : (typeof existingText === 'string' ? existingText : 'Normal');
            const baseJa = (typeof existingText === 'object' && existingText !== null && typeof existingText.ja === 'string')
                ? existingText.ja
                : (typeof existingText === 'string' ? existingText : '');

            return {
                ...item,
                'odpt:trainInformationText': {
                    ...existingTextObj,
                    ja: (existingTextObj as any).ja ?? baseJa,
                    en: baseEn + suffix
                },
                secondary_source: 'Yahoo Transit',
                secondary_status: yahooStatus
            };
        }
        return item;
    });

    return [...enhancedResults, ...injectedFromYahoo];
}
