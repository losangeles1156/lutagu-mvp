import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const connectionString = "postgresql://postgres.evubeqeaafdjnuocyhmb:K521128lalK@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres";

async function listTables() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        const res = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `);
        console.log('Tables in public schema:');
        res.rows.forEach(row => console.log(` - ${row.table_name}`));
    } catch (err) {
        console.error('Error listing tables:', err);
    } finally {
        await client.end();
    }
}

listTables();
