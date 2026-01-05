
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

const TOP_10_STATIONS = [
    { id: 'odpt:Station:JR-East.Tokyo', name: 'Tokyo', vibe: ['Business', 'Travel Hub', 'Historic'], lines: ['JR Yamanote', 'Marunouchi', 'Shinkansen'] },
    { id: 'odpt:Station:JR-East.Shinjuku', name: 'Shinjuku', vibe: ['Nightlife', 'Busy', 'Shopping'], lines: ['JR Yamanote', 'Chuo', 'Odakyu', 'Keio'] },
    { id: 'odpt:Station:JR-East.Shibuya', name: 'Shibuya', vibe: ['Youth', 'Fashion', 'Tech'], lines: ['JR Yamanote', 'Ginza', 'Hanzomon', 'Fukutoshin'] },
    { id: 'odpt:Station:JR-East.Ikebukuro', name: 'Ikebukuro', vibe: ['Anime', 'Shopping', 'Student'], lines: ['JR Yamanote', 'Marunouchi', 'Yurakucho'] },
    { id: 'odpt:Station:JR-East.Ueno', name: 'Ueno', vibe: ['Culture', 'Park', 'Market'], lines: ['JR Yamanote', 'Ginza', 'Hibiya'] },
    { id: 'odpt.Station:JR-East.Yamanote.Shinagawa', name: 'Shinagawa', vibe: ['Business', 'Hotel', 'Transit'], lines: ['JR Yamanote', 'Keikyu', 'Shinkansen'] },
    { id: 'odpt:Station:JR-East.Akihabara', name: 'Akihabara', vibe: ['Anime', 'Electronics', 'Maid Cafe'], lines: ['JR Yamanote', 'Hibiya', 'Tsukuba Express'] },
    { id: 'odpt.Station:TokyoMetro.Ginza.Ginza', name: 'Ginza', vibe: ['Luxury', 'Dining', 'Theater'], lines: ['Ginza', 'Marunouchi', 'Hibiya'] },
    { id: 'odpt.Station:JR-East.Yamanote.Shimbashi', name: 'Shimbashi', vibe: ['Salaryman', 'Izakaya', 'Retro'], lines: ['JR Yamanote', 'Ginza', 'Asakusa'] },
    { id: 'odpt.Station:TokyoMetro.Hanzomon.Oshiage', name: 'Oshiage (Skytree)', vibe: ['Tourism', 'Shopping', 'View'], lines: ['Hanzomon', 'Asakusa', 'Keisei'] }
];

let cachedCityId: string | null = null;

async function getCityId() {
    if (cachedCityId) return cachedCityId;
    const { data } = await supabase.from('nodes').select('city_id').not('city_id', 'is', null).limit(1).maybeSingle();
    if (data) {
        cachedCityId = data.city_id;
        return data.city_id;
    }
    // Fallback if no city_id found (unlikely for existing DB)
    // We might need to query 'cities' table or hardcode a UUID if we knew one.
    // For now, throw error
    throw new Error('No city_id found in existing nodes. Cannot insert new nodes.');
}

async function seedStation(station: typeof TOP_10_STATIONS[0]) {
    console.log(`\n🌱 Seeding ${station.name} (${station.id})...`);
    
    const cityId = await getCityId();

    // 1. Upsert Node (L1/L4 basic)
    const { error: nodeError } = await supabase
        .from('nodes')
        .upsert({
            id: station.id,
            city_id: cityId,
            name: station.name,
            node_type: 'station',
            coordinates: { type: 'Point', coordinates: [139.7671, 35.6812] }, // Default to Tokyo
            vibe_tags: station.vibe,
            transit_lines: station.lines,
            facility_profile: {
                convenience_count: Math.floor(Math.random() * 10) + 2,
                restaurant_count: Math.floor(Math.random() * 20) + 5,
                cafe_count: Math.floor(Math.random() * 15) + 3,
                locker_count: Math.floor(Math.random() * 50) + 10,
                toilet_count: Math.floor(Math.random() * 10) + 2
            },
            updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

    if (nodeError) console.error(`❌ Node upsert failed: ${nodeError.message}`);
    else console.log('✅ Node upserted');

    // 2. Upsert L2 Dynamic Snapshot
    const { error: l2Error } = await supabase
        .from('transit_dynamic_snapshot')
        .upsert({
            station_id: station.id,
            status_code: 'NORMAL',
            weather_info: {
                temp: 22,
                condition: 'Clear',
                wind: 3
            },
            disruption_data: { disruptions: [] },
            updated_at: new Date().toISOString()
        }, { onConflict: 'station_id' });

    if (l2Error) console.error(`❌ L2 snapshot upsert failed: ${l2Error.message}`);
    else console.log('✅ L2 snapshot upserted');

    // 3. Upsert Stations Static (L3 Services)
    const { error: staticError } = await supabase
        .from('stations_static')
        .upsert({
            id: station.id,
            l3_services: {
                services: [
                    { type: 'locker', available: true, count: 20 },
                    { type: 'toilet', available: true, count: 5 },
                    { type: 'atm', available: true, count: 3 },
                    { type: 'wifi', available: true }
                ]
            },
            updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

    if (staticError) console.error(`❌ Static data upsert failed: ${staticError.message}`);
    else console.log('✅ Static data upserted');

    // 4. Upsert L3 Facilities (Rows)
    // We'll insert a few sample facilities for each type
    const facilities = [
        { type: 'locker', name: 'East Exit Lockers', loc: 'East Exit' },
        { type: 'toilet', name: 'Central Toilet', loc: 'Central Gate' },
        { type: 'elevator', name: 'Platform 1 Elevator', loc: 'Platform 1' }
    ];

    for (const f of facilities) {
        // Check if exists roughly (by station and type and name)
        // Since we don't have a unique constraint on these combo, we might duplicate if we blindly insert.
        // We'll skip for now to avoid massive dupes if run multiple times, 
        // OR we delete all for this station first? No, that deletes real data.
        // We'll just check count.
        const { count } = await supabase
            .from('l3_facilities')
            .select('*', { count: 'exact', head: true })
            .eq('station_id', station.id)
            .eq('type', f.type);

        if (count === 0) {
            await supabase.from('l3_facilities').insert({
                station_id: station.id,
                type: f.type,
                name_i18n: { en: f.name, ja: f.name }, // Simple mock
                location_coords: { en: f.loc, ja: f.loc },
                attributes: { mock: true }
            });
            console.log(`   + Added ${f.type}`);
        }
    }
    console.log('✅ L3 facilities checked/seeded');
}

async function run() {
    console.log('=== Seeding Top 10 Stations Data ===');
    for (const station of TOP_10_STATIONS) {
        await seedStation(station);
    }
}

run().catch(console.error);
