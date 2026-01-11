
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const INPUT_FILE = path.join(__dirname, 'output', 'l1_pipeline_result.json');

async function main() {
    console.log('🚀 Starting L1 Data Import to Supabase...');

    if (!fs.existsSync(INPUT_FILE)) {
        console.error(`❌ Input file not found: ${INPUT_FILE}`);
        process.exit(1);
    }

    const rawData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
    console.log(`📦 Loaded ${rawData.length} stations from JSON.`);

    let totalInserted = 0;
    let totalErrors = 0;

    for (const station of rawData) {
        const clusterId = station.clusterId;
        const nameJa = typeof station.name === 'string' ? station.name : station.name.ja;
        const nameEn = typeof station.name === 'string' ? station.name : station.name.en;

        console.log(`\n📍 Processing Cluster: ${nameEn} (${clusterId})`);

        // 1. Find the Node ID in Supabase
        // Ideally, clusterId matches id. If not, fallback to name match.
        let nodeId: string | null = null;

        // Try exact ID match first
        let { data: nodes, error } = await supabase
            .from('nodes')
            .select('id')
            .eq('id', clusterId);

        if (nodes && nodes.length > 0) {
            nodeId = nodes[0].id;
        } else {
            // Try fuzzy ID match (since clusterId might be 'odpt.Station:Line.Station' but DB has 'odpt:Station:Operator.Line.Station' or similar variations)
            // Actually, db format is usually `odpt:Station:Operator.Station` or `odpt:Station:Operator.Line.Station`.
            // Let's try matching by name (safest for major hubs)
            const { data: byName } = await supabase
                .from('nodes')
                .select('id')
                .or(`name->>en.eq.${nameEn},name->>ja.eq.${nameJa}`)
                .limit(1);

            if (byName && byName.length > 0) {
                nodeId = byName[0].id;
                console.log(`   🔗 Linked to Node by Name: ${nodeId}`);
            }
        }

        if (!nodeId) {
            console.warn(`   ⚠️ Could not find Node for ${nameEn}. Skipping POI import.`);
            continue;
        } else {
            if (!nodes || nodes.length === 0) console.log(`   🔗 Linked to Node by ID: ${nodeId}`);
        }

        // 3. Prepare Deduplicated POIs
        const pois = station.poiSample;
        if (!pois || pois.length === 0) {
            console.log(`   ℹ️ No POIs in JSON.`);
            continue;
        }

        // Deduplicate by OSM ID (keep first occurrence)
        const uniquePOIs = new Map();
        for (const p of pois) {
            if (!uniquePOIs.has(p.osm_id)) {
                uniquePOIs.set(p.osm_id, p);
            }
        }

        const inserts = Array.from(uniquePOIs.values()).map((p: any) => ({
            station_id: nodeId,
            osm_id: p.osm_id,
            name: p.name,
            category: p.category,
            location: `POINT(${p.location.lng} ${p.location.lat})`,
            tags: p.tags,
            // We leave tags_core/intent/visual empty for now, relying on migrate_tags.ts to populate them later
        }));

        // 4. Upsert
        // We use upsert on (station_id, osm_id) constraint if it exists.
        // The migration 001_create_l1_places.sql defines "unique(station_id, osm_id)".
        const { error: upsertError } = await supabase
            .from('l1_places')
            .upsert(inserts, { onConflict: 'station_id, osm_id' });

        if (upsertError) {
            console.error(`   ❌ DB Upsert Error:`, upsertError);
            totalErrors += inserts.length;
        } else {
            console.log(`   ✅ Upserted ${inserts.length} POIs.`);
            totalInserted += inserts.length;
        }
    }

    console.log(`\n🎉 Import Complete! Inserted: ${totalInserted}, Failed: ${totalErrors}`);
}

main().catch(console.error);
