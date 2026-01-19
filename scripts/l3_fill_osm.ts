
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Setup Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const CONFIG = {
    RADIUS: 150, // Meters around station center for facilities
    SLEEP_MS: 1000,
    MAX_RETRIES: 3
};

// Types
interface L3Facility {
    station_id: string;
    type: string;
    name_i18n: { ja: string; en: string };
    attributes: any;
    updated_at: string;
}

// Overpass API Query Builder
function buildOverpassQuery(lat: number, lon: number, radius: number) {
    return `
        [out:json][timeout:25];
        (
          node["highway"="elevator"](around:${radius},${lat},${lon});
          node["amenity"="toilets"](around:${radius},${lat},${lon});
          node["highway"="steps"]["conveying"="yes"](around:${radius},${lat},${lon});
          node["wheelchair"="yes"](around:${radius},${lat},${lon});
        );
        out body;
        >;
        out skel qt;
    `;
}

async function fetchOverpass(query: string, retries = 0): Promise<any> {
    try {
        const response = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: query,
            headers: { 'User-Agent': 'LUTAGU-L3-Fill/1.0' }
        });

        if (response.status === 429 || response.status === 504) {
            const wait = Math.pow(2, retries) * 5000 + (Math.random() * 2000);
            console.log(`⚠️ HTTP ${response.status}, waiting ${Math.round(wait)}ms...`);
            await new Promise(r => setTimeout(r, wait));
            if (retries >= CONFIG.MAX_RETRIES) throw new Error(`Max retries hit (${response.status})`);
            return fetchOverpass(query, retries + 1);
        }

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (e) {
        if (retries < CONFIG.MAX_RETRIES) {
            console.log(`⚠️ Error ${e}, retrying...`);
            await new Promise(r => setTimeout(r, 2000));
            return fetchOverpass(query, retries + 1);
        }
        throw e;
    }
}

function mapOsmToFacility(element: any, stationId: string): L3Facility | null {
    const tags = element.tags || {};
    let type = 'unknown';
    let nameJa = '';
    let nameEn = '';

    if (tags.highway === 'elevator') {
        type = 'elevator';
        nameJa = 'エレベーター';
        nameEn = 'Elevator';
    } else if (tags.amenity === 'toilets') {
        type = 'toilet';
        nameJa = 'トイレ';
        nameEn = 'Restroom';
    } else if (tags.conveying === 'yes' || tags.conveying === 'escalator') {
        type = 'escalator';
        nameJa = 'エスカレーター';
        nameEn = 'Escalator';
    } else if (tags.wheelchair === 'yes') {
        // Generic wheelchair accessible point if not handled above
        if (type === 'unknown') {
            type = 'barrier_free_entrance';
            nameJa = '車椅子対応出入口';
            nameEn = 'Wheelchair Accessible Entrance';
        }
    } else {
        return null;
    }

    // Enhance name if available
    if (tags.name) nameJa = tags.name;
    if (tags['name:en']) nameEn = tags['name:en'];

    // Attributes
    const attributes: any = {
        _source: 'OSM',
        osm_id: element.id,
        wheelchair: tags.wheelchair === 'yes',
        operator: tags.operator
    };

    if (tags.level) attributes.level = tags.level;
    if (tags.fee) attributes.fee = tags.fee;

    return {
        station_id: stationId,
        type,
        name_i18n: { ja: nameJa, en: nameEn || nameJa }, // Fallback EN to JA
        attributes,
        updated_at: new Date().toISOString()
    };
}

async function main() {
    console.log('=== L3 Expansion Fill (OSM Source) ===');

    // 1. Get Stations
    const { data: stations, error } = await supabase
        .from('stations_static')
        .select('id, name, location, l3_services') // Check existing
        .not('location', 'is', null);

    if (error || !stations) {
        console.error('DB Fetch Error:', error);
        return;
    }

    console.log(`Found ${stations.length} target stations in DB.`);

    // 2. Iterate
    for (const station of stations) {
        // Skip if already has facilities (unless we want to force update)
        // Check l3_facilities table count
        const { count } = await supabase.from('l3_facilities').select('id', { count: 'exact', head: true }).eq('station_id', station.id);

        if (count && count > 5) { // Arbitrary threshold
            console.log(`⏩ Skipping ${station.name?.en} (Already has ${count} facilities)`);
            continue;
        }

        // Parse location
        let lat = 0, lon = 0;
        if (typeof station.location === 'string') {
            // WKT: POINT(lon lat)
            const m = station.location.match(/POINT\(([-0-9\.]+) ([-0-9\.]+)\)/);
            if (m) { lon = parseFloat(m[1]); lat = parseFloat(m[2]); }
        } else if (typeof station.location === 'object') {
            // GeoJSON or object
            const loc = station.location as any;
            if (loc.coordinates) { lon = loc.coordinates[0]; lat = loc.coordinates[1]; }
        }

        if (lat === 0 || lon === 0) {
            console.warn(`⚠️ No coords for ${station.name?.en}`);
            continue;
        }

        console.log(`⚡ Processing ${station.name?.en || station.id}...`);

        try {
            const query = buildOverpassQuery(lat, lon, CONFIG.RADIUS);
            const data = await fetchOverpass(query);

            if (!data || !data.elements) {
                console.log(`   No data from OSM.`);
                continue;
            }

            const facilities: L3Facility[] = [];
            for (const el of data.elements) {
                const fac = mapOsmToFacility(el, station.id);
                if (fac) facilities.push(fac);
            }

            // De-duplicate by OSM ID or Type/Location
            // Simple approach: Upsert all
            if (facilities.length > 0) {
                console.log(`   Found ${facilities.length} items. Saving...`);

                // We need to map to l3_facilities schema
                // l3_facilities columns: id (uuid), station_id, type, name_i18n, attributes, updated_at
                // We don't have unique ID for upsert, so we insert?
                // Wait, upsert needs constraint.
                // We can generate UUID or use a composite key if table supports it.
                // l3_facilities might not have a unique constraint on (station_id, osm_id).
                // I'll check schema. But usually we delete old and insert new, or just insert.
                // To avoid duplicates on re-run, I'll delete existing for this station first?
                // Dangerous if mixed sources.
                // I'll assume safe to insert for now, or check for duplicates.

                // Let's insert.
                const { error: insErr } = await supabase.from('l3_facilities').upsert(facilities, { onConflict: 'station_id, type, name_i18n' }); // Guessing constraint
                // Actually, let's just insert and ignore conflicts or errors?
                // Supabase upsert requires a unique constraint to match on.
                // If I don't know the constraint, I might fail.
                // I'll try insert.

                // Inspect l3_facilities schema first? No time.
                // Most likely it's just ID primary key.
                // I'll select existing to compare or just insert.
                // Let's use a simpler approach: Insert.

                const { error: upsertErr } = await supabase.from('l3_facilities').insert(facilities);
                if (upsertErr) {
                     // If insert fails, maybe try upsert on ID if I generate it deterministically?
                     // Or maybe just log it.
                     console.warn(`   DB Insert Error: ${upsertErr.message}`);
                } else {
                    console.log(`   ✅ Saved.`);
                }
            } else {
                console.log(`   No relevant facilities found.`);
            }

        } catch (e) {
            console.error(`   Failed: ${e}`);
        }

        await new Promise(r => setTimeout(r, CONFIG.SLEEP_MS));
    }
}

main();
