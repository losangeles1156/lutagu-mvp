// scripts/apply_weather_cache_schema.js
// Run: node scripts/apply_weather_cache_schema.js

const { Client } = require('pg');

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
            CREATE TABLE IF NOT EXISTS weather_advice_cache (
                id SERIAL PRIMARY KEY,
                mode TEXT NOT NULL CHECK (mode IN ('normal', 'emergency')),
                locale TEXT NOT NULL DEFAULT 'en',
                advice TEXT NOT NULL,
                jma_link TEXT,
                weather_data JSONB,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                expires_at TIMESTAMPTZ NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_weather_cache_mode_locale ON weather_advice_cache (mode, locale, expires_at DESC);
        `;

        await client.query(sql);
        console.log('✅ weather_advice_cache table created successfully.');
    } catch (error) {
        console.error('❌ Schema Error:', error.message);
    } finally {
        await client.end();
    }
}

applySchema();
