
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!
);

const ODPT_API_URL = "https://api-challenge.odpt.org/api/v4/odpt:Station";
const ODPT_TOKEN = process.env.ODPT_AUTH_TOKEN ||
    process.env.NEXT_PUBLIC_ODPT_TOKEN ||
    process.env.ODPT_API_TOKEN;

// Geographic Bounds
const BOUNDS = {
    // Tokyo 23 Wards (Rough Box)
    TOKYO: {
        minLat: 35.50, maxLat: 35.85,
        minLon: 139.55, maxLon: 139.95
    },
    // Narita Airport Area
    NARITA: {
        minLat: 35.75, maxLat: 35.80,
        minLon: 140.35, maxLon: 140.40
    }
};

function isInBounds(lat: number, lon: number): boolean {
    // Check Tokyo
    if (lat >= BOUNDS.TOKYO.minLat && lat <= BOUNDS.TOKYO.maxLat &&
        lon >= BOUNDS.TOKYO.minLon && lon <= BOUNDS.TOKYO.maxLon) {
        return true;
    }
    // Check Narita
    if (lat >= BOUNDS.NARITA.minLat && lat <= BOUNDS.NARITA.maxLat &&
        lon >= BOUNDS.NARITA.minLon && lon <= BOUNDS.NARITA.maxLon) {
        return true;
    }
    return false;
}

// Helper to normalize station name
function getLocaleName(nameObj: any) {
    return {
        ja: nameObj.ja || nameObj.ja_Hrkt || '',
        en: nameObj.en || '',
        'zh-TW': nameObj.zh_Hant || nameObj.ja || '',
        'zh-CN': nameObj.zh_Hans || nameObj.ja || ''
    };
}

// Helper to convert English name to PascalCase for ID
function toPascalCase(str: string) {
    return str.replace(/[^a-zA-Z0-9]/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('');
}

async function fetchOdptStations(operator: string) {
    if (!ODPT_TOKEN) throw new Error("Missing ODPT Token");
    const url = `${ODPT_API_URL}?odpt:operator=${operator}&acl:consumerKey=${ODPT_TOKEN}`;
    console.log(`Fetching ${operator} from Challenge API...`);
    const res = await fetch(url);
    if (!res.ok) {
        console.error(`Failed to fetch ${operator}: ${res.status} ${res.statusText}`);
        return [];
    }
    return await res.json();
}

async function main() {
    if (!ODPT_TOKEN) {
        console.error('❌ Missing ODPT_AUTH_TOKEN in env.');
        process.exit(1);
    }

    console.log('=== Rebuilding JR East Lines (Consolidated) ===');

    // Fetch all JR East stations
    const stations = await fetchOdptStations('odpt.Operator:JR-East');
    console.log(`Fetched ${stations.length} stations from source.`);

    // Map to group stations by English Name
    const stationGroups = new Map<string, {
        nameEn: string;
        nameI18n: any;
        railways: string[];
        lat: number;
        lon: number;
        originalIds: string[];
    }>();

    for (const s of stations) {
        const id = s['owl:sameAs'];
        const lat = s['geo:lat'];
        const lon = s['geo:long'];
        const nameEn = s['odpt:stationTitle']?.en || '';
        const railways = Array.isArray(s['odpt:railway']) ? s['odpt:railway'] : [s['odpt:railway']];

        // 1. Geography Check
        if (!lat || !lon) continue;
        if (!isInBounds(lat, lon)) continue;

        const cleanName = nameEn.trim();
        // Check if group exists (CASE INSENSITIVE KEY)
        const key = cleanName.toLowerCase();

        let group = stationGroups.get(key);
        if (group) {
            // Merge into existing group
            railways.forEach((r: string) => {
                if (!group.railways.includes(r)) group.railways.push(r);
            });
            if (!group.originalIds.includes(id)) {
                group.originalIds.push(id);
            }
            // Prioritize coordinates if current is Yamanote? 
            if (railways.some((r: string) => r.includes('Yamanote'))) {
                group.lat = lat;
                group.lon = lon;
            }
        } else {
            // New Group
            stationGroups.set(key, {
                nameEn: cleanName,
                nameI18n: getLocaleName(s['odpt:stationTitle']),
                railways: [...railways],
                lat,
                lon,
                originalIds: [id]
            });
        }
    }

    const toInsertNodes: any[] = [];

    // Sort to ensure stable order
    const sortedKeys = Array.from(stationGroups.keys()).sort();

    for (const key of sortedKeys) {
        const group = stationGroups.get(key)!;

        // Construct Unified ID
        const pascalName = toPascalCase(group.nameEn);
        const unifiedId = `odpt.Station:JR-East.${pascalName}`;

        toInsertNodes.push({
            id: unifiedId,
            city_id: 'tokyo_core',
            name: group.nameI18n,
            coordinates: `POINT(${group.lon} ${group.lat})`,
            node_type: 'station',
            is_hub: false,
            parent_hub_id: null,
            is_active: true,
            updated_at: new Date().toISOString(),
            transit_lines: group.railways,
            facility_profile: {
                operator: 'JR',
                odpt_operator: 'odpt.Operator:JR-East',
                odpt_id: unifiedId,
                merged_ids: group.originalIds
            }
        });
    }

    console.log(`\nConsolidated into ${toInsertNodes.length} unique JR stations.`);

    if (toInsertNodes.length > 0) {
        // CLEAR OLD JR NODES FIRST
        console.log('Deleting existing JR nodes to prevent duplicates...');
        const { error: deleteError } = await supabase
            .from('nodes')
            .delete()
            .ilike('id', '%JR-East%');

        if (deleteError) {
            console.error('Error clearing old nodes:', deleteError);
            return;
        }

        console.log('Inserting new consolidated nodes...');
        const { error } = await supabase
            .from('nodes')
            .upsert(toInsertNodes, { onConflict: 'id' });

        if (error) {
            console.error('Error upserting nodes:', error);
        } else {
            console.log(`✅ Successfully rebuilt ${toInsertNodes.length} JR nodes (Consolidated).`);
        }
    } else {
        console.log('No nodes to insert.');
    }
}

main();
