
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// --- Configuration ---
// Optimized with exponential backoff retry and reduced concurrency for stability
const CONFIG = {
    // Hybrid Ranges
    RANGE_WIDE: 800,   // Culture, Leisure, Medical, Business, Nature, Service, Accommodation
    RANGE_CORE: 300,   // Dining, Shopping, Finance

    // Retry Settings (optimized for Overpass API rate limits)
    CONCURRENCY: 2,           // Reduced from 4 to avoid rate limiting
    DELAY_MS: 10000,          // Increased from 3000ms for better stability
    MAX_RETRIES: 6,           // Increased from 4 for better recovery
    INITIAL_RETRY_DELAY: 5000, // Initial delay before first retry
    BACKOFF_MULTIPLIER: 2.5,  // Exponential backoff multiplier
    MAX_RETRY_DELAY: 120000,  // Max 2 minutes between retries
    JITTER_RANGE: 0.3,        // Random jitter to desynchronize clients

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
// Business = Office, Coworking
// Service = Public Service (Post, Police, Library, Townhall)
// Nature = Park, Water, Garden
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

/**
 * Calculate exponential backoff delay with jitter
 */
function calculateRetryDelay(retries: number): number {
    const baseDelay = CONFIG.INITIAL_RETRY_DELAY * Math.pow(CONFIG.BACKOFF_MULTIPLIER, retries);
    const cappedDelay = Math.min(baseDelay, CONFIG.MAX_RETRY_DELAY);
    const jitterFactor = 1 + (Math.random() * 2 - 1) * CONFIG.JITTER_RANGE;
    return Math.round(cappedDelay * jitterFactor);
}

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
            const wait = calculateRetryDelay(retries);
            console.log(`⚠️ HTTP ${response.status}, waiting ${wait}ms...`);
            await new Promise(r => setTimeout(r, wait));
            if (retries >= CONFIG.MAX_RETRIES) throw new Error(`Max retries hit (${response.status})`);
            return fetchOverpass(query, retries + 1);
        }

        if (!response.ok) throw new Error(`Overpass HTTP ${response.status}`);
        return await response.json();

    } catch (e: any) {
        if (retries >= CONFIG.MAX_RETRIES) throw e;
        const wait = calculateRetryDelay(retries);
        console.log(`⚠️ Network Error: ${e.message}, waiting ${wait}ms...`);
        await new Promise(r => setTimeout(r, wait));
        return fetchOverpass(query, retries + 1);
    }
}

// Global memory for deduplication across stations
const GLOBAL_SEEN_IDS = new Set<string>();

