/**
 * ODPT StationFacility API Batch Fetcher
 * 
 * Fetches L3 facility data directly from ODPT API for all stations missing L3 data.
 * Outputs a SQL migration file for insertion into l3_facilities table.
 * 
 * Run: npx ts-node --project tsconfig.test.json scripts/fetch_odpt_facilities.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const ODPT_API_KEY = process.env.ODPT_API_KEY || process.env.ODPT_API_TOKEN || process.env.ODPT_API_TOKEN_BACKUP;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// API endpoints by operator
const ODPT_ENDPOINTS: Record<string, string> = {
    'TokyoMetro': 'https://api.odpt.org/api/v4',
    'Toei': 'https://api-public.odpt.org/api/v4',
    'JR-East': 'https://api-challenge.odpt.org/api/v4',
    'default': 'https://api.odpt.org/api/v4'
};

interface ODPTFacility {
    'odpt:barrierfreeFacilityType': string;
    'odpt:placeName'?: string;
    'odpt:remark'?: string;
    'odpt:serviceStartStationFloor'?: string;
    'odpt:serviceEndStationFloor'?: string;
    'odpt:hasWheelchairAccessibleRestroom'?: boolean;
}

async function fetchFacilitiesFromODPT(stationId: string): Promise<ODPTFacility[]> {
    // Convert logical ID to physical ID format for ODPT API
    // odpt:Station:TokyoMetro.Ueno -> odpt.Station:TokyoMetro.Ginza.Ueno (need line info)
    // Actually ODPT API accepts both formats, let's try both

    const operator = stationId.split(':')[2]?.split('.')[0] || 'default';
    const baseUrl = ODPT_ENDPOINTS[operator] || ODPT_ENDPOINTS['default'];

    // Try physical format first (odpt.Station:...)
    const physicalId = stationId.replace('odpt:', 'odpt.');

    try {
        const url = `${baseUrl}/odpt:StationFacility?odpt:station=${encodeURIComponent(physicalId)}&acl:consumerKey=${ODPT_API_KEY}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });

        if (!res.ok) {
            // console.warn(`ODPT API returned ${res.status} for ${stationId}`);
            return [];
        }

        const data = await res.json();
        if (data && data.length > 0 && data[0]['odpt:barrierfreeFacility']) {
            return data[0]['odpt:barrierfreeFacility'];
        }
        return [];
    } catch (e: any) {
        // console.warn(`Failed to fetch ${stationId}:`, e.message);
        return [];
    }
}

function facilityToSql(stationId: string, facility: ODPTFacility): string {
    const type = facility['odpt:barrierfreeFacilityType']?.replace('odpt.BarrierfreeFacilityType.', '').toLowerCase() || 'unknown';
    const location = facility['odpt:placeName'] || facility['odpt:remark'] || '駅構内';

    const name = {
        ja: type.charAt(0).toUpperCase() + type.slice(1),
        en: type.charAt(0).toUpperCase() + type.slice(1)
    };

    const attributes = {
        floor_from: facility['odpt:serviceStartStationFloor'],
        floor_to: facility['odpt:serviceEndStationFloor'],
        wheelchair_accessible: facility['odpt:hasWheelchairAccessibleRestroom'] || type.includes('elevator'),
        location_text: { ja: location, en: location },
        source: 'ODPT_API',
        remark: facility['odpt:remark']
    };

    const nameJson = JSON.stringify(name).replace(/'/g, "''");
    const attrJson = JSON.stringify(attributes).replace(/'/g, "''");

    return `INSERT INTO l3_facilities (station_id, type, name_i18n, attributes) VALUES ('${stationId}', '${type}', '${nameJson}'::jsonb, '${attrJson}'::jsonb);`;
}

async function main() {
    console.log('🚀 ODPT StationFacility Batch Fetcher\n');

    if (!ODPT_API_KEY) {
        console.error('❌ ODPT_API_KEY not configured!');
        process.exit(1);
    }

    // 1. Get all stations missing L3 data
    const { data: allNodes } = await supabase.from('nodes').select('id').eq('is_active', true);
    const { data: hasL3 } = await supabase.from('l3_facilities').select('station_id');

    const hasL3Set = new Set((hasL3 || []).map(r => r.station_id));
    const missingL3 = (allNodes || []).filter(n => !hasL3Set.has(n.id));

    console.log(`Found ${missingL3.length} stations without L3 data.`);
    console.log(`Attempting ODPT StationFacility API fetch...\n`);

    // 2. Fetch from ODPT API
    let sqlOutput = `-- ODPT StationFacility Batch Import (Generated ${new Date().toISOString()})\n\n`;
    let successCount = 0;
    let failCount = 0;
    let facilitiesCount = 0;

    // Process in batches to avoid rate limiting
    const batchSize = 10;
    for (let i = 0; i < missingL3.length; i += batchSize) {
        const batch = missingL3.slice(i, i + batchSize);
        const promises = batch.map(async (node) => {
            const facilities = await fetchFacilitiesFromODPT(node.id);
            return { stationId: node.id, facilities };
        });

        const results = await Promise.all(promises);

        for (const { stationId, facilities } of results) {
            if (facilities.length > 0) {
                sqlOutput += `-- Station: ${stationId}\n`;
                for (const f of facilities) {
                    sqlOutput += facilityToSql(stationId, f) + '\n';
                    facilitiesCount++;
                }
                successCount++;
            } else {
                failCount++;
            }
        }

        // Progress
        process.stdout.write(`\rProcessed ${Math.min(i + batchSize, missingL3.length)}/${missingL3.length}...`);

        // Small delay between batches to be nice to API
        await new Promise(r => setTimeout(r, 200));
    }

    console.log('\n');

    // 3. Save SQL file
    const outPath = path.join(process.cwd(), 'supabase/migrations/20260110_odpt_facilities_import.sql');
    fs.writeFileSync(outPath, sqlOutput);

    console.log('📊 Summary:');
    console.log(`   - Stations with ODPT data: ${successCount}`);
    console.log(`   - Stations without ODPT data: ${failCount}`);
    console.log(`   - Total facilities fetched: ${facilitiesCount}`);
    console.log(`\n📄 SQL saved to: ${outPath}`);
}

main().catch(console.error);
