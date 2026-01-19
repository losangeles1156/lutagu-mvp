
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
const migrationsDir = path.join(__dirname, '../supabase', 'migrations');

async function applyMigrations() {
    if (!connectionString) {
        throw new Error('Missing SUPABASE_DB_URL or DATABASE_URL');
    }
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        // Cleanup Step: Drop existing tables to ensure a clean v3.0 refresh
        console.log('--- Cleaning up existing tables ---');
        const tablesToDrop = [
            'nudge_logs',
            'trip_subscriptions',
            'facility_suitability',
            'pois',
            'shared_mobility_stations',
            'facilities',
            'nodes',
            'cities',
            'l2_cache',
            'node_facility_profiles'
        ];
        for (const table of tablesToDrop) {
            try {
                await client.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
                console.log(`Dropped table: ${table}`);
            } catch (e) {
                console.warn(`Could not drop ${table}: ${e.message}`);
            }
        }
        console.log('--- Cleanup complete ---\n');

        const files = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.sql'))
            .sort();

        for (const file of files) {
            console.log(`Applying migration: ${file}...`);
            const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
            try {
                // Split multi-statement SQL if needed, but pg can handle blocks.
                // However, let's wrap in a transaction for safety if it fails.
                await client.query('BEGIN');
                await client.query(sql);
                await client.query('COMMIT');
                console.log(`✅ Success: ${file}`);
            } catch (err) {
                await client.query('ROLLBACK');
                console.error(`❌ Failed: ${file}`);
                console.error(`Error: ${err.message}`);
                // If it's "already exists" we might want to continue,
                // but for a requested "refresh" we want to know why.
            }
        }
    } catch (err) {
        console.error('Connection error:', err.message);
    } finally {
        await client.end();
    }
}

applyMigrations();
