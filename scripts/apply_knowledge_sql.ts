
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load env vars
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const sqlPath = path.join(process.cwd(), 'supabase/migrations/20260106_ingest_markdown_knowledge.sql');
    if (!fs.existsSync(sqlPath)) {
        console.error('Migration file not found:', sqlPath);
        return;
    }

    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

    // Regex to capture JSON payload and ID
    // Matches: UPDATE nodes SET riding_knowledge = '{...}' WHERE id = '...';
    const pattern = /UPDATE nodes\s+SET riding_knowledge = '(\{.*?\})'\s+WHERE id = '(.*?)';/gs;

    let match;
    let count = 0;
    let skipped = 0;

    console.log('Starting ingestion from SQL file...');

    while ((match = pattern.exec(sqlContent)) !== null) {
        let jsonString = match[1];
        const id = match[2];

        // 1. Fix SQL escaping
        let cleanJsonString = jsonString.replace(/''/g, "'");

        // 2. Fix Lone Surrogates (The cause of "Empty or invalid json" in Postgres)
        // Remove Low Surrogates not preceded by High Surrogates
        cleanJsonString = cleanJsonString.replace(/(?<!\\u[dD][89abAB][0-9a-fA-F]{2})\\u[dD][c-fC-F][0-9a-fA-F]{2}/g, "");
        // Remove High Surrogates not followed by Low Surrogates
        cleanJsonString = cleanJsonString.replace(/\\u[dD][89abAB][0-9a-fA-F]{2}(?!\\u[dD][c-fC-F][0-9a-fA-F]{2})/g, "");

        try {
            const payload = JSON.parse(cleanJsonString);

            // 3. Skip Empty Payloads to prevent overwriting existing data with empty duplicates
            const hasContent = (payload.traps && payload.traps.length > 0) ||
                (payload.hacks && payload.hacks.length > 0);

            if (!hasContent) {
                skipped++;
                continue;
            }

            const { error } = await supabase
                .from('nodes')
                .update({ riding_knowledge: payload })
                .eq('id', id);

            if (error) {
                console.error(`[ERR] Failed to update ${id}:`, error.message);
            } else {
                // console.log(`[OK] Updated ${id}`);
                process.stdout.write('.'); // Compact progress
                count++;
            }
        } catch (e: any) {
            console.error(`\n[ERR] Parse error for ${id}:`, e.message);
        }

        // Tiny delay to avoid rate limits
        await new Promise(r => setTimeout(r, 20));
    }

    console.log(`\nFinished. Updated ${count} nodes. Skipped ${skipped} empty payloads.`);
}

main();
