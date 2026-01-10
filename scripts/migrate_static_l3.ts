
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { normalizeToLogicalId } from '../src/lib/nodes/nodeIdNormalizer';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function migrate_l3_data() {
    console.log('🚀 Starting L3 Data Migration (Generating SQL)...');

    // 1. Fetch source data
    const { data: rows, error } = await supabase
        .from('stations_static')
        .select('id, l3_services')
        .not('l3_services', 'is', null);

    if (error || !rows) {
        console.error('Failed to fetch stations_static:', error);
        process.exit(1);
    }

    console.log(`Found ${rows.length} rows with l3_services.`);

    let sqlOutput = `-- L3 Data Expansion Migration (Generated at ${new Date().toISOString()})\n\n`;
    let generatedCount = 0;
    let skippedCount = 0;

    for (const row of rows) {
        const rawServices = row.l3_services;
        const physicalId = row.id;
        const logicalId = normalizeToLogicalId(physicalId);

        // Determine if service data is valid array
        let servicesList: any[] = [];
        let skippedReason = '';

        if (Array.isArray(rawServices)) {
            servicesList = rawServices;
        } else if (rawServices && Array.isArray(rawServices.services)) {
            servicesList = rawServices.services;
        } else {
            // Debug log for unstructured data
            if (rawServices && rawServices.info) {
                skippedReason = `Info placeholder: ${rawServices.info}`;
            } else {
                skippedReason = `Unrecognized format: ${JSON.stringify(rawServices).substring(0, 50)}...`;
            }
        }

        if (servicesList.length === 0) {
            skippedCount++;
            if (skippedCount <= 5) {
                console.log(`Skipping ${physicalId}: ${skippedReason}`);
            }
            continue;
        }

        // Generate SQL
        sqlOutput += `-- Station: ${logicalId} (from ${physicalId})\n`;

        for (const item of servicesList) {
            let name = item.type;
            if (item.operator) name = `${item.operator} ${name}`;
            name = name.charAt(0).toUpperCase() + name.slice(1);
            const nameJson = JSON.stringify({ ja: name, en: name });

            const locationObj = {
                ja: item.location || '駅構内',
                en: item.location ? item.location : 'Inside Station'
            };

            const attributes = {
                ...item.attributes,
                location_text: locationObj,
                floor: item.floor,
                operator: item.operator,
                source: item.source,
                is_available: item.available !== false
            };
            const attrJson = JSON.stringify(attributes);

            // Escape single quotes for SQL
            const safeType = (item.type || '').replace(/'/g, "''");
            // JSON string can contain single quotes, need to escape them for SQL string literal
            const safeNameJson = nameJson.replace(/'/g, "''");
            const safeAttrJson = attrJson.replace(/'/g, "''");

            sqlOutput += `INSERT INTO l3_facilities (station_id, type, name_i18n, attributes) VALUES ('${logicalId}', '${safeType}', '${safeNameJson}'::jsonb, '${safeAttrJson}'::jsonb);\n`;
            generatedCount++;
        }
    }

    const outPath = path.join(process.cwd(), 'supabase/migrations/20260110_expand_l3_data.sql');
    fs.writeFileSync(outPath, sqlOutput);
    console.log(`\nMigration Generation Complete.`);
    console.log(`Found Source Rows: ${rows.length}`);
    console.log(`Generated Inserts: ${generatedCount} items`);
    console.log(`File saved to: ${outPath}`);
    console.log(`Skipped Rows: ${skippedCount}`);
}

migrate_l3_data().catch(console.error);
