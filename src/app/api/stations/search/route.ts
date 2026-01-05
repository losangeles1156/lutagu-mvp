import { NextRequest, NextResponse } from 'next/server';
import { odptClient } from '@/lib/odpt/client';
import { SEED_NODES } from '@/lib/nodes/seedNodes';

interface StationSearchResult {
    id: string;
    name: { ja?: string; en?: string; 'zh-TW'?: string };
    operator: string;
    railway?: string;
}

// Build fallback station list from seed nodes
function buildFallbackStations(): StationSearchResult[] {
    return SEED_NODES
        .filter(node => node.type === 'station' && node.id.includes('Station:'))
        .map(node => {
            // Parse operator and railway from ID like "odpt:Station:TokyoMetro.Ginza.Ueno"
            const parts = node.id.split(':');
            const stationParts = parts[parts.length - 1].split('.');
            const operator = stationParts[0] || 'Unknown';
            const railway = stationParts.length > 2 ? stationParts[1] : undefined;

            return {
                id: node.id.replace('odpt:', 'odpt.'),
                name: {
                    ja: node.name?.ja,
                    en: node.name?.en,
                    'zh-TW': node.name?.['zh-TW']
                },
                operator,
                railway,
            };
        });
}

// In-memory cache for stations (revalidated every 24 hours)
let stationCache: StationSearchResult[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

async function getStationList(): Promise<StationSearchResult[]> {
    const now = Date.now();
    if (stationCache && stationCache.length > 0 && (now - cacheTimestamp) < CACHE_TTL) {
        return stationCache;
    }

    const allStations: StationSearchResult[] = [];

    try {
        // Fetch stations from all major operators
        const operators = [
            'odpt.Operator:TokyoMetro',
            'odpt.Operator:Toei',
            'odpt.Operator:JR-East',
            'odpt.Operator:Tokyu',
            'odpt.Operator:Tobu',
            'odpt.Operator:Odakyu',
            'odpt.Operator:Keio',
            'odpt.Operator:Seibu',
            'odpt.Operator:Keisei',
            'odpt.Operator:Keikyu', // Added for Haneda Airport access
        ];
        // const allStations was here

        // Fetch in parallel
        const results = await Promise.allSettled(operators.map(op => odptClient.getStations(op)));

        results.forEach((res, idx) => {
            if (res.status === 'fulfilled') {
                const stations = res.value;
                console.log(`[Search API] Fetched ${stations.length} stations for ${operators[idx]}`);
                for (const s of stations) {
                    allStations.push({
                        id: s['owl:sameAs'],
                        name: s['odpt:stationTitle'] || { ja: s['dc:title'] },
                        operator: s['odpt:operator'].replace('odpt.Operator:', ''),
                        railway: s['odpt:railway']?.replace('odpt.Railway:', ''),
                    });
                }
            } else {
                console.warn(`Failed to fetch stations for ${operators[idx]}:`, res.reason);
            }
        });

        if (allStations.length > 0) {
            // allStations are merged below, so no early return here unless we want to skip fallback?
            // But we want to merge always.
        }
    } catch (e) {
        console.error('Failed to fetch stations from ODPT:', e);
    }

    // Always merge with SEED_NODES to ensure core coverage (even if API partially fails)
    console.log(`[Search API] API fetched total: ${allStations.length} stations. Merging with SEED_NODES.`);
    const fallback = buildFallbackStations();
    const mergedMap = new Map<string, StationSearchResult>();

    // Add Fallback first (default)
    fallback.forEach(s => mergedMap.set(s.id, s));

    // Overwrite with API results (fresher data)
    allStations.forEach(s => mergedMap.set(s.id, s));

    const mergedList = Array.from(mergedMap.values());

    if (mergedList.length > 0) {
        stationCache = mergedList;
        cacheTimestamp = now;
        return mergedList;
    }

    return [];
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q')?.toLowerCase().trim() || '';

    if (!query || query.length < 1) {
        return NextResponse.json({ stations: [] });
    }

    try {
        const allStations = await getStationList();

        // Filter stations by name match (ja, en, or zh-TW)
        const matches = allStations.filter(s => {
            const jaName = (s.name.ja || '').toLowerCase();
            const enName = (s.name.en || '').toLowerCase();
            const zhName = (s.name['zh-TW'] || '').toLowerCase();
            const railway = (s.railway || '').toLowerCase();

            return jaName.includes(query) ||
                enName.includes(query) ||
                zhName.includes(query) ||
                railway.includes(query) ||
                s.id.toLowerCase().includes(query);
        });

        // Sort by relevance (exact match first, then by name length)
        matches.sort((a, b) => {
            const aJa = (a.name.ja || '').toLowerCase();
            const bJa = (b.name.ja || '').toLowerCase();
            const aEn = (a.name.en || '').toLowerCase();
            const bEn = (b.name.en || '').toLowerCase();
            const aZh = (a.name['zh-TW'] || '').toLowerCase();
            const bZh = (b.name['zh-TW'] || '').toLowerCase();

            // Exact matches first
            const aExact = aJa === query || aEn === query || aZh === query;
            const bExact = bJa === query || bEn === query || bZh === query;
            if (aExact && !bExact) return -1;
            if (!aExact && bExact) return 1;

            // Starts-with matches next
            const aStarts = aJa.startsWith(query) || aEn.startsWith(query) || aZh.startsWith(query);
            const bStarts = bJa.startsWith(query) || bEn.startsWith(query) || bZh.startsWith(query);
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;

            // Shorter names first (more specific)
            return (aJa.length + aEn.length + aZh.length) - (bJa.length + bEn.length + bZh.length);
        });

        // Return top 10
        const results = matches.slice(0, 10);

        return NextResponse.json({ stations: results }, {
            headers: {
                'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600'
            }
        });

    } catch (error) {
        console.error('Station search error:', error);
        return NextResponse.json({ error: 'Search failed', stations: [] }, { status: 500 });
    }
}
