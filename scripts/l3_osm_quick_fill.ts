/**
 * Phase 1: OSM Quick Fill for L3 Station Facilities
 *
 * This script queries OpenStreetMap via Overpass API to find
 * toilets, elevators, lockers, and ATMs near each station.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const RADIUS_METERS = 100; // Tighter radius for station-internal facilities
const DELAY_MS = 2000; // Polite delay between requests

// Facility types to query
const FACILITY_QUERIES = [
    { osmKey: 'amenity', osmValue: 'toilets', type: 'toilet' },
    { osmKey: 'highway', osmValue: 'elevator', type: 'elevator' },
    { osmKey: 'amenity', osmValue: 'locker', type: 'locker' },
    { osmKey: 'amenity', osmValue: 'atm', type: 'atm' },
    { osmKey: 'amenity', osmValue: 'baby_hatch', type: 'nursing' },
];

interface NodeRecord {
    id: string;
    coordinates: { type: string; coordinates: [number, number] };
}

async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchOverpass(lat: number, lon: number, osmKey: string, osmValue: string): Promise<any[]> {
    const query = `
        [out:json][timeout:25];
        (
            node["${osmKey}"="${osmValue}"](around:${RADIUS_METERS},${lat},${lon});
            way["${osmKey}"="${osmValue}"](around:${RADIUS_METERS},${lat},${lon});
        );
        out center tags;
    `;

    const response = await fetch(OVERPASS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`
    });

    if (!response.ok) {
        console.warn(`Overpass returned ${response.status}`);
        return [];
    }

    const data = await response.json();
    return data.elements || [];
}

async function getMissingStations(): Promise<NodeRecord[]> {
    // Get all nodes
    const { data: nodes, error: nodeErr } = await supabase
        .from('nodes')
        .select('id, coordinates')
        .eq('is_active', true);

    if (nodeErr || !nodes) {
        console.error('Failed to fetch nodes:', nodeErr);
        return [];
    }

    // Get stations that already have L3 facilities (excluding bikeshare)
    const { data: existing } = await supabase
        .from('l3_facilities')
        .select('station_id')
        .neq('type', 'bikeshare');

    const coveredIds = new Set((existing || []).map(r => r.station_id));

    // Filter to missing
    return nodes.filter(n => !coveredIds.has(n.id)) as NodeRecord[];
}

function parseCoordinates(node: NodeRecord): { lat: number; lon: number } | null {
    const coords = node.coordinates as any;
    if (coords && coords.type === 'Point' && Array.isArray(coords.coordinates)) {
        return { lon: coords.coordinates[0], lat: coords.coordinates[1] };
    }
    return null;
}

function transformToFacility(osmElement: any, stationId: string, facilityType: string) {
    const tags = osmElement.tags || {};

    // Build name
    const name = tags.name || tags['name:en'] || tags['name:ja'] || `${facilityType} (OSM)`;

    // Build attributes based on type
    const attributes: Record<string, any> = {
        osm_id: osmElement.id,
        source: 'OpenStreetMap',
    };

    if (facilityType === 'toilet') {
        attributes.wheelchair = tags.wheelchair === 'yes';
        attributes.fee = tags.fee === 'yes';
    } else if (facilityType === 'locker') {
        attributes.payment = tags.payment ? tags.payment.split(';') : undefined;
    } else if (facilityType === 'atm') {
        attributes.operator = tags.operator;
        attributes.network = tags.network;
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
        type: facilityType,
        name_i18n: {
            en: name,
            ja: tags['name:ja'] || name,
        },
        location_coords: lat && lon ? `POINT(${lon} ${lat})` : null,
        attributes,
        source_url: `https://www.openstreetmap.org/${osmElement.type}/${osmElement.id}`,
        updated_at: new Date().toISOString()
    };
}

async function main() {
    console.log('🚀 Phase 1: OSM Quick Fill for L3 Facilities');
    console.log('============================================\n');

    const missingStations = await getMissingStations();
    console.log(`📍 Found ${missingStations.length} stations missing L3 data.\n`);

    let totalInserted = 0;
    let stationsProcessed = 0;

    for (const station of missingStations) {
        const coords = parseCoordinates(station);
        if (!coords) {
            console.warn(`⚠️ Skipping ${station.id}: invalid coordinates`);
            continue;
        }

        console.log(`[${++stationsProcessed}/${missingStations.length}] Processing ${station.id}...`);

        const facilitiesToInsert: any[] = [];

        for (const fq of FACILITY_QUERIES) {
            const elements = await fetchOverpass(coords.lat, coords.lon, fq.osmKey, fq.osmValue);

            for (const el of elements) {
                facilitiesToInsert.push(transformToFacility(el, station.id, fq.type));
            }

            // Small delay between category queries
            await sleep(500);
        }

        if (facilitiesToInsert.length > 0) {
            const { error } = await supabase
                .from('l3_facilities')
                .upsert(facilitiesToInsert);

            if (error) {
                console.error(`  ❌ Insert error: ${error.message}`);
            } else {
                console.log(`  ✅ Inserted ${facilitiesToInsert.length} facilities`);
                totalInserted += facilitiesToInsert.length;
            }
        } else {
            console.log(`  ⏭️  No facilities found nearby`);
        }

        // Polite delay between stations
        await sleep(DELAY_MS);
    }

    console.log('\n============================================');
    console.log(`📊 Phase 1 Complete!`);
    console.log(`   Stations Processed: ${stationsProcessed}`);
    console.log(`   Total Facilities Inserted: ${totalInserted}`);
}

main().catch(console.error);
