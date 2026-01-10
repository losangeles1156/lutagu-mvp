
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Use env var or fallback
const connectionString = process.env.DATABASE_URL || "postgresql://postgres.evubeqeaafdjnuocyhmb:K521128lalK@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres";

async function applyMigrations() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    const migrations = [
        'supabase/migrations/20260101_fix_ambiguous_columns.sql',
        'supabase/migrations/20260101_create_ai_feedback.sql'
    ];

    try {
        await client.connect();
        console.log('🔌 Connected to database.');

        for (const migrationFile of migrations) {
            const sqlPath = path.join(process.cwd(), migrationFile);
            if (!fs.existsSync(sqlPath)) {
                console.error(`❌ Migration file not found: ${sqlPath}`);
                continue;
            }
            
            const sql = fs.readFileSync(sqlPath, 'utf-8');
            console.log(`📄 Applying migration: ${path.basename(sqlPath)}...`);
            
            try {
                await client.query(sql);
                console.log(`✅ Applied ${path.basename(sqlPath)}`);
            } catch (e) {
                console.error(`❌ Failed to apply ${path.basename(sqlPath)}:`, e);
                // Don't stop, try next if possible? Or stop? 
                // Usually we should stop, but these might be independent.
                // Given instructions "A, C, B", I'll try to proceed.
            }
        }
        
    } catch (err) {
        console.error('❌ Database connection failed:', err);
    } finally {
        await client.end();
    }
}

applyMigrations();
