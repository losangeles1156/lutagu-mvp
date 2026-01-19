const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Configuration
const SOURCE_DB_URL = process.env.SOURCE_DB_URL;
const DEST_DB_URL = process.env.DEST_DB_URL;

if (!SOURCE_DB_URL || !DEST_DB_URL) {
    console.error('Error: SOURCE_DB_URL and DEST_DB_URL environment variables are required.');
    process.exit(1);
}

const MIGRATIONS_DIR = path.join(__dirname, 'supabase', 'migrations');

// Helper to escape values based on type
function formatValue(val, dataType) {
    if (val === null || val === undefined) return 'NULL';

    if (Array.isArray(val)) {
        if (dataType === 'ARRAY') {
            // Postgres Array Format: {val1,val2}
            // Need to escape elements: "val" if string.
            // Basic implementation for string/number arrays:
            const content = val.map(v => {
                if (typeof v === 'string') return `"${v.replace(/"/g, '\\"')}"`; // Double quotes for string elements
                return v;
            }).join(',');
            return `'{${content}}'`;
        } else {
            // JSON/JSONB or other: use JSON string
            return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
        }
    }

    if (typeof val === 'number') return val;
    if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
    if (val instanceof Date) return `'${val.toISOString()}'`;
    if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;

    // String formatting
    return `'${String(val).replace(/'/g, "''")}'`;
}

async function main() {
    const sourceClient = new Client({ connectionString: SOURCE_DB_URL, ssl: { rejectUnauthorized: false } });
    const destClient = new Client({ connectionString: DEST_DB_URL, ssl: { rejectUnauthorized: false } });

    try {
        console.log('Connecting to databases...');
        try {
            console.log('Connecting to Source...');
            await sourceClient.connect();
            console.log('Source connected.');
        } catch (e) { throw new Error('Source Connection Failed: ' + e.message); }

        try {
            console.log('Connecting to Destination...');
            await destClient.connect();
            console.log('Destination connected.');
        } catch (e) { throw new Error('Dest Connection Failed: ' + e.message); }

        console.log('Both Connected.');

        // Step 1: Apply migrations to Destination
        console.log('\n--- Step 1: Applying Schema to Destination ---');
        if (fs.existsSync(MIGRATIONS_DIR)) {
            const files = fs.readdirSync(MIGRATIONS_DIR)
                .filter(f => f.endsWith('.sql'))
                .sort();

            for (const file of files) {
                console.log(`Applying ${file}...`);
                const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
                try {
                    await destClient.query(sql);
                } catch (e) {
                    console.warn(`Warning applying ${file}: ${e.message} (Continuing)`);
                }
            }
        } else {
            console.warn('No migrations directory found. Skipping schema creation.');
        }

        // Step 2: Session replication role
        console.log('\n--- Step 2: Preparing Destination for Data ---');
        try {
            await destClient.query("SET session_replication_role = 'replica';");
        } catch (e) {
            console.warn('Could not set session_replication_role:', e.message);
        }

        // Step 3: Get Tables and Column Types from Source
        console.log('\n--- Step 3: Fetching Schema Info ---');
        const tablesRes = await sourceClient.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    `);
        const tables = tablesRes.rows.map(r => r.table_name).filter(t => t !== 'spatial_ref_sys');

        // Fetch detailed column info for these tables
        const colsRes = await sourceClient.query(`
        SELECT table_name, column_name, data_type, udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
    `);

        // Map: table -> column -> type info
        const schemaMap = {};
        colsRes.rows.forEach(row => {
            if (!schemaMap[row.table_name]) schemaMap[row.table_name] = {};
            schemaMap[row.table_name][row.column_name] = row.data_type; // 'ARRAY', 'integer', 'text', 'jsonb', etc.
        });

        console.log('Tables to sync:', tables.join(', '));

        // Step 4: Truncate Dest Tables
        console.log('\n--- Step 4: Truncating Destination Tables ---');
        if (tables.length > 0) {
            try {
                await destClient.query(`TRUNCATE TABLE ${tables.map(t => `"${t}"`).join(', ')} CASCADE`);
            } catch (e) {
                console.warn('Truncate error:', e.message);
            }
        }

        // Step 5: Copy Data
        console.log('\n--- Step 5: Copying Data ---');
        for (const table of tables) {
            console.log(`Syncing table: ${table}...`);

            const dataRes = await sourceClient.query(`SELECT * FROM "${table}"`);
            const rows = dataRes.rows;

            if (rows.length === 0) {
                console.log(`  No data in ${table}.`);
                continue;
            }

            console.log(`  Writing ${rows.length} rows to ${table}...`);

            // Get column order based on the first row or just use schema map keys that exist in row?
            // Better to use keys from the row object to ensure alignment
            const sampleRow = rows[0];
            const cols = Object.keys(sampleRow);
            const colsStr = cols.map(c => `"${c}"`).join(', ');

            for (const row of rows) {
                const values = cols.map(colName => {
                    const val = row[colName];
                    const type = schemaMap[table]?.[colName];
                    return formatValue(val, type);
                }).join(', ');

                try {
                    // Simple Concatenation
                    const insertQuery = `INSERT INTO "${table}" (${colsStr}) VALUES (${values})`;
                    await destClient.query(insertQuery);
                } catch (e) {
                    console.error(`  Error inserting row into ${table}: ${e.message}`);
                }
            }
        }

        console.log('\nMigration completed successfully!');

    } catch (err) {
        console.error('Fatal Error:', err);
    } finally {
        await sourceClient.end();
        await destClient.end();
    }
}

main();
