// scripts/debug_nodes_table.ts
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

        // 1. Check nodes table schema
        console.log('\n=== Nodes Table Schema ===');
        const schemaResult = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'nodes';
        `);
        schemaResult.rows.forEach((row) => {
            console.log(`  ${row.column_name}: ${row.data_type}`);
        });

        // 2. Check Ueno node
        console.log('\n=== Ueno Node Data ===');
        const nodeResult = await client.query(`
            SELECT * FROM nodes WHERE id ILIKE '%ueno%' LIMIT 3;
        `);
        console.log('Nodes Found:', nodeResult.rowCount);
        nodeResult.rows.forEach((row) => {
            console.log(`  Row:`, JSON.stringify(row).substring(0, 300));
        });

        // 3. Check what station_id is actually used in L1
        console.log('\n=== L1 station_id samples for Ueno ===');
        const l1StationResult = await client.query(`
            SELECT DISTINCT station_id FROM l1_places WHERE station_id ILIKE '%ueno%';
        `);
        l1StationResult.rows.forEach((row) => {
            console.log(`  ${row.station_id}`);
        });

    } catch (error: any) {
        console.error('Error:', error.message);
    } finally {
        await client.end();
    }
}

debug();
