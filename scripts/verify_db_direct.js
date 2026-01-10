
const { Client } = require('pg');
const connectionString = "postgresql://postgres.evubeqeaafdjnuocyhmb:K521128lalK@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres";

async function verify() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('--- DB Verification ---');

        const tables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log('Tables:', tables.rows.map(r => r.table_name).join(', '));

        const l2Data = await client.query("SELECT * FROM l2_cache WHERE key = 'transit:delay_report'");
        console.log('L2 Cache Entry (transit:delay_report):', l2Data.rows.length > 0 ? 'FOUND' : 'MISSING');
        if (l2Data.rows.length > 0) {
            console.log('Value:', JSON.stringify(l2Data.rows[0].value, null, 2));
        }

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

verify();
