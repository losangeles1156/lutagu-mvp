import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { STATION_WISDOM } from '../src/data/stationWisdom';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
    console.error('Missing Service Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateWisdomSmart() {
    console.log('🚀 Starting Smart StationWisdom L3 Migration...');

    // 1. Fetch all existing nodes to build a lookup map
    const { data: nodes, error } = await supabase
        .from('nodes')
        .select('id');

    if (error || !nodes) {
        console.error('❌ Failed to fetch nodes:', error);
        return;
    }

    console.log(`📡 Loaded ${nodes.length} nodes from DB.`);

    // Build a map of "Station Name" -> "List of Node IDs"
    // Wisdom Key format: "odpt:Station:<Operator>.<StationName>" (mostly)
    // DB ID format: "odpt.Station:<Operator>.<Line>.<StationName>"

    // We want to map Wisdom Key to a Valid DB ID.
    // Heuristic:
    // 1. Exact match (rare due to format diff)
    // 2. Format adjustment: Replace ':' with '.' and check.
    // 3. Suffix match: if Wisdom Key is "odpt:Station:TokyoMetro.Ueno",
    //    we look for DB IDs that START with "odpt.Station:TokyoMetro." AND END with ".Ueno".

    const wisdomKeys = Object.keys(STATION_WISDOM);
    let totalInserted = 0;

    for (const wKey of wisdomKeys) {
        const data = STATION_WISDOM[wKey];
        if (!data.l3Facilities || data.l3Facilities.length === 0) continue;

        // Find matching Node ID
        let targetNodeId = null;

        // Strategy A: Direct cleanup
        // wKey: odpt:Station:TokyoMetro.Ginza -> odpt.Station:TokyoMetro.Ginza (Not valid in DB usually because of Line)

        // Strategy B: Parse Operator and Station Name from Wisdom Key
        // keys usually look like: "odpt:Station:TokyoMetro.Ueno"
        // parts: ["odpt", "Station", "Operator", "StationName"]?
        // Actually split by ":" then "."?

        // Let's parse loosely.
        const cleanWKey = wKey.replace('odpt:Station:', ''); // "TokyoMetro.Ueno"
        const [operator, ...nameParts] = cleanWKey.split('.');
        const stationName = nameParts.join('.'); // "Ueno"

        // Search in fetched nodes
        // We look for node.id containing `:${operator}.` and ending with `.${stationName}`
        // DB ID: "odpt.Station:TokyoMetro.Ginza.Ueno"
        // Operator: TokyoMetro, Line: Ginza, Name: Ueno.

        // Regex for this wKey:
        // operator = "TokyoMetro", name = "Ueno"
        // Look for "odpt\.Station:TokyoMetro\..*\.Ueno$"

        const matchedNode = nodes.find(n => {
            // Check operator match
            if (!n.id.includes(`:${operator}.`)) return false;
            // Check name match (end of string)
            if (!n.id.endsWith(`.${stationName}`)) return false;
            return true;
        });

        if (matchedNode) {
            targetNodeId = matchedNode.id;
            console.log(`✅ Matched ${wKey} -> ${targetNodeId}`);
        } else {
            console.warn(`⚠️  No matching node found in DB for ${wKey} (Operator: ${operator}, Name: ${stationName})`);

            // Fallback for tricky ones?
            // "odpt:Station:TokyoMetro.Ginza" -> might match "odpt.Station:TokyoMetro.Ginza.Ginza"
            // The logic above: operator="TokyoMetro", name="Ginza".
            // node "odpt.Station:TokyoMetro.Ginza.Ginza" ends with ".Ginza". It should match!

            // What about "odpt:Station:JR-East.Tokyo"?
            // DB: "odpt.Station:JR-East.Chuo.Tokyo"?
            // operator="JR-East", name="Tokyo". Match!

            continue;
        }

        // Prepare records
        const records = data.l3Facilities.map(f => {
            let name_i18n = {};
            if (typeof f.location === 'string') {
                name_i18n = { en: f.location, ja: f.location };
            } else {
                name_i18n = f.location;
            }

            const attributes = {
                operator: f.operator,
                floor: f.floor,
                ...f.attributes
            };

            return {
                station_id: targetNodeId,
                type: f.type,
                name_i18n: name_i18n,
                attributes: attributes,
                source_url: f.source || 'StationWisdom_Static_v1',
                updated_at: new Date().toISOString()
            };
        });

        const { error: insertError } = await supabase
            .from('l3_facilities')
            .upsert(records, { onConflict: 'id', ignoreDuplicates: false });

        if (insertError) {
            console.error(`❌ Error inserting for ${wKey}:`, insertError.message);
        } else {
            totalInserted += records.length;
        }
    }

    console.log('------------------------------------------------');
    console.log(`📊 Migration Complete. Total Facilities Inserted: ${totalInserted}`);
}

migrateWisdomSmart();
