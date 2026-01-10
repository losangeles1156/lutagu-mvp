
const { Client } = require('pg');

// Reusing connection string from manual_migrate.js
const connectionString = "postgresql://postgres.evubeqeaafdjnuocyhmb:K521128lalK@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres";

async function applySchema() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        const sql = `
            ALTER TABLE l1_places 
            ADD COLUMN IF NOT EXISTS distance_meters INTEGER,
            ADD COLUMN IF NOT EXISTS subcategory TEXT,
            ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
            ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION,
            ADD COLUMN IF NOT EXISTS navigation_url TEXT;

            CREATE INDEX IF NOT EXISTS idx_l1_places_station_category 
            ON l1_places(station_id, category);
        `;

        console.log('Applying V29 Schema Changes...');
        await client.query(sql);
        console.log('✅ Schema updated successfully.');

    } catch (err) {
        console.error('❌ Failed to update schema:', err.message);
    } finally {
        await client.end();
    }
}

applySchema();
