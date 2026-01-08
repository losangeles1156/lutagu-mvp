
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!
);

const DATA_URL = "https://raw.githubusercontent.com/nagix/mini-tokyo-3d/master/data/stations.json";

interface NagixStation {
    id: string; // "TokyoMetro.Ginza.Ginza"
    railway: string; // "TokyoMetro.Ginza"
    coord: [number, number]; // [lon, lat]
    title: {
        en: string;
        ja: string;
    };
    altitude?: number;
}

async function main() {
    console.log('--- Ingesting Subway Data from Nagix ---');

    console.log(`Fetching from ${DATA_URL}...`);
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);

    const json = await res.json();
    const stations = Object.values(json) as NagixStation[];
    console.log(`Found ${stations.length} entries.`);

    const toInsert: any[] = [];

    for (const s of stations) {
        if (!s.railway || !s.coord) continue;

        // Filter for Metro & Toei
        const isMetro = s.railway.includes('TokyoMetro');
        const isToei = s.railway.includes('Toei');

        if (!isMetro && !isToei) continue;

        // Construct ODPT ID
        // Nagix: "TokyoMetro.Ginza.Ginza"
        // ODPT: "odpt.Station:TokyoMetro.Ginza.Ginza"
        const odptId = `odpt.Station:${s.id}`;

        // Coordinates
        const [lon, lat] = s.coord;

        // Name
        const nameEn = s.title.en;
        const nameJa = s.title.ja;

        // Railway
        const odptRailway = `odpt.Railway:${s.railway}`;

        toInsert.push({
            id: odptId,
            city_id: 'tokyo_core',
            name: { en: nameEn, ja: nameJa },
            coordinates: `POINT(${lon} ${lat})`,
            node_type: 'station',
            is_active: true, // Will be filtered by ward later
            transit_lines: [odptRailway],
            facility_profile: {
                operator: isMetro ? 'TokyoMetro' : 'Toei',
                odpt_operator: isMetro ? 'odpt.Operator:TokyoMetro' : 'odpt.Operator:Toei'
            }
        });
    }

    console.log(`Prepared ${toInsert.length} subway stations for upsert.`);

    // Upsert in batches
    const BATCH_SIZE = 100;
    for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
        const chunk = toInsert.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from('nodes').upsert(chunk, { onConflict: 'id' });
        if (error) console.error(`Error upserting chunk ${i}:`, error.message);
    }

    console.log('✅ Success! Nodes restored.');
}

main();
