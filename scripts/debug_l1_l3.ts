// scripts/debug_l1_l3.ts
import { Client } from 'pg';

const connectionString = "postgresql://postgres.evubeqeaafdjnuocyhmb:K521128lalK@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres";

async function debug() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        // 1. Check L1 Places for Ueno
        console.log('\n=== L1 Places for Ueno ===');
        const l1Result = await client.query(`
            SELECT id, name, name_i18n, subcategory 
            FROM l1_places 
            WHERE station_id = 'ueno' 
            LIMIT 5;
        `);
        console.log('L1 Rows Found:', l1Result.rowCount);
        l1Result.rows.forEach((row, i) => {
            console.log(`  [${i + 1}] name: ${row.name}`);
            console.log(`      name_i18n: ${JSON.stringify(row.name_i18n)}`);
            console.log(`      subcategory: ${row.subcategory}`);
        });

        // 2. Check L3 Facilities for Ueno
        console.log('\n=== L3 Facilities (stations_static) for Ueno ===');
        const l3Result = await client.query(`
            SELECT station_id, operator, jsonb_pretty(facilities) as facilities_json
            FROM stations_static 
            WHERE station_id = 'ueno';
        `);
        console.log('L3 Rows Found:', l3Result.rowCount);
        l3Result.rows.forEach((row, i) => {
            console.log(`  [${i + 1}] station_id: ${row.station_id}, operator: ${row.operator}`);
            console.log(`      facilities: ${row.facilities_json?.substring(0, 500)}...`);
        });

    } catch (error: any) {
        console.error('Error:', error.message);
    } finally {
        await client.end();
    }
}

debug();
