
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// --- Configuration ---
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!;
const ODPT_API_KEY = process.env.ODPT_API_TOKEN || process.env.ODPT_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
}

if (!ODPT_API_KEY) {
    console.warn('⚠️ Missing ODPT_API_KEY. Tokyo Metro API calls will fail.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const OPERATORS = {
    TOEI: 'odpt.Operator:Toei',
    METRO: 'odpt.Operator:TokyoMetro'
};

const API_BASE = 'https://api.odpt.org/api/v4';

async function fetchFaresForStation(stationId: string, operator: string) {
    // Determine endpoint based on operator (Toei is technically on api-public, but api.odpt.org usually proxies or works with key too.
    // Toei public endpoint: https://api-public.odpt.org/api/v4/odpt:RailwayFare
    // Metro endpoint: https://api.odpt.org/api/v4/odpt:RailwayFare

    let url = '';
    if (operator === OPERATORS.TOEI) {
        url = `https://api-public.odpt.org/api/v4/odpt:RailwayFare?odpt:operator=${operator}&odpt:fromStation=${stationId}`;
    } else {
        if (!ODPT_API_KEY) return [];
        url = `${API_BASE}/odpt:RailwayFare?odpt:operator=${operator}&odpt:fromStation=${stationId}&acl:consumerKey=${ODPT_API_KEY}`;
    }

    try {
        const res = await fetch(url);
        if (!res.ok) {
            console.error(`Error fetching fares for ${stationId}: ${res.status} ${res.statusText}`);
            return [];
        }
        const data = await res.json();
        return data;
    } catch (e) {
        console.error(`Exception fetching fares for ${stationId}:`, e);
        return [];
    }
}

async function main() {
    console.log('=== Fare Data Ingestion ===');

    // 1. Get all stations from DB
    const { data: stations, error } = await supabase
        .from('stations_static')
        .select('id')
        .order('id');

    if (error) {
        console.error('Failed to fetch stations:', error);
        return;
    }

    console.log(`Found ${stations?.length} stations. Starting ingestion...`);

    let totalUpserted = 0;

    // 2. Iterate and fetch
    // We can do this in chunks to be faster, but let's be polite to the API.
    // ODPT rate limits are generous but let's do 5 concurrent requests.

    const CHUNK_SIZE = 5;
    for (let i = 0; i < stations.length; i += CHUNK_SIZE) {
        const chunk = stations.slice(i, i + CHUNK_SIZE);
        const promises = chunk.map(async (station) => {
            const id = station.id;
            let operator = '';

            if (id.includes('Toei')) operator = OPERATORS.TOEI;
            else if (id.includes('TokyoMetro')) operator = OPERATORS.METRO;
            else return; // Skip non-Toei/Metro stations for now (e.g. if we have others)

            const fares = await fetchFaresForStation(id, operator);

            if (fares.length === 0) return;

            // Transform to DB schema
            const rows = fares.map((f: any) => ({
                operator: f['odpt:operator'],
                from_station_id: f['odpt:fromStation'],
                to_station_id: f['odpt:toStation'],
                ticket_fare: f['odpt:ticketFare'],
                ic_card_fare: f['odpt:icCardFare'],
                child_ticket_fare: f['odpt:childTicketFare'],
                child_ic_card_fare: f['odpt:childIcCardFare'],
                updated_at: new Date().toISOString()
            }));

            // Upsert
            const { error: upsertError } = await supabase
                .from('fares')
                .upsert(rows, { onConflict: 'operator,from_station_id,to_station_id' });

            if (upsertError) {
                console.error(`❌ Failed upsert for ${id}:`, upsertError.message);
            } else {
                // console.log(`✅ ${id}: ${rows.length} fares`);
                totalUpserted += rows.length;
            }
        });

        await Promise.all(promises);
        process.stdout.write(`\rProcessed ${Math.min(i + CHUNK_SIZE, stations.length)}/${stations.length} stations... (Total fares: ${totalUpserted})`);

        // Small delay
        await new Promise(r => setTimeout(r, 200));
    }

    console.log(`\n=== Ingestion Complete. Total fares: ${totalUpserted} ===`);
}

main().catch(console.error);
