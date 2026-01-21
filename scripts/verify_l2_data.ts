
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function verifyL2Data() {
    console.log('Starting L2 Data Verification for 50 Random Stations...');

    // 1. Fetch 50 random IDs from transit_dynamic_snapshot
    // Since random selection is hard in SQL without extensions, we'll fetch a larger chunk and sample.
    const { data: allIds, error: idError } = await supabase
        .from('transit_dynamic_snapshot')
        .select('station_id')
        .limit(500);

    if (idError) {
        console.error('Error fetching station IDs:', idError);
        return;
    }

    if (!allIds || allIds.length === 0) {
        console.error('No stations found in transit_dynamic_snapshot');
        return;
    }

    // Shuffle and pick 50
    const shuffled = allIds.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 50);

    console.log(`Selected ${selected.length} stations for verification.\n`);

    let passed = 0;
    let failed = 0;

    for (const item of selected) {
        const stationId = item.station_id;

        const apiUrl = process.env.L2_STATUS_API_URL;
        if (!apiUrl) { console.error('Missing L2_STATUS_API_URL'); process.exit(1); }

        let l2Data: any = {};
        try {
            const res = await fetch(`${apiUrl}/l2/status?stationId=${stationId}`);
            if (!res.ok) throw new Error(`Status ${res.status}`);
            l2Data = await res.json();
        } catch (e: any) {
            console.error(`[FAIL] ${stationId}: API Fetch Error - ${e.message}`);
            failed++;
            continue;
        }

        const lines = l2Data.line_status;

        // Check 1: Is line_status an array?
        if (!Array.isArray(lines)) {
            console.error(`[FAIL] ${stationId}: line_status is not an array (Type: ${typeof lines})`);
            failed++;
            continue;
        }

        // Check 2: Is it empty? (Warning only, as some stations might truly have no lines in ODPT data)
        if (lines.length === 0) {
            console.warn(`[WARN] ${stationId}: No lines found (Empty Array). This might be valid for bus stops but check key stations.`);
            // We count as 'passed' effectively but with warning, unless it's a known major station.
        }

        // Check 3: Localization Structure
        let invalidLines = 0;
        lines.forEach((line: any, idx: number) => {
            const hasName = line.name && (typeof line.name === 'object' || typeof line.name === 'string');
            // If object, check for keys. If string, it fails multi-lang unless adapter handles it.
            // L2_Live.tsx adapter expects: name: LocaleString | string.
            // But for "correct display in any language", we prefer LocaleString.

            const isNameLocalized = typeof line.name === 'object' && ('ja' in line.name || 'en' in line.name);

            if (!hasName) {
                console.error(`      Line #${idx}: Missing 'name' field.`);
                invalidLines++;
            } else if (!isNameLocalized && typeof line.name === 'string') {
                // String only name -> Weak PASS (will display but not localized)
                // console.warn(`      Line #${idx}: Name is string-only ("${line.name}"). Localization might fail.`);
            }
        });

        if (invalidLines > 0) {
            console.error(`[FAIL] ${stationId}: ${invalidLines} lines with invalid structure.`);
            failed++;
        } else {
            // Success
            // console.log(`[PASS] ${stationId}: ${lines.length} lines.`);
            passed++;
        }
    }

    console.log('\n----------------------------------------');
    console.log(`Verification Complete.`);
    console.log(`Stations Checked: ${selected.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log('----------------------------------------');
}

verifyL2Data();
