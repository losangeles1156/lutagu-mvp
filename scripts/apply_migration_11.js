
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = "postgresql://postgres.evubeqeaafdjnuocyhmb:K521128lalK@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres";

async function applyMigration() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        const migrationFile = path.join(__dirname, '../supabase/migrations/11_create_hybrid_architecture.sql');
        const sql = fs.readFileSync(migrationFile, 'utf8');

        console.log('Applying migration: 11_create_hybrid_architecture.sql');
        await client.query(sql);
        console.log('✅ Migration applied successfully.');

        // Verify tables
        const res = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name IN ('stations_static', 'transit_dynamic_snapshot')
        `);
        console.log('Created Tables:', res.rows.map(r => r.table_name).join(', '));

    } catch (err) {
        console.error('❌ Migration Error:', err.message);
    } finally {
        await client.end();
    }
}

applyMigration();
