
/**
 * L3 Data Supplement: Toilets
 *
 * This script targets Toilets (amenity=toilets) from OpenStreetMap
 * to supplement existing L3 data for all active stations.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const RADIUS_METERS = 150;
const DELAY_MS = 1500;

interface NodeRecord {
    id: string;
    coordinates: { type: string; coordinates: [number, number] };
    name: string;
}

async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchOverpassToilets(lat: number, lon: number): Promise<any[]> {
    const query = `
        [out:json][timeout:25];
        (
            node["amenity"="toilets"](around:${RADIUS_METERS},${lat},${lon});
            way["amenity"="toilets"](around:${RADIUS_METERS},${lat},${lon});
        );
        out center tags;
    `;

    let retries = 3;
    while (retries > 0) {
        try {
            const response = await fetch(OVERPASS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `data=${encodeURIComponent(query)}`
            });

            if (response.status === 429) {
                console.warn('Overpass 429 (Too Many Requests). Waiting 10s...');
                await sleep(10000);
                retries--;
                continue;
            }

            if (!response.ok) {
                console.warn(`Overpass returned ${response.status}`);
                return [];
            }

            const data = await response.json();
            return data.elements || [];
        } catch (error) {
            console.error('Overpass fetch error:', error);
            await sleep(2000);
            retries--;
        }
    }
    return [];
}

async function getActiveStations(): Promise<NodeRecord[]> {
    const { data: nodes, error } = await supabase
        .from('nodes')
        .select('id, coordinates, name')
        .eq('is_active', true);

    if (error || !nodes) {
        console.error('Failed to fetch nodes:', error);
        return [];
    }

    return nodes as unknown as NodeRecord[];
}

function parseCoordinates(node: NodeRecord): { lat: number; lon: number } | null {
    const coords = node.coordinates as any;
    if (coords && coords.type === 'Point' && Array.isArray(coords.coordinates)) {
        return { lon: coords.coordinates[0], lat: coords.coordinates[1] };
    }
    return null;
}

function transformToilet(osmElement: any, stationId: string) {
    const tags = osmElement.tags || {};

    let nameEn = tags['name:en'] || tags['name'] || 'Public Restroom';
    let nameJa = tags['name:ja'] || tags['name'] || '公衆トイレ';

    // Attributes
    const attributes: Record<string, any> = {
        osm_id: osmElement.id,
        source: 'OpenStreetMap',
        fee: tags.fee === 'yes',
        wheelchair: tags.wheelchair === 'yes' || tags.wheelchair === 'designated',
        changing_table: tags.changing_table === 'yes' || tags.diaper === 'yes',
        unisex: tags.unisex === 'yes',
        operator: tags.operator
    };

    // Get location
    let lat = osmElement.lat;
    let lon = osmElement.lon;
    if (osmElement.center) {
        lat = osmElement.center.lat;
        lon = osmElement.center.lon;
    }

    return {
        station_id: stationId,
        type: 'toilet',
        name_i18n: {
            en: nameEn,
            ja: nameJa,
        },
        location_coords: lat && lon ? `POINT(${lon} ${lat})` : null,
        attributes,
        source_url: `https://www.openstreetmap.org/${osmElement.type}/${osmElement.id}`,
        updated_at: new Date().toISOString()
    };
}

async function main() {
    console.log('🚀 L3 Supplement: Toilets');
    console.log('============================================\n');

    const stations = await getActiveStations();
    console.log(`📍 Found ${stations.length} active stations.\n`);

    let totalInserted = 0;
    let stationsProcessed = 0;

    for (const station of stations) {
        const coords = parseCoordinates(station);
        if (!coords) {
            continue;
        }

        console.log(`[${++stationsProcessed}/${stations.length}] Checking ${station.name || station.id}...`);

        const elements = await fetchOverpassToilets(coords.lat, coords.lon);

        if (elements.length > 0) {
            const facilitiesToInsert = elements.map(el => transformToilet(el, station.id));

            // Check existing to avoid duplicates
            const { data: existing } = await supabase
                .from('l3_facilities')
                .select('attributes')
                .eq('station_id', station.id)
                .eq('type', 'toilet');

            const existingOsmIds = new Set(existing?.map((r: any) => r.attributes?.osm_id).filter(Boolean));
            const newFacilities = facilitiesToInsert.filter(f => !existingOsmIds.has(f.attributes.osm_id));

            if (newFacilities.length > 0) {
                const { error } = await supabase
                    .from('l3_facilities')
                    .insert(newFacilities);

                if (error) {
                    console.error(`  ❌ Insert error: ${error.message}`);
                } else {
                    console.log(`  ✅ Added ${newFacilities.length} new toilets`);
                    totalInserted += newFacilities.length;
                }
            } else {
                console.log(`  ✨ All ${elements.length} toilets already exist.`);
            }

        } else {
            console.log(`  No toilets found nearby.`);
        }

        await sleep(DELAY_MS);
    }

    console.log('\n============================================');
    console.log(`📊 Toilet Supplement Complete!`);
    console.log(`   Total Toilets Added: ${totalInserted}`);
}

main().catch(console.error);
