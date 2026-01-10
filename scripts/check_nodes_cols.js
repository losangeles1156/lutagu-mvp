
const { Client } = require('pg');
const connectionString = "postgresql://postgres.evubeqeaafdjnuocyhmb:K521128lalK@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres";

async function check() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        const r = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'nodes'");
        console.log('Columns in nodes table:', r.rows.map(x => x.column_name));
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}
check();
