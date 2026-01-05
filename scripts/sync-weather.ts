
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

// WMO Weather Code Mapping (Copied from src/lib/weather/service.ts for self-containment)
const WMO_CODES: Record<number, { condition: string; label: string; emoji: string }> = {
    0: { condition: 'Clear', label: '晴', emoji: '☀️' },
    1: { condition: 'Clear', label: '晴', emoji: '☀️' },
    2: { condition: 'PartlyCloudy', label: '多雲', emoji: '⛅' },
    3: { condition: 'Cloudy', label: '陰', emoji: '☁️' },
    45: { condition: 'Fog', label: '霧', emoji: '🌫️' },
    48: { condition: 'Fog', label: '霧', emoji: '🌫️' },
    51: { condition: 'Drizzle', label: '小雨', emoji: '🌧️' },
    53: { condition: 'Drizzle', label: '小雨', emoji: '🌧️' },
    55: { condition: 'Drizzle', label: '毛毛雨', emoji: '🌧️' },
    61: { condition: 'Rain', label: '雨', emoji: '🌧️' },
    63: { condition: 'Rain', label: '中雨', emoji: '🌧️' },
    65: { condition: 'HeavyRain', label: '大雨', emoji: '🌧️' },
    71: { condition: 'Snow', label: '小雪', emoji: '🌨️' },
    73: { condition: 'Snow', label: '雪', emoji: '🌨️' },
    75: { condition: 'HeavySnow', label: '大雪', emoji: '🌨️' },
    77: { condition: 'Snow', label: '雪粒', emoji: '🌨️' },
    80: { condition: 'Showers', label: '陣雨', emoji: '🌦️' },
    81: { condition: 'Showers', label: '陣雨', emoji: '🌦️' },
    82: { condition: 'HeavyShowers', label: '暴雨', emoji: '⛈️' },
    85: { condition: 'SnowShowers', label: '陣雪', emoji: '🌨️' },
    86: { condition: 'HeavySnowShowers', label: '暴雪', emoji: '🌨️' },
    95: { condition: 'Thunderstorm', label: '雷雨', emoji: '⛈️' },
    96: { condition: 'Thunderstorm', label: '雷雨+冰雹', emoji: '⛈️' },
    99: { condition: 'Thunderstorm', label: '強雷雨', emoji: '⛈️' }
};

async function fetchWeather(lat: number, lon: number) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m&timezone=Asia%2FTokyo`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Weather fetch failed: ${res.status}`);
    const data = await res.json();
    const code = data.current.weather_code;
    const info = WMO_CODES[code] || { condition: 'Unknown', label: '不明', emoji: '❓' };

    return {
        temp: data.current.temperature_2m,
        condition: info.condition,
        label: info.label,
        emoji: info.emoji,
        wind: data.current.wind_speed_10m,
        code
    };
}

function parseCoords(coords: any): [number, number] | null {
    if (!coords) return null;
    // Handle PostGIS hex if needed, but usually select in RPC or standard query handles it?
    // Let's assume standard select returns either object or string.
    if (coords.coordinates && Array.isArray(coords.coordinates)) {
        return [coords.coordinates[1], coords.coordinates[0]]; // lat, lon
    }
    // If it's a string like "0101000020E6100000...", we need a different approach or SQL cast
    return null;
}

async function run() {
    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Missing Supabase credentials');
        return;
    }

    console.log('Starting Weather Sync...');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all valid station IDs from stations_static to ensure we respect FK constraints
    const { data: stations, error: stationError } = await supabase
        .from('stations_static')
        .select('id');

    if (stationError) {
        console.error('❌ Error fetching stations_static:', stationError);
        return;
    }
    const stationIdSet = new Set(stations.map(s => s.id));

    // Fetch all active nodes with ward_id and coordinates
    const { data: nodes, error: nodeError } = await supabase
        .from('nodes')
        .select('id, ward_id, coordinates, name')
        .eq('is_active', true);

    if (nodeError) {
        console.error('❌ Error fetching nodes:', nodeError);
        return;
    }

    // Filter nodes that are actually in stations_static
    const validNodes = nodes.filter(n => stationIdSet.has(n.id));
    console.log(`✓ Found ${nodes.length} nodes, ${validNodes.length} are valid stations.`);

    // Group by ward_id to minimize API calls
    const wardGroups: Record<string, any[]> = {};
    validNodes.forEach(n => {
        const wid = n.ward_id || 'unknown';
        if (!wardGroups[wid]) wardGroups[wid] = [];
        wardGroups[wid].push(n);
    });

    console.log(`✓ Found ${nodes.length} nodes across ${Object.keys(wardGroups).length} groups.`);

    const weatherCache: Record<string, any> = {};
    const batchSize = 50;
    const updates: { station_id: string; weather_info: any; updated_at: string; status_code: string }[] = [];
    const now = new Date().toISOString();

    for (const [wardId, wardNodes] of Object.entries(wardGroups)) {
        try {
            // Find a node with coordinates to use as reference
            // Default to Tokyo Center (Shinjuku) if none found
            let lat = 35.6895;
            let lon = 139.6917;

            const rep = wardNodes.find(n => n.coordinates);
            if (rep && rep.coordinates && rep.coordinates.coordinates) {
                lon = rep.coordinates.coordinates[0];
                lat = rep.coordinates.coordinates[1];
            }

            // Group by a grid of 0.1 degrees to handle regional variation if ward is 'unknown'
            const cacheKey = wardId === 'unknown' ? `grid:${Math.round(lat * 10)}:${Math.round(lon * 10)}` : wardId;

            if (!weatherCache[cacheKey]) {
                process.stdout.write(`  Fetching weather for ${wardId}... `);
                weatherCache[cacheKey] = await fetchWeather(lat, lon);
                console.log(`Done (${weatherCache[cacheKey].temp}°C)`);
                // Sleep slightly to respect rate limits
                await new Promise(r => setTimeout(r, 200));
            }

            const weather = weatherCache[cacheKey];
            wardNodes.forEach(node => {
                updates.push({
                    station_id: node.id,
                    weather_info: {
                        ...weather,
                        update_time: now
                    },
                    updated_at: now,
                    status_code: 'NORMAL'
                });
            });
        } catch (e: any) {
            console.error(`\n❌ Failed to process ward ${wardId}:`, e.message);
        }
    }

    console.log(`\nUpserting ${updates.length} records to transit_dynamic_snapshot...`);

    // Chunk updates to avoid payload size limits
    for (let i = 0; i < updates.length; i += batchSize) {
        const chunk = updates.slice(i, i + batchSize);
        const { error: upsertError } = await supabase
            .from('transit_dynamic_snapshot')
            .upsert(chunk, { onConflict: 'station_id' });

        if (upsertError) {
            console.error(`  ❌ Error in batch ${i / batchSize}:`, upsertError.message);
        } else {
            process.stdout.write(`\r  Progress: ${Math.min(i + batchSize, updates.length)}/${updates.length} upserted...`);
        }
    }

    console.log('\n\n✅ Weather Sync Complete!');
}

run().catch(console.error);
