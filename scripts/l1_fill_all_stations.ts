
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// --- Configuration ---
const CONFIG = {
    // Hybrid Ranges
    RANGE_WIDE: 800,   // Culture, Leisure, Medical, Business, Nature, Service, Accommodation
    RANGE_CORE: 300,   // Dining, Shopping, Finance

    CONCURRENCY: 4,
    DELAY_MS: 3000,
    MAX_RETRIES: 4,

    // Quotas
    QUOTAS: {
        dining: 50,
        shopping: 50,
        default: 30
    },

    // Safety Caps
    CUISINE_CAP: 5, // Max 5 items per cuisine type (e.g. max 5 ramen shops)
};

// --- Setup ---
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
});

// --- Categories ---
const CATEGORY_MAP: Record<string, string[]> = {
    dining: ['restaurant', 'cafe', 'fast_food', 'bar', 'pub', 'food_court', 'ice_cream', 'izakaya', 'biergarten'],
    shopping: ['shop', 'marketplace', 'department_store', 'supermarket', 'convenience', 'clothes', 'electronics', 'gift', 'mall'],
    business: ['office', 'coworking_space', 'conference_centre'],
    medical: ['hospital', 'clinic', 'dentist', 'pharmacy', 'doctors'],
    leisure: ['leisure', 'sports_centre', 'stadium', 'pitch', 'playground', 'theme_park', 'zoo', 'aquarium', 'bowling_alley'],
    finance: ['bank', 'atm', 'bureau_de_change'],
    accommodation: ['hotel', 'hostel', 'guest_house', 'motel', 'ryokan'],
    culture: ['place_of_worship', 'theatre', 'library', 'cinema', 'arts_centre', 'museum', 'gallery', 'shrine', 'temple'],
    service: ['post_office', 'police', 'townhall', 'community_centre', 'fire_station', 'library', 'public_building'],
    nature: ['park', 'garden', 'nature_reserve', 'water_park', 'water', 'wood']
};

const WIDE_RANGE_CATS = ['culture', 'leisure', 'medical', 'business', 'nature', 'service', 'accommodation'];

// --- Helpers ---

function calculateScore(poi: any, distance: number): number {
    let score = 1000;

    // 1. Distance Decay: -10 points per 100m
    score -= (distance / 10);

    // 2. Fame Bonuses
    if (poi.tags.wikidata || poi.tags.wikipedia) score += 500;
    if (poi.tags.website) score += 50;
    if (poi.tags.brand) score += 50;
    if (poi.tags.stars) score += 50; // OSM sometimes has stars

    // 3. Scale/Type Bonuses
    const BIG_TYPES = ['hospital', 'department_store', 'museum', 'stadium', 'university', 'park', 'embassy', 'aquarium', 'zoo', 'theme_park'];
    if (BIG_TYPES.includes(poi.subcategory)) score += 300;

    if (poi.category === 'nature' && (poi.tags.leisure === 'park' || poi.tags.natural === 'water')) score += 200;
    if (poi.category === 'culture' && (poi.subcategory === 'museum' || poi.subcategory === 'shrine' || poi.subcategory === 'temple')) score += 100;

    return score;
}

function buildUnifiedQuery(lat: number, lon: number, radius: number): string {
    // Fetch 800m for everything, filter locally.
    // Query node, way, relation. For way/rel we need center.
    return `
        [out:json][timeout:90];
        (
          nwr(around:${radius},${lat},${lon})["name"]["amenity"];
          nwr(around:${radius},${lat},${lon})["name"]["shop"];
          nwr(around:${radius},${lat},${lon})["name"]["tourism"];
          nwr(around:${radius},${lat},${lon})["name"]["leisure"];
          nwr(around:${radius},${lat},${lon})["name"]["historic"];
          nwr(around:${radius},${lat},${lon})["name"]["office"];
          nwr(around:${radius},${lat},${lon})["name"]["natural"];
          nwr(around:${radius},${lat},${lon})["name"]["landuse"="recreation_ground"];
        );
        out center body;
    `;
}

