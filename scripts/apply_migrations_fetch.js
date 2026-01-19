
const fs = require('fs');
const path = require('path');
const https = require('https');

// 1. Load Env manually to avoid dependencies
function loadEnv() {
    try {
        const content = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
        const env = {};
        content.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/^["']|["']$/g, '');
                env[key] = value;
            }
        });
        return env;
    } catch (e) {
        console.error('Error loading .env.local', e);
        return {};
    }
}

const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing Supabase URL or Key in .env.local');
    process.exit(1);
}

// 2. Helper to execute SQL via RPC
function execSql(sql) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({ sql_query: sql });
        const url = new URL(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`);

        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Length': Buffer.byteLength(data)
            }
        };

        const req = https.request(url, options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(body);
                } else {
                    reject(new Error(`Status ${res.statusCode}: ${body}`));
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.write(data);
        req.end();
    });
}

// 3. Main Migration Logic
async function run() {
    const migrations = [
        'supabase/migrations/20260101_fix_ambiguous_columns.sql',
        'supabase/migrations/20260101_create_ai_feedback.sql'
    ];

    console.log('🔌 Applying migrations via Supabase RPC...');

    for (const file of migrations) {
        const filePath = path.resolve(process.cwd(), file);
        if (!fs.existsSync(filePath)) {
            console.error(`❌ File not found: ${file}`);
            continue;
        }

        const sql = fs.readFileSync(filePath, 'utf8');
        console.log(`📄 Processing ${path.basename(file)}...`);

        try {
            await execSql(sql);
            console.log(`✅ Success: ${path.basename(file)}`);
        } catch (e) {
            console.error(`❌ Failed: ${path.basename(file)}`);
            console.error(e.message);
            // If exec_sql doesn't exist, we will know here
            if (e.message.includes('Could not find the function') || e.message.includes('404')) {
                console.error('⚠️  CRITICAL: The "exec_sql" RPC function is missing in the database.');
                console.error('   You must execute the SQL manually in Supabase SQL Editor.');
                process.exit(1);
            }
        }
    }
    console.log('🎉 Migration process completed.');
}

run();
