
const TOKEN_STANDARD = process.env.ODPT_API_KEY || process.env.ODPT_API_TOKEN || process.env.ODPT_API_KEY_PUBLIC;
const TOKEN_CHALLENGE = process.env.ODPT_API_TOKEN_BACKUP || process.env.ODPT_API_KEY || process.env.ODPT_API_KEY_CHALLENGE2025;

const BASE_URL_STANDARD = 'https://api.odpt.org/api/v4';
const BASE_URL_CHALLENGE = 'https://api-challenge.odpt.org/api/v4';

const OPERATOR_MAP: Record<string, string[]> = {
    'TokyoMetro': ['odpt.Operator:TokyoMetro'],
    'Toei': ['odpt.Operator:Toei'],
    'JR-East': ['odpt.Operator:JR-East', 'odpt.Operator:jre-is'],
    'Keikyu': ['odpt.Operator:Keikyu'],
    'Keisei': ['odpt.Operator:Keisei'],
    'TokyoMonorail': ['odpt.Operator:TokyoMonorail'],
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
    const token = challengeOperators.includes(key) ? TOKEN_CHALLENGE : TOKEN_STANDARD;
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

export function deriveOfficialStatusFromText(statusTextJa?: string): {
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
    if (/(遅れ|遅延|ダイヤ乱れ|運転間隔が乱れ|一部運休|列車に遅れ|運転本数が少なく|運行状況|お知らせがあります)/.test(t)) {
        add('遅れ/遲延/運行狀況');
        return { derived: 'delay', evidence };
    }
    if (/(平常運転|通常運転|ほぼ平常どおり|おおむね平常|見合わせていましたが|再開しました)/.test(t)) {
        add('平常運転/恢復');
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
    'odpt.Railway:JR-East.SobuKaisoku': '總武快速線',
    'odpt.Railway:JR-East.Saikyo': '埼京線',
    'odpt.Railway:JR-East.ShonanShinjuku': '湘南新宿ライン',
    'odpt.Railway:JR-East.Tokaido': '東海道線',
    'odpt.Railway:JR-East.Keiyo': '京葉線',
    'odpt.Railway:JR-East.Joban': '常磐線',
    'odpt.Railway:JR-East.Utsunomiya': '宇都宮線',
    'odpt.Railway:JR-East.Takasaki': '高崎線',
    'odpt.Railway:JR-East.Narita': '成田線',
    'odpt.Railway:JR-East.UenoTokyo': '上野東京ライン',
    'odpt.Railway:JR-East.Musashino': '武蔵野線',
    'odpt.Railway:JR-East.Hachiko': '八高線',
    'odpt.Railway:JR-East.Negishi': '根岸線',
    'odpt.Railway:JR-East.Nambu': '南武線',
    'odpt.Railway:JR-East.Yokohama': '横浜線',
    'odpt.Railway:JR-East.Itsukaichi': '五日市線',
    'odpt.Railway:JR-East.Ome': '青梅線'
};

const RELATED_LINES: Record<string, string[]> = {
    'odpt.Railway:JR-East.ChuoKaisoku': ['odpt.Railway:JR-East.ChuoSobu', 'odpt.Railway:JR-East.Ome'],
    'odpt.Railway:JR-East.ChuoSobu': ['odpt.Railway:JR-East.ChuoKaisoku', 'odpt.Railway:JR-East.SobuKaisoku'],
    'odpt.Railway:JR-East.Yamanote': ['odpt.Railway:JR-East.Saikyo', 'odpt.Railway:JR-East.ShonanShinjuku', 'odpt.Railway:JR-East.KeihinTohoku'],
    'odpt.Railway:JR-East.KeihinTohoku': ['odpt.Railway:JR-East.Yamanote', 'odpt.Railway:JR-East.Negishi'],
    'odpt.Railway:JR-East.SobuKaisoku': ['odpt.Railway:JR-East.Yokosuka', 'odpt.Railway:JR-East.Narita'],
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
    if (!TOKEN_STANDARD && !TOKEN_CHALLENGE) {
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

    const odptRailwaysWithTrouble = new Set<string>();
    for (const item of odptResults) {
        const railwayId = item?.['odpt:railway'];
        const textObj = item?.['odpt:trainInformationText'];
        const text = (typeof textObj === 'object' && textObj) ? (textObj.ja || '') : String(textObj || '');
        const derived = deriveOfficialStatusFromText(text);
        if (derived.derived !== 'normal' && typeof railwayId === 'string') {
            odptRailwaysWithTrouble.add(railwayId);
        }
    }

    const jrEastSnapshot = (operator === 'JR-East' || !operator) ? await fetchJrEastKantoSnapshotCached() : null;

    const enhancedResults = odptResults.map(item => {
        const railwayId = item['odpt:railway'];
        const isYahooReporting = railwayId && yahooStatusMap.has(railwayId);

        let trust_level: 'verified' | 'unverified' | 'discrepancy' = 'unverified';
        let confidence = 0.7;

        const textObj = item['odpt:trainInformationText'];
        const jaText = (typeof textObj === 'object' && textObj) ? (textObj.ja || '') : String(textObj || '');
        const derived = deriveOfficialStatusFromText(jaText).derived;

        if (derived !== 'normal') {
            if (isYahooReporting) {
                trust_level = 'verified';
                confidence = 1.0;
            } else if (railwayId && railwayId.startsWith('odpt.Railway:JR-East.')) {
                // Check JR-East snapshot
                const hint = JR_EAST_RAILWAY_HINT_JA[railwayId];
                const snippet = hint ? jrEastSnapshot?.parsed?.lineStatusTextMapJa?.[hint] : null;
                const snapDerived = deriveOfficialStatusFromText(snippet || '').derived;
                if (snapDerived !== 'normal' && snapDerived !== 'unknown') {
                    trust_level = 'verified';
                    confidence = 0.95;
                }
            }
        }

        const suffix = isYahooReporting ? ` [Yahoo: Verified]` : '';
        const existingTextObj = (typeof textObj === 'object' && textObj !== null) ? textObj : {};

        return {
            ...item,
            'odpt:trainInformationText': {
                ...existingTextObj,
                ja: jaText,
                en: ((existingTextObj as any).en || 'Delay information') + suffix
            },
            trust_level,
            confidence,
            secondary_source: isYahooReporting ? 'Yahoo Transit' : undefined,
            secondary_status: isYahooReporting ? yahooStatusMap.get(railwayId) : undefined
        };
    });

    const injectedFromYahoo: any[] = [];
    for (const [railwayId, yahooStatus] of yahooStatusMap.entries()) {
        const hasOdptTrouble = odptRailwaysWithTrouble.has(railwayId);
        if (hasOdptTrouble) continue;

        // Check if ODPT has the railway at all (might be normal)
        const odptItem = odptResults.find(r => r['odpt:railway'] === railwayId);
        const odptText = odptItem?.['odpt:trainInformationText'];
        const odptJa = (typeof odptText === 'object' && odptText) ? (odptText.ja || '') : String(odptText || '');
        const odptDerived = deriveOfficialStatusFromText(odptJa).derived;

        let trust_level: 'verified' | 'unverified' | 'discrepancy' = 'unverified';
        let confidence = 0.5;

        if (odptDerived === 'normal') {
            trust_level = 'discrepancy';
            confidence = 0.3;
        }

        const operatorId = inferOdptOperatorFromRailwayId(railwayId);
        const yahooName = yahooNameByRailway.get(railwayId) || railwayId;

        injectedFromYahoo.push({
            '@id': `synthetic:yahoo:${railwayId}`,
            'owl:sameAs': `yahoo:${railwayId}`,
            'odpt:operator': operatorId,
            'odpt:railway': railwayId,
            'odpt:trainInformationStatus': { ja: '運行情報 (Yahoo)', en: 'Service Update (Yahoo)' },
            'odpt:trainInformationText': {
                ja: `[Yahoo] ${yahooName}: ${yahooStatus}`,
                en: `[Yahoo] ${yahooName}: ${yahooStatus}`,
                'zh-TW': `[Yahoo] ${yahooName}: ${yahooStatus}`
            },
            'dc:date': new Date().toISOString(),
            trust_level,
            confidence,
            secondary_source: 'Yahoo Transit',
            secondary_status: yahooStatus
        });
    }

    const finalResults = [...enhancedResults, ...injectedFromYahoo];

    // Basic Cascade Propagation: Mark related lines as "risk"
    const troubledLines = new Set(finalResults
        .filter(r => deriveOfficialStatusFromText(r['odpt:trainInformationText']?.ja).derived !== 'normal')
        .map(r => r['odpt:railway']));

    return finalResults.map(r => {
        const railwayId = r['odpt:railway'];
        const relatedToTrouble = Object.entries(RELATED_LINES).some(([main, subs]) =>
            troubledLines.has(main) && subs.includes(railwayId)
        );

        if (relatedToTrouble && deriveOfficialStatusFromText(r['odpt:trainInformationText']?.ja).derived === 'normal') {
            return {
                ...r,
                cascade_risk: true,
                'odpt:trainInformationStatus': {
                    ja: '関連路線の遅延',
                    en: 'Related Line Delay Risk',
                    'zh-TW': '關聯路線延誤風險'
                }
            };
        }
        return r;
    });
}


export async function getTrains(operator?: string) {
    if (!TOKEN_STANDARD && !TOKEN_CHALLENGE) {
        return [];
    }

    const type = 'odpt:Train';
    // Similar logic to fetchForOperator but for 'odpt:Train'
    // We can reuse the internal logic if we refactor, but for now let's duplicate the relevant parts for safety
    // or better yet, make a generic fetcher.
    // However, since we can't easily change the private 'fetchForOperator' signature without affecting existing code flow broadly...
    // Let's implement a specific fetcher for trains.

    // We need to fetch from the correct base URL based on operator
    const targetOperators = operator ? [operator] : Object.keys(OPERATOR_MAP);

    const promises = targetOperators.map(async (opKey) => {
        const ids = OPERATOR_MAP[opKey];
        if (!ids) return [];

        // Challenge API operators check
        const challengeOperators = ['JR-East', 'Keikyu', 'Seibu', 'Tobu', 'Tokyu'];
        const baseUrl = challengeOperators.includes(opKey) ? BASE_URL_CHALLENGE : BASE_URL_STANDARD;
        const token = challengeOperators.includes(opKey) ? TOKEN_CHALLENGE : TOKEN_STANDARD;
        if (!token) return [];

        // Parallel fetch for each operator ID
        // Note: odpt:Train API supports filtering by odpt:operator
        const opPromises = ids.map(async (id) => {
            const params = new URLSearchParams({
                'odpt:operator': id,
                'acl:consumerKey': token
            });
            const url = `${baseUrl}/${type}?${params.toString()}`;
            try {
                const res = await fetch(url, { next: { revalidate: 30 } }); // Short cache for live trains
                if (!res.ok) return [];
                return await res.json();
            } catch (e) {
                console.error(`Failed to fetch trains for ${id}`, e);
                return [];
            }
        });

        const results = await Promise.all(opPromises);
        return results.flat();
    });

    const results = await Promise.all(promises);
    return results.flat();
}
