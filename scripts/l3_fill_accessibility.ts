
/**
 * L3 Data Supplement: Accessibility (Elevators & Escalators)
 *
 * This script targets:
 * 1. Elevators (highway=elevator)
 * 2. Escalators (highway=steps + conveying=yes)
 *
 * It helps identify barrier-free routes near stations.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const OVERPASS_ENDPOINTS = [
    'https://overpass-api.de/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter'
];

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

async function fetchOverpassAccessibility(lat: number, lon: number): Promise<any[]> {
    const query = `
        [out:json][timeout:60];
        (
            node["highway"="elevator"](around:${RADIUS_METERS},${lat},${lon});
            way["highway"="elevator"](around:${RADIUS_METERS},${lat},${lon});
            way["highway"="steps"]["conveying"](around:${RADIUS_METERS},${lat},${lon});
        );
        out center tags;
    `;

    let retries = 5;
    for (let i = 0; i < retries; i++) {
        // Rotate endpoints
        const endpoint = OVERPASS_ENDPOINTS[i % OVERPASS_ENDPOINTS.length];

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 90000); // 90s hard timeout

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `data=${encodeURIComponent(query)}`,
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (response.status === 429) {
                console.warn(`Overpass 429 (Too Many Requests) at ${endpoint}. Waiting ${10 + i * 5}s...`);
                await sleep((10000 + (i * 5000))); // Backoff: 10s, 15s, 20s...
                continue;
            }

            if (!response.ok) {
                console.warn(`Overpass returned ${response.status} at ${endpoint}`);
                await sleep(2000);
                continue;
            }

            const data = await response.json();
            return data.elements || [];
        } catch (error) {
            console.error(`Overpass fetch error at ${endpoint}:`, error);
            await sleep(3000);
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

function transformItem(osmElement: any, stationId: string) {
    const tags = osmElement.tags || {};
    const isElevator = tags.highway === 'elevator';
    const isEscalator = tags.highway === 'steps' && tags.conveying;

    let type = 'unknown';
    let nameEn = 'Facility';
    let nameJa = '施設';

    if (isElevator) {
        type = 'elevator';
        nameEn = 'Elevator';
        nameJa = 'エレベーター';
    } else if (isEscalator) {
        type = 'escalator';
        nameEn = 'Escalator';
        nameJa = 'エスカレーター';
    }

    // Override names if specific tags exist
    if (tags['name:en']) nameEn = tags['name:en'];
    if (tags['name:ja']) nameJa = tags['name:ja'];
    if (tags['name']) {
        // Fallback or append
        if (!tags['name:en'] && !tags['name:ja']) {
             nameEn = tags['name'];
             nameJa = tags['name'];
        }
    }

    // Attributes
    const attributes: Record<string, any> = {
        osm_id: osmElement.id,
        source: 'OpenStreetMap',
        wheelchair: tags.wheelchair,
        capacity: tags.capacity,
        operator: tags.operator,
        description: tags.description
    };

    if (isEscalator) {
        attributes.incline = tags.incline;
        attributes.conveying = tags.conveying; // forward, backward, reversible
    }

    // Get location
    let lat = osmElement.lat;
    let lon = osmElement.lon;
    if (osmElement.center) {
        lat = osmElement.center.lat;
        lon = osmElement.center.lon;
    }

    return {
        station_id: stationId,
        type: type,
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
    console.log('🚀 L3 Supplement: Accessibility (Elevators & Escalators)');
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

        const elements = await fetchOverpassAccessibility(coords.lat, coords.lon);

        if (elements.length > 0) {
            const facilitiesToInsert = elements.map(el => transformItem(el, station.id));

            // Check existing
            // Since we have multiple types (elevator, escalator), checking by osm_id is safest
            const { data: existing } = await supabase
                .from('l3_facilities')
                .select('attributes')
                .eq('station_id', station.id)
                .in('type', ['elevator', 'escalator']);

            const existingOsmIds = new Set(existing?.map((r: any) => r.attributes?.osm_id).filter(Boolean));
            const newFacilities = facilitiesToInsert.filter(f => !existingOsmIds.has(f.attributes.osm_id));

            if (newFacilities.length > 0) {
                const { error } = await supabase
                    .from('l3_facilities')
                    .insert(newFacilities);

                if (error) {
                    console.error(`  ❌ Insert error: ${error.message}`);
                } else {
                    console.log(`  ✅ Added ${newFacilities.length} items (Elevators/Escalators)`);
                    totalInserted += newFacilities.length;
                }
            } else {
                console.log(`  ✨ All ${elements.length} items already exist.`);
            }

        } else {
            console.log(`  No accessibility facilities found nearby.`);
        }

        await sleep(DELAY_MS);
    }

    console.log('\n============================================');
    console.log(`📊 Accessibility Supplement Complete!`);
    console.log(`   Total Items Added: ${totalInserted}`);
}

main().catch(console.error);
