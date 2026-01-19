
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!
);

const ODPT_API_URL = "https://api.odpt.org/api/v4/odpt:Station";
// Try multiple env var names for ODPT Token
const ODPT_TOKEN = process.env.ODPT_AUTH_TOKEN ||
                   process.env.NEXT_PUBLIC_ODPT_TOKEN ||
                   process.env.ODPT_API_TOKEN ||
                   process.env.ODPT_API_TOKEN_BACKUP;

// Target Operators
const TARGET_OPERATORS = [
    'odpt.Operator:TokyoMetro',
    'odpt.Operator:Toei',
    'odpt.Operator:JR-East',
    'odpt.Operator:TokyoMonorail',
    'odpt.Operator:Keisei'
];

// Specific Keisei Targets (Suffix matching or exact)
const KEISEI_TARGETS = [
    'NaritaAirportTerminal1',
    'NaritaAirportTerminal2and3',
    'Oshiage',
    'Nippori',
    'KeiseiUeno'
];

// Fallback Coordinates for Operators that don't provide them (JR East, Monorail, Keisei)
const STATION_COORDS: Record<string, [number, number]> = {
    // JR Yamanote
    'Tokyo': [139.7671, 35.6812],
    'Kanda': [139.7709, 35.6918],
    'Akihabara': [139.7742, 35.6986],
    'Okachimachi': [139.7747, 35.7075],
    'Ueno': [139.7774, 35.7141],
    'Uguisudani': [139.7780, 35.7214],
    'Nippori': [139.7706, 35.7281],
    'NishiNippori': [139.7668, 35.7320],
    'Tabata': [139.7608, 35.7381],
    'Komagome': [139.7470, 35.7365],
    'Sugamo': [139.7395, 35.7334],
    'Otsuka': [139.7281, 35.7318],
    'Ikebukuro': [139.7109, 35.7295],
    'Mejiro': [139.7066, 35.7212],
    'Takadanobaba': [139.7038, 35.7126],
    'ShinOkubo': [139.7000, 35.7012],
    'Shinjuku': [139.7006, 35.6896],
    'Yoyogi': [139.7021, 35.6830],
    'Harajuku': [139.7027, 35.6702],
    'Shibuya': [139.7016, 35.6580],
    'Ebisu': [139.7101, 35.6467],
    'Meguro': [139.7158, 35.6340],
    'Gotanda': [139.7236, 35.6262],
    'Osaki': [139.7282, 35.6198],
    'Shinagawa': [139.7387, 35.6285],
    'TakanawaGateway': [139.7407, 35.6356],
    'Tamachi': [139.7476, 35.6457],
    'Hamamatsucho': [139.7571, 35.6554],
    'Shimbashi': [139.7583, 35.6664],
    'Yurakucho': [139.7628, 35.6749],

    // Monorail
    'HanedaAirportTerminal1': [139.7846, 35.5492],
    'HanedaAirportTerminal2': [139.7885, 35.5532],
    'HanedaAirportTerminal3': [139.7684, 35.5445],
    'MonorailHamamatsucho': [139.7571, 35.6554],
    'TennozuIsle': [139.7496, 35.6214],

    // Keisei
    'NaritaAirportTerminal1': [140.3861, 35.7638],
    'NaritaAirportTerminal2and3': [140.3876, 35.7731],
    'Oshiage': [139.8131, 35.7106],
    'KeiseiUeno': [139.7749, 35.7113],
    'Aoto': [139.8517, 35.7461] // Just in case
};

function lookupCoords(stationId: string, enName: string): [number, number] | null {
    // Try matching ID suffix (e.g. "Tokyo" from "odpt.Station:JR-East.Yamanote.Tokyo")
    const slug = stationId.split('.').pop();
    if (slug && STATION_COORDS[slug]) return STATION_COORDS[slug];

    // Try English name match
    if (enName) {
         // Normalize: "Tokyo" -> "Tokyo"
         // Remove " Station" if present
         const clean = enName.replace(' Station', '').replace(/-/g, '').replace(/\s+/g, '');
         for (const [key, coords] of Object.entries(STATION_COORDS)) {
             if (clean.toLowerCase() === key.toLowerCase()) return coords;
         }
    }
    return null;
}

