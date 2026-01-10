// scripts/debug_l1_name_i18n.ts
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

        // 1. Check L1 name_i18n for Ueno (using the correct ODPT station_id)
        console.log('\n=== L1 name_i18n for Ueno Station ===');
        const l1Result = await client.query(`
            SELECT name, name_i18n, subcategory, category
            FROM l1_places 
            WHERE station_id = 'odpt.Station:TokyoMetro.Ginza.Ueno' 
            LIMIT 10;
        `);
        console.log('L1 Rows Found:', l1Result.rowCount);
        l1Result.rows.forEach((row, i) => {
            console.log(`  [${i + 1}] name: "${row.name}"`);
            console.log(`      name_i18n: ${JSON.stringify(row.name_i18n)}`);
            console.log(`      category: ${row.category}, subcategory: ${row.subcategory}`);
        });

        // 2. Check if ANY L3 data exists
        console.log('\n=== L3 Table (stations_static) Total Rows ===');
        const l3TotalResult = await client.query(`
            SELECT COUNT(*), array_agg(DISTINCT station_id) as station_ids 
            FROM stations_static;
        `);
        console.log('Total rows:', l3TotalResult.rows[0].count);
        console.log('Station IDs:', l3TotalResult.rows[0].station_ids?.slice(0, 10));

    } catch (error: any) {
        console.error('Error:', error.message);
    } finally {
        await client.end();
    }
}

debug();
