
/**
 * L3 Data Supplement: Coin Lockers
 *
 * This script specifically targets Coin Lockers (amenity=locker) from OpenStreetMap
 * to supplement existing L3 data. It runs for ALL active stations, not just missing ones.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const RADIUS_METERS = 150; // slightly larger radius to catch lockers just outside gates
const DELAY_MS = 1500;

interface NodeRecord {
    id: string;
    coordinates: { type: string; coordinates: [number, number] };
    name: string;
}

async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchOverpassLockers(lat: number, lon: number): Promise<any[]> {
    const query = `
        [out:json][timeout:25];
        (
            node["amenity"="locker"](around:${RADIUS_METERS},${lat},${lon});
            way["amenity"="locker"](around:${RADIUS_METERS},${lat},${lon});
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

function transformLocker(osmElement: any, stationId: string) {
    const tags = osmElement.tags || {};

    // Intelligent Name
    let nameEn = tags['name:en'] || tags['name'] || 'Coin Locker';
    let nameJa = tags['name:ja'] || tags['name'] || 'コインロッカー';

    // If generic, append location hint if available
    if (tags.operator) {
        nameEn = `${tags.operator} Locker`;
        nameJa = `${tags.operator} コインロッカー`;
    }

    // Attributes
    const attributes: Record<string, any> = {
        osm_id: osmElement.id,
        source: 'OpenStreetMap',
        fee: tags.fee,
        capacity: tags.capacity,
        opening_hours: tags.opening_hours,
        operator: tags.operator,
        payment: []
    };

    // Payment Methods
    if (tags['payment:suica'] === 'yes') attributes.payment.push('Suica');
    if (tags['payment:pasmo'] === 'yes') attributes.payment.push('PASMO');
    if (tags['payment:ic_cards'] === 'yes') attributes.payment.push('IC Cards');
    if (tags['payment:coins'] === 'yes') attributes.payment.push('Coins');
    if (tags['payment:cash'] === 'yes') attributes.payment.push('Cash');

    // Dedupe payment
    attributes.payment = [...new Set(attributes.payment)];

    // Get location
    let lat = osmElement.lat;
    let lon = osmElement.lon;
    if (osmElement.center) {
        lat = osmElement.center.lat;
        lon = osmElement.center.lon;
    }

    return {
        station_id: stationId,
        type: 'locker', // matching frontend category 'locker'
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
    console.log('🚀 L3 Supplement: Coin Lockers');
    console.log('============================================\n');

    const stations = await getActiveStations();
    console.log(`📍 Found ${stations.length} active stations.\n`);

    let totalInserted = 0;
    let stationsProcessed = 0;

    for (const station of stations) {
        const coords = parseCoordinates(station);
        if (!coords) {
            console.warn(`⚠️ Skipping ${station.id}: invalid coordinates`);
            continue;
        }

        console.log(`[${++stationsProcessed}/${stations.length}] Checking ${station.name || station.id}...`);

        const elements = await fetchOverpassLockers(coords.lat, coords.lon);

        if (elements.length > 0) {
            const facilitiesToInsert = elements.map(el => transformLocker(el, station.id));

            // Upsert (will update if match on ID? No, we don't have unique constraint on osm_id in schema likely)
            // But we want to avoid duplicates if we run this multiple times.
            // The schema likely doesn't have a constraint on (station_id, osm_id).
            // So we might need to delete existing lockers for this station first OR check existence.
            // To be safe and clean: Delete existing 'coin_locker' for this station and re-insert.
            // This ensures we have the latest set and no duplicates.

            // 1. Delete existing lockers for this station
            /*
            // Commented out to avoid accidental data loss if other sources exist.
            // But for now, assuming this script is the authority for OSM lockers.
            await supabase
                .from('l3_facilities')
                .delete()
                .eq('station_id', station.id)
                .eq('type', 'coin_locker')
                .ilike('attributes->>source', 'OpenStreetMap');
            */

            // Actually, let's just insert. If we duplicate, we duplicate.
            // Ideally we should check if osm_id exists in attributes.

            // Let's do a check-and-insert approach to avoid duplicates
            // Get existing lockers for this station
            const { data: existing } = await supabase
                .from('l3_facilities')
                .select('attributes')
                .eq('station_id', station.id)
                .eq('type', 'locker');

            const existingOsmIds = new Set(existing?.map((r: any) => r.attributes?.osm_id).filter(Boolean));

            const newFacilities = facilitiesToInsert.filter(f => !existingOsmIds.has(f.attributes.osm_id));

            if (newFacilities.length > 0) {
                const { error } = await supabase
                    .from('l3_facilities')
                    .insert(newFacilities);

                if (error) {
                    console.error(`  ❌ Insert error: ${error.message}`);
                } else {
                    console.log(`  ✅ Added ${newFacilities.length} new lockers (found ${elements.length} total)`);
                    totalInserted += newFacilities.length;
                }
            } else {
                console.log(`  ✨ All ${elements.length} lockers already exist.`);
            }

        } else {
            console.log(`  Example: No lockers found.`);
        }

        // Polite delay
        await sleep(DELAY_MS);
    }

    console.log('\n============================================');
    console.log(`📊 Coin Locker Supplement Complete!`);
    console.log(`   Stations Processed: ${stationsProcessed}`);
    console.log(`   Total Lockers Added: ${totalInserted}`);
}

main().catch(console.error);