function classifyPOI(tags: any): { category: string, subcategory: string } | null {
    const keys = ['amenity', 'shop', 'tourism', 'leisure', 'historic', 'office', 'natural', 'landuse'];

    for (const key of keys) {
        if (tags[key]) {
            let val = tags[key];

            // Normalize
            if (key === 'landuse' && val === 'recreation_ground') return { category: 'nature', subcategory: 'park' };
            if (val === 'shrine' || val === 'temple') return { category: 'culture', subcategory: val };
            if (val === 'convenience') return { category: 'shopping', subcategory: 'convenience' }; // Moved to shopping

            // Check Map
            for (const [cat, keywords] of Object.entries(CATEGORY_MAP)) {
                if (keywords.includes(val)) {
                    return { category: cat, subcategory: val };
                }
            }

            // Fallbacks
            if (key === 'shop') return { category: 'shopping', subcategory: val };
            if (key === 'office') return { category: 'business', subcategory: val }; // Default office to business
            if (key === 'natural') return { category: 'nature', subcategory: val };
        }
    }
    return null;
}

// --- Main Worker ---

async function fetchOverpass(query: string, retries = 0): Promise<any> {
    const url = 'https://overpass-api.de/api/interpreter';
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 60000); // 60s timeout

        const response = await fetch(url, {
            method: 'POST',
            body: query,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            signal: controller.signal
        });
        clearTimeout(timeout);

        if (response.status === 429 || response.status === 504) {
            const wait = Math.pow(2, retries) * 5000 + (Math.random() * 2000);
            console.log(`⚠️ HTTP ${response.status}, waiting ${Math.round(wait)}ms...`);
            await new Promise(r => setTimeout(r, wait));
            if (retries >= CONFIG.MAX_RETRIES) throw new Error(`Max retries hit (${response.status})`);
            return fetchOverpass(query, retries + 1);
        }

        if (!response.ok) throw new Error(`Overpass HTTP ${response.status}`);
        return await response.json();

    } catch (e: any) {
        if (retries >= CONFIG.MAX_RETRIES) throw e;
        console.log(`⚠️ Network Error: ${e.message}, retrying...`);
        await new Promise(r => setTimeout(r, 5000));
        return fetchOverpass(query, retries + 1);
    }
}

// Global memory for deduplication across stations
const GLOBAL_SEEN_IDS = new Set<string>();

