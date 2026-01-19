
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

function normalizeLonLat(lonRaw: unknown, latRaw: unknown): [number, number] | null {
    const lon = Number(lonRaw);
    const lat = Number(latRaw);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
    if (lon === 0 && lat === 0) return null;

    if (Math.abs(lon) <= 180 && Math.abs(lat) <= 90) return [lon, lat];
    if (Math.abs(lat) <= 180 && Math.abs(lon) <= 90) return [lat, lon];
    return null;
}

function extractLonLat(value: any): [number, number] | null {
    if (!value) return null;

    if (typeof value === 'string') {
        const m = value.match(/POINT\s*\(\s*([-0-9\.]+)\s+([-0-9\.]+)\s*\)/i);
        if (!m) return null;
        return normalizeLonLat(m[1], m[2]);
    }

    if (Array.isArray(value) && value.length >= 2) {
        return normalizeLonLat(value[0], value[1]);
    }

    const coords =
        (Array.isArray(value?.coordinates?.coordinates) ? value.coordinates.coordinates : null) ??
        (Array.isArray(value?.coordinates) ? value.coordinates : null) ??
        (Array.isArray(value?.geometry?.coordinates) ? value.geometry.coordinates : null);

    if (Array.isArray(coords) && coords.length >= 2) {
        return normalizeLonLat(coords[0], coords[1]);
    }

    return null;
}

async function main() {
    console.log('=== Syncing stations_static to nodes ===');

    // 1. Fetch stations_static
    const { data: stations, error } = await supabase
        .from('stations_static')
        .select('*');

    if (error || !stations) {
        console.error('Fetch Error:', error);
        return;
    }

    console.log(`Found ${stations.length} stations in static table.`);

    const toUpsert: any[] = [];

    for (const s of stations) {
        const id = String((s as any).id ?? (s as any).station_id ?? '');
        if (!id) {
            console.warn('Skipping station due to missing id');
            continue;
        }

        if (!s.name) {
            console.warn(`Skipping ${id} due to missing name`);
            continue;
        }

        // Map to nodes schema
        // nodes: id, name (jsonb), coordinates (geo), city_id, node_type, is_active, updated_at

        const lonLat = extractLonLat((s as any).location);
        if (!lonLat) {
            console.warn(`Skipping ${id} due to invalid coordinates`);
            continue;
        }

        toUpsert.push({
            id,
            name: s.name,
            coordinates: { type: 'Point', coordinates: lonLat },
            city_id: (s as any).city_id || 'tokyo_core',
            node_type: (s as any).type || (s as any).node_type || 'station',
            is_active: true,
            updated_at: new Date().toISOString()
        });
    }

    // 2. Upsert to nodes
    if (toUpsert.length > 0) {
        // Batch in chunks of 100
        const CHUNK_SIZE = 100;
        for (let i = 0; i < toUpsert.length; i += CHUNK_SIZE) {
            const chunk = toUpsert.slice(i, i + CHUNK_SIZE);
            const { error: upsertErr } = await supabase
                .from('nodes')
                .upsert(chunk, { onConflict: 'id' });

            if (upsertErr) {
                console.error(`Error syncing chunk ${i}:`, upsertErr.message);
            } else {
                console.log(`Synced ${chunk.length} nodes (batch ${i}).`);
            }
        }
    }

    console.log('Sync complete.');
}

main();
