// scripts/debug_l1_l3_v2.ts
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

        // 1. Check total L1 places count
        console.log('\n=== L1 Places Overall Stats ===');
        const l1StatsResult = await client.query(`
            SELECT station_id, COUNT(*) as count 
            FROM l1_places 
            GROUP BY station_id 
            ORDER BY count DESC 
            LIMIT 10;
        `);
        console.log('Top 10 stations with L1 data:');
        l1StatsResult.rows.forEach((row, i) => {
            console.log(`  [${i + 1}] ${row.station_id}: ${row.count} POIs`);
        });

        // 2. Check L3 table schema
        console.log('\n=== L3 Table (stations_static) Schema ===');
        const l3SchemaResult = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'stations_static';
        `);
        l3SchemaResult.rows.forEach((row) => {
            console.log(`  ${row.column_name}: ${row.data_type}`);
        });

        // 3. Check L3 data for Ueno
        console.log('\n=== L3 Data for Ueno ===');
        const l3DataResult = await client.query(`
            SELECT * FROM stations_static WHERE station_id = 'ueno';
        `);
        console.log('L3 Rows Found:', l3DataResult.rowCount);
        if (l3DataResult.rowCount > 0) {
            console.log('  First Row:', JSON.stringify(l3DataResult.rows[0]).substring(0, 500));
        }

        // 4. Check if Ueno exists in nodes table
        console.log('\n=== Ueno Node ===');
        const nodeResult = await client.query(`
            SELECT id, name, station_id, lines FROM nodes WHERE station_id = 'ueno';
        `);
        console.log('Node Rows Found:', nodeResult.rowCount);
        nodeResult.rows.forEach((row) => {
            console.log(`  id: ${row.id}, name: ${row.name}, station_id: ${row.station_id}`);
        });

    } catch (error: any) {
        console.error('Error:', error.message);
    } finally {
        await client.end();
    }
}

debug();
