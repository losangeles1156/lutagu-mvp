
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

const OVERPASS_ENDPOINTS = [
    'https://overpass-api.de/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter'
];

const RADIUS_METERS = 300; // Increased for Ueno as it's large

async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchOverpassAccessibility(lat: number, lon: number) {
    const query = `
        [out:json][timeout:60];
        (
            node["highway"="elevator"](around:${RADIUS_METERS},${lat},${lon});
            way["highway"="elevator"](around:${RADIUS_METERS},${lat},${lon});
            way["highway"="steps"]["conveying"](around:${RADIUS_METERS},${lat},${lon});
            node["highway"="toilets"](around:${RADIUS_METERS},${lat},${lon});
            node["amenity"="toilets"](around:${RADIUS_METERS},${lat},${lon});
        );
        out center tags;
    `;

    for (let i = 0; i < OVERPASS_ENDPOINTS.length; i++) {
        const endpoint = OVERPASS_ENDPOINTS[i];
        console.log(`Fetching from ${endpoint}...`);
        try {
            const controller = new AbortController();
            setTimeout(() => controller.abort(), 60000);

            const response = await fetch(endpoint, {
                method: 'POST',
                body: `data=${encodeURIComponent(query)}`,
                signal: controller.signal
            });

            if (response.ok) {
                const data = await response.json();
                return data.elements || [];
            } else {
                console.warn(`Error ${response.status} from ${endpoint}`);
            }
        } catch (e) {
            console.error(`Fetch error:`, e);
        }
        await sleep(2000);
    }
    return [];
}

async function fillUenoL3() {
    console.log('--- Filling L3 Data for Ueno ---');

    // Get coordinates
    const { data: nodes } = await supabase
        .from('nodes')
        .select('id, coordinates')
        .in('id', ['Hub:Ueno', 'odpt:Station:JR-East.Ueno']);

    if (!nodes || nodes.length === 0) {
        console.error('Ueno nodes not found!');
        return;
    }

    for (const node of nodes) {
        console.log(`Processing ${node.id}...`);

        // 1. Clear existing facilities for this node to avoid duplicates/conflicts
        const { error: deleteError } = await supabase
            .from('l3_facilities')
            .delete()
            .eq('station_id', node.id);

        if (deleteError) {
            console.error(`Error clearing facilities for ${node.id}:`, deleteError);
            continue;
        }

        const coords = node.coordinates as any; // PostGIS Point
        // coords usually come as { type: 'Point', coordinates: [lon, lat] } or similar
        // Need to check structure.

        let lon: number, lat: number;
        if (Array.isArray(coords)) {
            [lon, lat] = coords;
        } else if (coords.coordinates) {
            [lon, lat] = coords.coordinates;
        } else {
            console.error('Invalid coordinates format:', coords);
            continue;
        }

        console.log(`Coords: ${lat}, ${lon}`);
        const elements = await fetchOverpassAccessibility(lat, lon);
        console.log(`Found ${elements.length} elements.`);

        for (const el of elements) {
            const type = el.tags?.highway === 'elevator' ? 'elevator' :
                         (el.tags?.conveying === 'yes' ? 'escalator' :
                         (el.tags?.highway === 'toilets' || el.tags?.amenity === 'toilets' ? 'toilet' : 'other'));

            if (type === 'other') continue;

            const { error } = await supabase.from('l3_facilities').insert({
                station_id: node.id,
                type: type,
                location_coords: `POINT(${el.lon || el.center?.lon} ${el.lat || el.center?.lat})`,
                attributes: el.tags,
                source_url: `https://www.openstreetmap.org/${el.type}/${el.id}`
            });

            if (error) {
                 console.error('Insert error:', error);
            }
        }
        console.log(`Inserted facilities for ${node.id}`);
    }
}

fillUenoL3();