async function processStation(station: any) {
    if (!station.coordinates) return;

    // Extract coords
    let lat, lon;
    if (typeof station.coordinates === 'string') {
        const m = station.coordinates.match(/POINT\(([-0-9\.]+) ([-0-9\.]+)\)/);
        if (m) { lon = parseFloat(m[1]); lat = parseFloat(m[2]); }
    } else if (station.coordinates.coordinates) {
        [lon, lat] = station.coordinates.coordinates;
    }
    if (!lat || !lon) return;

    console.log(`⚡ Processing ${station.name} (${station.id})...`);

    try {
        // Query 800m
        const query = buildUnifiedQuery(lat, lon, CONFIG.RANGE_WIDE);
        const data = await fetchOverpass(query);
        const elements = data.elements || [];

        const categoryGroups: Record<string, any[]> = {};

        // 1. Parsing Loop
        for (const el of elements) {
            const tags = el.tags || {};
            if (!tags.name) continue; // Requires Name

            // [NEW] Global Deduplication
            // If this OSM ID has been claimed by a previous station, SKIP IT.
            // Note: This relies on processing order. Ideally we process generic stations first or Hubs first?
            // Currently sequential. This effectively assigns the POI to the FIRST station that claims it.
            // A better approach for "closest station" requires 2-pass, but for now "first come" with 800m overlap
            // reduction is a massive improvement over duplicates.
            // Let's stick to simple "if seen, skip" for this iteration to solve the "inflated count" issue immediately.
            if (GLOBAL_SEEN_IDS.has(el.id)) continue;

            const classification = classifyPOI(tags);
            if (!classification) continue;

            // [NEW] Strict Nature Filtering
            // Remove small parks unless they have fame tags or specific keywords
            if (classification.category === 'nature' && classification.subcategory === 'park') {
                const isFamous = tags.wikipedia || tags.wikidata;
                const hasKeywords = tags.name.includes('恩賜') || tags.name.includes('御苑') || tags.name.includes('皇居') || tags.name.includes('庭園');
                if (!isFamous && !hasKeywords) continue;
            }

            // [NEW] Strict Finance Filtering (No ATMs)
            if (classification.category === 'finance') {
                const isATM = tags.amenity === 'atm' || tags.name.includes('ATM') || tags.name.includes('出張所');
                if (isATM) continue;
            }

            // [NEW] Strict Business Filtering (Major Offices Only)
            if (classification.category === 'business') {
                // Must have Building levels > 10 OR contain "Tower"/"Building"/"Headquarters" OR have fame tags
                // Japanese keywords: タワー, ビル, 本社, センター
                const isTall = parseInt(tags['building:levels'] || '0') > 10;
                const isMajor = tags.name.includes('タワー') || tags.name.includes('ビル') || tags.name.includes('本社') || tags.name.includes('Tower');
                const isFamous = tags.wikipedia || tags.wikidata;

                if (!isTall && !isMajor && !isFamous) continue;
            }

            // Geometry
            const pLat = el.lat || el.center?.lat;
            const pLon = el.lon || el.center?.lon;
            if (!pLat || !pLon) continue;

            const dist = calculateDistance(lat, lon, pLat, pLon);

            // Check Range (Hybrid Logic)
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
            console.log(`- No POIs found for ${station.name}`);
            return;
        }

        // 3. Upsert POIs
        await supabase.from('l1_places').delete().eq('station_id', station.id);
        const { error } = await supabase.from('l1_places').upsert(finalRows, { onConflict: 'station_id,osm_id' });
        if (error) throw error;

        console.log(`✅ ${station.name}: Ingested ${finalRows.length} POIs (Scanned ${elements.length}).`);

    } catch (err: any) {
        console.error(`❌ Failed ${station.name}: ${err.message}`);
    }
}


// --- Main ---
async function main() {
    console.log('=== V29.4 L1 Scraper (Hybrid Range + Shadow DNA) ===');

    // 1. Fetch Stations
    const { data: stations, error } = await supabase
        .from('nodes')
        .select('id, name, coordinates')
        .eq('is_active', true);

    if (error) return console.error('Fetch error:', error);

    // Filter target lines
    const TARGETS = ['TokyoMetro', 'Toei', 'JR-East', 'Keisei', 'TsukubaExpress'];
    const candidates = stations.filter(s => TARGETS.some(t => s.id.includes(t)));

    console.log(`Found ${candidates.length} target stations.`);

    // 2. Process in batches
    for (let i = 0; i < candidates.length; i += CONFIG.CONCURRENCY) {
        const batch = candidates.slice(i, i + CONFIG.CONCURRENCY);
        console.log(`\n--- Batch ${Math.floor(i / CONFIG.CONCURRENCY) + 1} (${batch.length}) ---`);

        await Promise.all(batch.map(s => processStation(s)));

        if (i + CONFIG.CONCURRENCY < candidates.length) {
            console.log(`Waiting ${CONFIG.DELAY_MS}ms...`);
            await new Promise(r => setTimeout(r, CONFIG.DELAY_MS));
        }
    }

    console.log('\n=== COMPLETE ===');
}

// Check for single station test mode
const args = process.argv.slice(2);
if (args[0] === '--test-single') {
    const targetId = args[1];
    console.log('TEST MODE: ' + targetId);
    supabase.from('nodes').select('*').eq('id', targetId).single().then(({ data }) => {
        if (!data) console.error('Station not found');
        else processStation(data);
    });
} else {
    main();
}
