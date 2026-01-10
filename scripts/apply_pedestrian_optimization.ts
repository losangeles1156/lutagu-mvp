
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Use env var or fallback (from existing script)
const connectionString = process.env.DATABASE_URL || "postgresql://postgres.evubeqeaafdjnuocyhmb:K521128lalK@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres";

async function applyMigration() {
    console.log('🔌 Connecting to database...');
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    const migrationFile = 'supabase/migrations/20260102_fix_pedestrian_rpc.sql';

    try {
        await client.connect();
        console.log('✅ Connected.');

        const sqlPath = path.join(process.cwd(), migrationFile);
        if (!fs.existsSync(sqlPath)) {
            throw new Error(`Migration file not found: ${sqlPath}`);
        }
        
        const sql = fs.readFileSync(sqlPath, 'utf-8');
        console.log(`📄 Applying migration: ${path.basename(sqlPath)}...`);
        
        await client.query(sql);
        console.log(`✅ Successfully applied ${path.basename(sqlPath)}`);
        
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

applyMigration();
