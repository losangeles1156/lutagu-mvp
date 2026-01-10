
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const connectionString = "postgresql://postgres.evubeqeaafdjnuocyhmb:K521128lalK@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres";

async function applyMigration() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        const migrationFile = path.join(__dirname, '../supabase/migrations/20251230_update_stations_static_schema.sql');
        const sql = fs.readFileSync(migrationFile, 'utf8');

        console.log('Applying migration: 20251230_update_stations_static_schema.sql');
        await client.query(sql);
        console.log('✅ Migration applied successfully.');

    } catch (err) {
        console.error('❌ Migration Error:', err.message);
    } finally {
        await client.end();
    }
}

applyMigration();