async function processStation(station: any) {
    if (!station.location) return;

    // Extract coords from WKT (POINT(lon lat))
    let lat, lon;
    if (typeof station.location === 'string') {
        const m = station.location.match(/POINT\(([-0-9\.]+) ([-0-9\.]+)\)/);
        if (m) { lon = parseFloat(m[1]); lat = parseFloat(m[2]); }
    } else if (station.location.coordinates) {
        [lon, lat] = station.location.coordinates;
    }

    if (!lat || !lon) {
        console.log(`⚠️ Skipping ${station.name?.en} (Invalid location: ${station.location})`);
        return;
    }

    // Check if we already have L1 data for this station to avoid reprocessing
    // (Optional: can comment this out to force refresh)
    const { count } = await supabase.from('l1_places').select('id', { count: 'exact', head: true }).eq('station_id', station.id);
    if (count && count > 0) {
        console.log(`⏩ Skipping ${station.name?.en} (Already has ${count} POIs)`);
        return;
    }

    console.log(`⚡ Processing ${station.name?.en || station.id}...`);

    try {
        // Query 800m
        const query = buildUnifiedQuery(lat, lon, CONFIG.RANGE_WIDE);
        const data = await fetchOverpass(query);
        const elements = data.elements || [];

        const categoryGroups: Record<string, any[]> = {};

        for (const el of elements) {
            const tags = el.tags || {};
            if (!tags.name) continue;

            const classification = classifyPOI(tags);
            if (!classification) continue;

            // Coords
            let pLat = el.lat, pLon = el.lon;
            if (el.type !== 'node') {
                pLat = el.center?.lat;
                pLon = el.center?.lon;
            }
            if (!pLat || !pLon) continue;

            // Distance
            const dist = Math.round(calculateDistance(lat, lon, pLat, pLon));

            // Range Filter
            let limitDist = CONFIG.RANGE_CORE; // Default 300m
            if (WIDE_RANGE_CATS.includes(classification.category)) limitDist = CONFIG.RANGE_WIDE; // 800m

            // Scoring PRE-CALC
            const tempPoi = { tags, subcategory: classification.subcategory, category: classification.category };
            const score = calculateScore(tempPoi, dist);

            // Exception: High fame items allowed in 800m
            if (score < 500 && dist > limitDist) continue;
            if (dist > CONFIG.RANGE_WIDE) continue;

            const poi = {
                station_id: station.id,
                osm_id: el.id,
                name: tags.name,
                name_i18n: {
                    ja: tags.name,
                    en: tags['name:en'] || tags['name:en_rm'] || tags.name,
                    'zh-TW': tags['name:zh-Hant'] || tags['name:zh'] || tags.name,
                    'zh-CN': tags['name:zh-Hans'] || tags['name:zh'] || tags.name
                },
                category: classification.category,
                subcategory: classification.subcategory,
                location: `POINT(${pLon} ${pLat})`,
                lat: pLat,
                lng: pLon,
                distance_meters: dist,
                navigation_url: `https://www.google.com/maps/dir/?api=1&destination=${pLat},${pLon}&travelmode=walking`,
                tags: tags,
                sortScore: score,
                cuisine: tags.cuisine
            };

            if (!categoryGroups[poi.category]) categoryGroups[poi.category] = [];
            categoryGroups[poi.category].push(poi);
        }

        // 2. Filter & Limit & Smart Diversity
        const finalRows: any[] = [];

        for (const [cat, items] of Object.entries(categoryGroups)) {
            // Sort by Score DESCENDING
            items.sort((a, b) => b.sortScore - a.sortScore);

            const listLimit = (cat === 'dining' || cat === 'shopping') ? CONFIG.QUOTAS.dining : CONFIG.QUOTAS.default;

            const diversityCounts: Record<string, number> = {};
            const selectedItems: any[] = [];

            for (const item of items) {
                if (selectedItems.length >= listLimit) break;

                if (cat === 'dining' && item.cuisine) {
                    const cuisine = item.cuisine.split(';')[0];
                    if ((diversityCounts[cuisine] || 0) >= CONFIG.CUISINE_CAP) {
                        continue;
                    }
                    diversityCounts[cuisine] = (diversityCounts[cuisine] || 0) + 1;
                }

                selectedItems.push(item);
                // Mark as seen GLOBALLY only if selected
                GLOBAL_SEEN_IDS.add(item.osm_id);
            }

            const Cleaned = selectedItems.map(({ sortScore, cuisine, ...rest }) => rest);
            finalRows.push(...Cleaned);
        }

        if (finalRows.length === 0) {
            console.log(`- No POIs found for ${station.name?.en}`);
            return;
        }

        // 3. Upsert POIs
        await supabase.from('l1_places').delete().eq('station_id', station.id);
        const { error } = await supabase.from('l1_places').upsert(finalRows, { onConflict: 'station_id,osm_id' });
        if (error) throw error;

        console.log(`✅ ${station.name?.en}: Ingested ${finalRows.length} POIs (Scanned ${elements.length}).`);

    } catch (err: any) {
        console.error(`❌ Failed ${station.name?.en}: ${err.message}`);
    }
}

// Distance Helper
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
}

// --- Main ---
async function main() {
    console.log('=== L1 Expansion Fill (All Stations) ===');

    // 1. Fetch ALL Stations from stations_static
    const { data: stations, error } = await supabase
        .from('stations_static')
        .select('id, name, location')
        .order('id'); // Deterministic order

    if (error) return console.error('Fetch error:', error);
    if (!stations || stations.length === 0) return console.error('No stations found in DB');

    console.log(`Found ${stations.length} target stations in DB.`);

    // 2. Process
    for (const station of stations) {
        await processStation(station);
        await new Promise(r => setTimeout(r, 1000)); // 1s cooldown
    }

    console.log('\n=== L1 EXPANSION COMPLETE ===');
}

main().catch(console.error);