// Helper to normalize station name
function getLocaleName(nameObj: any) {
    return {
        ja: nameObj.ja || nameObj.ja_Hrkt || '',
        en: nameObj.en || '',
        'zh-TW': nameObj.zh_Hant || nameObj.ja || '', // Fallback to JA if ZH missing
        'zh-CN': nameObj.zh_Hans || nameObj.ja || ''
    };
}

async function fetchOdptStations(operator: string) {
    const url = `${ODPT_API_URL}?odpt:operator=${operator}&acl:consumerKey=${ODPT_TOKEN}`;
    console.log(`Fetching ${operator}...`);
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

    console.log('=== Starting Phase 1: Base Station Ingestion ===');
    let totalIngested = 0;

    for (const operator of TARGET_OPERATORS) {
        const stations = await fetchOdptStations(operator);
        console.log(`Fetched ${stations.length} stations for ${operator}`);

        const toInsert: any[] = [];

        for (const s of stations) {
            const id = s['owl:sameAs'];
            const railway = s['odpt:railway'];

            // --- Filtering Logic ---
            let shouldIngest = false;

            // 1. Tokyo Metro & Toei (All)
            if (operator.includes('TokyoMetro') || operator.includes('Toei') || operator.includes('TokyoMonorail')) {
                shouldIngest = true;
            }

            // 2. JR East (Yamanote Line Only)
            else if (operator.includes('JR-East')) {
                const railways = Array.isArray(railway) ? railway : [railway];
                if (railways.includes('odpt.Railway:JR-East.Yamanote')) {
                    shouldIngest = true;
                } else if (s['odpt:stationTitle']?.en?.includes('Yamanote')) {
                    // Fallback check
                    shouldIngest = true;
                }
            }

            // 3. Keisei (Specific List)
            else if (operator.includes('Keisei')) {
                // Check if ID contains any of the targets
                if (KEISEI_TARGETS.some(t => id.includes(t))) {
                    shouldIngest = true;
                }
            }

            if (!shouldIngest) continue;

            // --- Transform ---
            // Extract Coordinates
            let lat = s['geo:lat'];
            let lon = s['geo:long'];

            // Fallback for missing coords (rare in ODPT but possible)
            if (!lat || !lon) {
                const enName = s['odpt:stationTitle']?.en || '';
                const fallback = lookupCoords(id, enName);
                if (fallback) {
                    [lon, lat] = fallback;
                } else {
                    console.warn(`⚠️ Skipping ${id} (No coords)`);
                    continue;
                }
            }

            const nameI18n = getLocaleName(s['odpt:stationTitle']);

            // Hub Logic (Simple heuristic for now)
            const isHub =
                nameI18n.en.includes('Tokyo') ||
                nameI18n.en.includes('Shinjuku') ||
                nameI18n.en.includes('Shibuya') ||
                nameI18n.en.includes('Ikebukuro') ||
                nameI18n.en.includes('Ueno') ||
                nameI18n.en.includes('Otemachi') ||
                nameI18n.en.includes('Ginza') ||
                nameI18n.en.includes('Iidabashi');

            toInsert.push({
                id: id,
                city_id: 'tokyo_core', // Unified zone
                name: nameI18n, // Jsonb
                location: `POINT(${lon} ${lat})`, // WKT
                is_hub: isHub,
                zone: 'core',
                type: 'station',
                source_dataset: 'odpt_v4_phase1',
                // Preserve original data for reference
                tags: {
                    operator: operator,
                    railway: railway,
                    odpt_id: id
                }
            });
        }

        if (toInsert.length > 0) {
            console.log(`Inserting ${toInsert.length} stations for ${operator}...`);
            const { error } = await supabase
                .from('stations_static')
                .upsert(toInsert, { onConflict: 'id' });

            if (error) {
                console.error(`❌ Error inserting ${operator}:`, error.message);
            } else {
                totalIngested += toInsert.length;
                console.log(`✅ Success.`);
            }
        }
    }

    console.log(`\n=== Completed. Total Ingested: ${totalIngested} ===`);
}

main();
