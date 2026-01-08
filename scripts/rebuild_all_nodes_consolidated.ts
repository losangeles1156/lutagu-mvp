
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!
);

const ODPT_API_URL = "https://api-challenge.odpt.org/api/v4/odpt:Station";
const ODPT_TOKEN = process.env.ODPT_API_TOKEN_CHALLENGE ||
    process.env.ODPT_API_TOKEN ||
    process.env.ODPT_AUTH_TOKEN ||
    process.env.NEXT_PUBLIC_ODPT_TOKEN;

// Geographic Bounds (Tokyo 23 + Narita)
const BOUNDS = {
    // Tokyo 23 Wards (Rough Box)
    TOKYO: {
        minLat: 35.50, maxLat: 35.85,
        minLon: 139.55, maxLon: 139.95
    },
    TOKYO_SUBURB: {
        minLat: 35.50, maxLat: 35.90, // Slightly wider for through services
        minLon: 139.40, maxLon: 140.10
    },
    // Narita Airport Area
    NARITA: {
        minLat: 35.75, maxLat: 35.80,
        minLon: 140.35, maxLon: 140.40
    }
};

function isInBounds(lat: number, lon: number): boolean {
    if (lat >= BOUNDS.TOKYO.minLat && lat <= BOUNDS.TOKYO.maxLat &&
        lon >= BOUNDS.TOKYO.minLon && lon <= BOUNDS.TOKYO.maxLon) return true;
    if (lat >= BOUNDS.NARITA.minLat && lat <= BOUNDS.NARITA.maxLat &&
        lon >= BOUNDS.NARITA.minLon && lon <= BOUNDS.NARITA.maxLon) return true;
    return false;
}

// SHARED TERMINAL RULES (Priority Operator)
// Map shared station name -> Operator to KEEP (primary)
const SHARED_TERMINAL_PRIORITY: Record<string, string> = {
    'Ayase': 'TokyoMetro', // Metro Chiyoda > JR Joban (Local)
    'Oshiage': 'TokyoMetro', // Metro Hanzomon > Tobu? No, Oshiage has 4 lines.
};

const OPERATOR_PRIORITY = [
    'JR-East',
    'TokyoMetro',
    'Toei',
    'Tokyu', 'Keikyu', 'Odakyu', 'Keio', 'Seibu', 'Tobu', 'Keisei',
    'TokyoMonorail', 'Yurikamome', 'TWR', 'Mirai'
];

function getPriorityOperator(operators: string[], stationName: string): string {
    // Specific Overrides for Shared Terminals
    if (stationName === 'Ayase') return 'odpt.Operator:TokyoMetro';
    if (stationName === 'Meguro') return 'odpt.Operator:JR-East'; // JR has own station, huge.
    if (stationName === 'Oshiage') return 'odpt.Operator:TokyoMetro'; // Hanzomon is key? Or Toei? Metro is central.
    if (stationName === 'Shinjuku') return 'odpt.Operator:JR-East';
    if (stationName === 'Shibuya') return 'odpt.Operator:JR-East';

    // General Priority
    for (const p of OPERATOR_PRIORITY) {
        const match = operators.find(o => o.includes(p));
        if (match) return match;
    }
    return operators[0]; // Fallback
}

