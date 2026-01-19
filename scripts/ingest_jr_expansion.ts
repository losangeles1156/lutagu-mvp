
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
const ODPT_TOKEN = process.env.ODPT_AUTH_TOKEN ||
                   process.env.NEXT_PUBLIC_ODPT_TOKEN ||
                   process.env.ODPT_API_TOKEN ||
                   process.env.ODPT_API_TOKEN_BACKUP;

// Target Line Names (English, Partial Match)
const TARGET_LINES = [
    'Yamanote',
    'Chuo-Sobu', // Central-Sobu
    'Sobu Rapid' // Sobu Rapid
];

// Fallback Coordinates for JR East (from previous ingestion + expanded)
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

    // Chuo-Sobu (East to West inside core/near core)
    'Asakusabashi': [139.7863, 35.6974],
    'Ryogoku': [139.7928, 35.6958],
    'Kinshicho': [139.8144, 35.6967],
    'Kameido': [139.8262, 35.6974],
    'Ochanomizu': [139.7653, 35.7000],
    'Suidobashi': [139.7537, 35.7020],
    'Iidabashi': [139.7448, 35.7020],
    'Ichigaya': [139.7356, 35.6910],
    'Yotsuya': [139.7306, 35.6860],
    'Shinanomachi': [139.7203, 35.6800],
    'Sendagaya': [139.7116, 35.6812],
    'Okubo': [139.6973, 35.7008],
    'HigashiNakano': [139.6853, 35.7062],
    'Nakano': [139.6658, 35.7057],

    // Sobu Rapid (Tokyo to Chiba direction)
    'Bakurocho': [139.7825, 35.6932],
    'ShinNihombashi': [139.7767, 35.6886]
};

// Helper to normalize station name
function getLocaleName(nameObj: any) {
    return {
        ja: nameObj.ja || nameObj.ja_Hrkt || '',
        en: nameObj.en || '',
        'zh-TW': nameObj.zh_Hant || nameObj.ja || '', // Fallback to JA if ZH missing
        'zh-CN': nameObj.zh_Hans || nameObj.ja || ''
    };
}

function lookupCoords(stationId: string, enName: string): [number, number] | null {
    const slug = stationId.split('.').pop();
    if (slug && STATION_COORDS[slug]) return STATION_COORDS[slug];

    if (enName) {
         const clean = enName.replace(' Station', '').replace(/-/g, '').replace(/\s+/g, '');
         for (const [key, coords] of Object.entries(STATION_COORDS)) {
             if (clean.toLowerCase() === key.toLowerCase()) return coords;
         }
    }
    return null;
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

    console.log('=== Starting Phase 2: JR East Expansion (Yamanote + Chuo-Sobu + Sobu Rapid) ===');

    // Fetch all JR East stations (filtered locally)
    const stations = await fetchOdptStations('odpt.Operator:JR-East');
    console.log(`Fetched ${stations.length} stations for JR-East`);

    const toInsert: any[] = [];

    for (const s of stations) {
        const id = s['owl:sameAs'];
        const railway = s['odpt:railway'];
        const railways = Array.isArray(railway) ? railway : [railway];
        const enName = s['odpt:stationTitle']?.en || '';

        // Filter Logic
        let shouldIngest = false;

        // 1. Yamanote Line (Complete)
        if (railways.some(r => r.includes('Yamanote'))) {
            shouldIngest = true;
        }

        // 2. Chuo-Sobu Line (Local) -> "Chuo-Sobu" in ODPT?
        // ODPT usually calls it "odpt.Railway:JR-East.ChuoSobu"
        else if (railways.some(r => r.includes('ChuoSobu'))) {
            // Filter: East of Nakano, West of Kameido (inclusive)
            // But checking bounds by name is tricky.
            // We'll rely on the STATION_COORDS list or simple name check.
            // Actually, we can check if it's in our coordinate list OR explicit allowed list.
            if (lookupCoords(id, enName)) {
                shouldIngest = true;
            } else if (enName.includes('Kameido') || enName.includes('Nakano')) {
                shouldIngest = true;
            }
        }

        // 3. Sobu Rapid Line -> "odpt.Railway:JR-East.SobuRapid"?
        // ODPT might call it "Sobu" or "SobuRapid".
        else if (railways.some(r => r.includes('Sobu') && !r.includes('ChuoSobu'))) {
             // Check against whitelist for Rapid
             if (lookupCoords(id, enName)) {
                 shouldIngest = true;
             }
        }

        if (!shouldIngest) continue;

        // Coordinates
        let lat = s['geo:lat'];
        let lon = s['geo:long'];
        if (!lat || !lon) {
            const fallback = lookupCoords(id, enName);
            if (fallback) {
                [lon, lat] = fallback;
            } else {
                // If it's a target line but no coords, skip and warn
                // console.warn(`⚠️ Skipping ${id} (${enName}) - No Coords`);
                continue;
            }
        }

        const nameI18n = getLocaleName(s['odpt:stationTitle']);

        // Hub Logic
        const isHub =
            nameI18n.en.includes('Tokyo') ||
            nameI18n.en.includes('Shinjuku') ||
            nameI18n.en.includes('Shibuya') ||
            nameI18n.en.includes('Ikebukuro') ||
            nameI18n.en.includes('Ueno') ||
            nameI18n.en.includes('Akihabara') ||
            nameI18n.en.includes('Shinagawa');

        toInsert.push({
            id: id,
            city_id: 'tokyo_core',
            name: nameI18n,
            location: `POINT(${lon} ${lat})`,
            is_hub: isHub,
            zone: 'core',
            type: 'station',
            source_dataset: 'odpt_v4_phase2_jr',
            tags: {
                operator: 'odpt.Operator:JR-East',
                railway: railway,
                odpt_id: id
            }
        });
    }

    if (toInsert.length > 0) {
        console.log(`Inserting ${toInsert.length} JR East stations...`);
        const { error } = await supabase
            .from('stations_static')
            .upsert(toInsert, { onConflict: 'id' });

        if (error) {
            console.error(`❌ Error inserting JR East:`, error.message);
        } else {
            console.log(`✅ Success. Added ${toInsert.length} stations.`);
            console.log('Sample IDs:', toInsert.slice(0, 3).map(x => x.id).join(', '));
        }
    } else {
        console.log('No new stations found matching criteria.');
    }
}

main();
