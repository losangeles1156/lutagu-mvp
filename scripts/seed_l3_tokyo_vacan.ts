
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // Use Service Key for writing

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedTokyoStationL3() {
    const stationId = 'odpt.Station:JR-East.Yamanote.Tokyo';
    console.log(`Seeding L3 data for ${stationId}...`);

    // 1. Check if station exists in nodes (it should)
    const { data: node, error: nodeError } = await supabase
        .from('nodes')
        .select('id')
        .eq('id', stationId)
        .single();

    if (nodeError || !node) {
        console.error('Tokyo Station node not found! Please ingest basic node data first.');
        // Attempting to look for 'Tokyo' in general if specific ID fails?
        // For now, let's assume the ID is correct or matches what's in the DB.
        // If exact match fails, let's try to find "Tokyo" name to get the ID.
        const { data: searchNodes } = await supabase
            .from('nodes')
            .select('id, name')
            .ilike('name->>en', 'Tokyo')
            .limit(1);

        if (searchNodes && searchNodes.length > 0) {
            console.log(`Found alternative ID: ${searchNodes[0].id}`);
            // Use this ID instead
            // But for this strict test, let's stick to strict ID or fail.
        }
        process.exit(1);
    }

    // 2. Insert/Update L3 Facilities
    const facilities = [
        {
            station_id: stationId,
            type: 'toilet',
            name_i18n: { en: 'Marunouchi North Exit Toilet', ja: '丸の内北口トイレ', zh: '丸之內北口洗手間' },
            attributes: {
                location_description: { en: 'Near Ticket Gate', ja: '改札口近く', zh: '剪票口附近' },
                wheelchair: true,
                ostomate: true,
                baby_chair: true
            }
        },
        {
            station_id: stationId,
            type: 'toilet',
            name_i18n: { en: 'Yaesu Central Exit Toilet', ja: '八重洲中央口トイレ', zh: '八重洲中央口洗手間' },
            attributes: {
                location_description: { en: 'Basement 1F', ja: '地下1階', zh: '地下1樓' },
                wheelchair: false
            }
        },
        {
            station_id: stationId,
            type: 'coin_locker',
            name_i18n: { en: 'Gransta Lockers', ja: 'グランスタ ロッカー', zh: 'Gransta 置物櫃' },
            attributes: {
                location_description: { en: 'Inside Gransta area', ja: 'グランスタ内', zh: 'Gransta 區域內' },
                large_size: true,
                suica: true
            }
        }
    ];

    // First, delete existing relevant test data to avoid duplicates for this run
    // (Optional: depending on how we want to manage data, but for seeding test data, clean slate is often good)
    // But we don't want to wipe REAL data.
    // For MVP, likely we don't have real scraper data for Tokyo yet OR we just append.
    // Let's just insert (or upsert if we had IDs). Since we don't fix IDs here, we might duplicate.
    // Let's try to delete by name to be safe-ish.

    for (const fac of facilities) {
        await supabase.from('l3_facilities').delete().match({
            station_id: stationId,
            type: fac.type,
        }).filter('name_i18n->>en', 'eq', fac.name_i18n.en);

        const { error } = await supabase.from('l3_facilities').insert(fac);
        if (error) console.error('Error inserting:', error);
        else console.log(`Inserted: ${fac.name_i18n.en}`);
    }

    console.log('Done!');
}

seedTokyoStationL3();