// Consolidated ID Generation
function toPascalCase(str: string) {
    return str.replace(/[^a-zA-Z0-9]/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('');
}

function getSafeId(operator: string, nameEn: string) {
    // extract "JR-East", "TokyoMetro" etc from "odpt.Operator:JR-East"
    const opShort = operator.split(':').pop();
    return `odpt.Station:${opShort}.${toPascalCase(nameEn)}`;
}

// ----------------------------------------------------

class GeocodingService {
    private cachePath = path.resolve(process.cwd(), 'scripts/cache/station_locations.json');
    private cache: Record<string, { lat: number; lon: number }> = {};
    private lastRequestTime = 0;

    constructor() {
        if (fs.existsSync(this.cachePath)) {
            try {
                this.cache = JSON.parse(fs.readFileSync(this.cachePath, 'utf8'));
                console.log(`[Geocoding] Loaded ${Object.keys(this.cache).length} locations from cache.`);
            } catch (e) {
                console.error('[Geocoding] Failed to load cache', e);
            }
        }
    }

    async getCoordinates(nameEn: string): Promise<{ lat: number; lon: number } | null> {
        // Clean name for cache key
        const key = nameEn.replace(/\?/g, '').trim();

        // 1. Check Cache
        if (this.cache[key]) {
            return this.cache[key];
        }

        // 2. Fetch from Nominatim
        return await this.fetchFromNominatim(key);
    }

    private async fetchFromNominatim(queryName: string): Promise<{ lat: number; lon: number } | null> {
        // Retry strategies
        const strategies = [
            `${queryName} Station Tokyo`,
            `${queryName} Station`,
            `${queryName} Tokyo`,
            queryName
        ];

        for (const query of strategies) {
            // Rate Limit (1.5s)
            const now = Date.now();
            if (now - this.lastRequestTime < 1500) {
                await new Promise(r => setTimeout(r, 1500 - (now - this.lastRequestTime)));
            }

            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
            console.log(`[Geocoding] Fetching "${query}"...`);

            try {
                const res = await fetch(url, {
                    headers: { 'User-Agent': 'LUTAGU-Indexer/1.0' }
                });
                this.lastRequestTime = Date.now();

                if (!res.ok) {
                    console.error(`[Geocoding] API Error: ${res.status}`);
                    continue;
                }

                const data = await res.json();
                if (data && data.length > 0) {
                    const lat = parseFloat(data[0].lat);
                    const lon = parseFloat(data[0].lon);

                    // Update Cache
                    this.cache[queryName] = { lat, lon }; // Cache key is original name
                    this.saveCache();

                    return { lat, lon };
                }
            } catch (e) {
                console.error('[Geocoding] Request failed', e);
            }
        }
        console.warn(`[Geocoding] No results for ${queryName} after all retries.`);
        return null;
    }

    private saveCache() {
        try {
            fs.writeFileSync(this.cachePath, JSON.stringify(this.cache, null, 2));
        } catch (e) {
            console.error('[Geocoding] Failed to save cache', e);
        }
    }
}

async function fetchOdptStations(operator: string) {
    if (!ODPT_TOKEN) throw new Error("Missing ODPT Token");
    const url = `${ODPT_API_URL}?odpt:operator=${operator}&acl:consumerKey=${ODPT_TOKEN}`;
    console.log(`Fetching ${operator}...`);
    const res = await fetch(url);
    if (!res.ok) {
        console.error(`Failed to fetch ${operator}: ${res.status}`);
        return [];
    }
    return await res.json();
}

async function main() {
    console.log('=== Rebuilding ALL Nodes (Consolidated) ===');
    const geocodingService = new GeocodingService();

    // [UPDATED] Robust Fetch Strategy: Fetch specific railways for large operators to avoid truncation
    const RAILWAYS_TO_FETCH = [
        // Tokyo Metro
        'odpt.Railway:TokyoMetro.Ginza', 'odpt.Railway:TokyoMetro.Marunouchi', 'odpt.Railway:TokyoMetro.Hibiya',
        'odpt.Railway:TokyoMetro.Tozai', 'odpt.Railway:TokyoMetro.Chiyoda', 'odpt.Railway:TokyoMetro.Yurakucho',
        'odpt.Railway:TokyoMetro.Hanzomon', 'odpt.Railway:TokyoMetro.Namboku', 'odpt.Railway:TokyoMetro.Fukutoshin',
        // Toei Subway
        'odpt.Railway:Toei.Asakusa', 'odpt.Railway:Toei.Mita', 'odpt.Railway:Toei.Shinjuku', 'odpt.Railway:Toei.Oedo',
        'odpt.Railway:Toei.NipporiToneri', 'odpt.Railway:Toei.TodenArakawa'
    ];

    const OPERATORS_TO_FETCH = [
        'odpt.Operator:JR-East', // JR seems fine in bulk (887 stats), but if missing, split lines? JR worked before.
        'odpt.Operator:Keikyu',
        'odpt.Operator:Tokyu',
        'odpt.Operator:Odakyu',
        'odpt.Operator:Keio',
        'odpt.Operator:Seibu',
        'odpt.Operator:Tobu',
        'odpt.Operator:Keisei',
        'odpt.Operator:TokyoMonorail',
        'odpt.Operator:Yurikamome',
        'odpt.Operator:TWR',
        'odpt.Operator:Mirai'
    ];

    // [ADDED] External Data Source Map
    const LINE_CODE_MAP: Record<string, string> = {
        'G': 'odpt.Railway:TokyoMetro.Ginza',
        'M': 'odpt.Railway:TokyoMetro.Marunouchi',
        'Mb': 'odpt.Railway:TokyoMetro.Marunouchi',
        'H': 'odpt.Railway:TokyoMetro.Hibiya',
        'T': 'odpt.Railway:TokyoMetro.Tozai',
        'C': 'odpt.Railway:TokyoMetro.Chiyoda',
        'Y': 'odpt.Railway:TokyoMetro.Yurakucho',
        'Z': 'odpt.Railway:TokyoMetro.Hanzomon',
        'N': 'odpt.Railway:TokyoMetro.Namboku',
        'F': 'odpt.Railway:TokyoMetro.Fukutoshin',
        'A': 'odpt.Railway:Toei.Asakusa',
        'I': 'odpt.Railway:Toei.Mita',
        'S': 'odpt.Railway:Toei.Shinjuku',
        'E': 'odpt.Railway:Toei.Oedo'
    };

    // [ADDED] Typo Correction Map for External Data
    const TYPO_MAP: Record<string, string> = {
        'Lidabashi': 'Iidabashi',
        'Shin-egato': 'Shin-egota',
        'Netima': 'Nerima',
        'Naerima-kasugacho': 'Nerima-kasugacho',
        'Ometo-sando': 'Omotesando',
        'Tameiki-sanno': 'Tameike-sanno',
        'Hagashi-shinjuku': 'Higashi-shinjuku',
        'Shinmura-sakaue': 'Shimura-sakaue',
        'Shgimura-sanchome': 'Shimura-sanchome',
        'Hasuna': 'Hasune',
        'Gotando': 'Gotanda',
        'Yotasuya': 'Yotsuya',
        'Akasaka-mutsuke': 'Akasaka-mitsuke',
        'Kokki-gijidomae': 'Kokkai-gijidomae',
        'Nonancho': 'Honancho'
    };

    async function fetchExternalStations() {
        console.log('Fetching external station data (Jugendhackt)...');
        try {
            const res = await fetch('https://raw.githubusercontent.com/Jugendhackt/tokyo-metro-data/master/stations.json');
            if (!res.ok) return [];
            const data = await res.json();
            const stations = data.stations || {};

            const converted: any[] = [];
            for (const key of Object.keys(stations)) {
                const s = stations[key];
                const lineCode = key.replace(/[0-9]/g, ''); // G, M, etc.
                const railway = LINE_CODE_MAP[lineCode];
                if (!railway) continue; // Skip unknown lines

                const operator = railway.includes('TokyoMetro') ? 'odpt.Operator:TokyoMetro' : 'odpt.Operator:Toei';

                let nameEn = s.name_en;
                if (TYPO_MAP[nameEn]) nameEn = TYPO_MAP[nameEn];

                // Generate Safe ID
                const safeName = toPascalCase(nameEn);
                const id = `odpt.Station:${operator.split(':').pop()}.${railway.split('.').pop()}.${safeName}`;

                converted.push({
                    'owl:sameAs': id,
                    'odpt:stationTitle': { 'en': nameEn, 'ja': s.name_jp },
                    'odpt:operator': operator,
                    'odpt:railway': railway,
                    // No lat/lon, will be geocoded
                    'geo:lat': null,
                    'geo:long': null
                });
            }
            console.log(`Parsed ${converted.length} external stations.`);
            return converted;
        } catch (e) {
            console.error('External fetch failed', e);
            return [];
        }
    }

    let allStations: any[] = [];

    // 1. Fetch Precise Railways (Metro/Toei)
    for (const r of RAILWAYS_TO_FETCH) {
        // Fetch stations for this railway
        const url = `${ODPT_API_URL}?odpt:railway=${r}&acl:consumerKey=${ODPT_TOKEN}`;
        console.log(`Fetching stations for ${r.split('.').pop()}...`);
        try {
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                allStations = allStations.concat(data);
            } else {
                console.error(`Failed ${r}: ${res.status}`);
            }
        } catch (e) { console.error(`Error ${r}`, e); }
    }

    // 2. Fetch Operators (JR & Private)
    for (const op of OPERATORS_TO_FETCH) {
        const stations = await fetchOdptStations(op);
        allStations = allStations.concat(stations);
    }


    // 3. Merge External Data (Prioritize if missing)
    const externalStations = await fetchExternalStations();
    // Use a Map to check for existing stations to avoid duplicates
    // But since API data is missing them, we can just concat. 
    // However, if API returns "Asakusa" and External returns "Asakusa", we might duplicate?
    // The consolidation logic creates keys based on name. 
    // "Asakusa" -> group "asakusa".
    // So they will be merged! 
    // Just concat them.
    allStations = allStations.concat(externalStations);

    console.log(`Total raw stations (including external): ${allStations.length}`);

    // Grouping Logic
    const stationGroups = new Map<string, {
        nameEn: string;
        nameI18n: any;
        railways: Set<string>;
        operators: Set<string>;
        lat: number;
        lon: number;
        originalIds: string[];
        isAirport: boolean;
    }>();

    let loggedGinzaStructure = false;

    for (const s of allStations) {
        const id = s['owl:sameAs'];
        let lat = s['geo:lat'];
        let lon = s['geo:long'];
        const nameEn = s['odpt:stationTitle']?.en || '';
        const operator = s['odpt:operator'];
        const railways = Array.isArray(s['odpt:railway']) ? s['odpt:railway'] : [s['odpt:railway']];
        if (railways.some(r => r.includes('TokyoMetro.Ginza')) && !loggedGinzaStructure) {
            console.log('[DEBUG] Sample Ginza Station:', JSON.stringify(s, null, 2));
            loggedGinzaStructure = true;
        }

        const cleanName = nameEn.replace(/\?/g, '').trim();

        if (cleanName.includes('Ginza')) {
            console.log(`[DEBUG] Ginza processed. CleanName: '${cleanName}'. Lat: ${lat}, Lon: ${lon}, Operator: ${operator}`);
        }

        // [ADDED] Geocoding Fallback for missing coordinates
        if (!lat || !lon) {
            if (cleanName) {
                // Try to get from cache or API
                const coords = await geocodingService.getCoordinates(cleanName);
                if (coords) {
                    lat = coords.lat;
                    lon = coords.lon;
                }
            }
        }

        if (!lat || !lon) continue;
        if (!isInBounds(lat, lon)) continue;

        // cleanName already defined above
        const lowerName = cleanName.toLowerCase();
        let groupKey = lowerName;

        // [FIX] Force-merge specific shared stations with name variations (Oshiage, Oshiage(SKYTREE))
        if (lowerName.includes('oshiage')) {
            groupKey = 'oshiage';
        }

        if (stationGroups.has(groupKey)) {
            const group = stationGroups.get(groupKey)!;
            railways.forEach(r => group.railways.add(r));
            group.operators.add(operator);
            group.originalIds.push(id);

            // Prioritize Metro/JR coordinates logic & Name standardization
            if (operator.includes('JR-East') || operator.includes('TokyoMetro')) {
                // Determine if this update improves position or name
                // Prefer Metro for Oshiage to get "Oshiage" (clean) instead of "Oshiage(SKYTREE)"
                group.lat = lat;
                group.lon = lon;

                if (groupKey === 'oshiage' && operator.includes('TokyoMetro')) {
                    group.nameEn = 'Oshiage';
                    group.nameI18n = s['odpt:stationTitle'];
                }
            }
        } else {
            stationGroups.set(groupKey, {
                nameEn: groupKey === 'oshiage' ? 'Oshiage' : cleanName, // Default to simple name if forced
                nameI18n: s['odpt:stationTitle'],
                railways: new Set(railways),
                operators: new Set([operator]),
                lat,
                lon,
                originalIds: [id],
                isAirport: cleanName.includes('Airport')
            });
        }
    }

    const toInsertNodes: any[] = [];

    for (const group of stationGroups.values()) {
        const operators = Array.from(group.operators);
        const railways = Array.from(group.railways);

        // Determine Primary Operator
        const primaryOp = getPriorityOperator(operators, group.nameEn);

        // Construct Unified ID
        const unifiedId = getSafeId(primaryOp, group.nameEn);

        toInsertNodes.push({
            id: unifiedId,
            city_id: 'tokyo_core',
            name: group.nameI18n,
            coordinates: `POINT(${group.lon} ${group.lat})`,
            node_type: group.isAirport ? 'airport' : 'station',
            is_hub: false,
            parent_hub_id: null,
            is_active: true,
            updated_at: new Date().toISOString(),
            transit_lines: railways,
            facility_profile: {
                operator: primaryOp.includes('JR-East') ? 'JR' : primaryOp.split(':').pop(),
                odpt_operator: primaryOp,
                odpt_id: unifiedId,
                merged_ids: group.originalIds,
                operators: operators
            }
        });
    }

    console.log(`\nConsolidated into ${toInsertNodes.length} unified nodes.`);

    if (toInsertNodes.length > 0) {
        console.log('Clearing ALL obsolete nodes (keeping current backups if needed)...');
        const { error: delErr } = await supabase
            .from('nodes')
            .delete()
            .neq('id', 'PLACEHOLDER');

        if (delErr) console.error('Error clearing:', delErr);

        const chunkSize = 100;
        for (let i = 0; i < toInsertNodes.length; i += chunkSize) {
            const chunk = toInsertNodes.slice(i, i + chunkSize);
            const { error } = await supabase
                .from('nodes')
                .upsert(chunk, { onConflict: 'id' });
            if (error) console.error(`Error inserting chunk ${i}:`, error);
        }
        console.log('✅ Successfully rebuilt all nodes.');
    }


}

main();
