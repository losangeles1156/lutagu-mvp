
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function applySql() {
    const sqlPath = path.resolve(process.cwd(), 'supabase/migrations/20260106_ingest_markdown_knowledge.sql');
    if (!fs.existsSync(sqlPath)) {
        console.error('SQL file not found');
        return;
    }

    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
    const statements = sqlContent.split(';').filter(s => s.trim().length > 0);

    console.log(`Applying ${statements.length} SQL statements...`);

    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i].trim();
        if (!stmt.startsWith('UPDATE')) continue;

        // Extract ID and JSON
        const idMatch = stmt.match(/WHERE id = '(.*?)'/);
        const jsonMatch = stmt.match(/SET riding_knowledge = '(.*?)'/);

        if (idMatch && jsonMatch) {
            const id = idMatch[1];
            let jsonStr = jsonMatch[1].replace(/''/g, "'");
            try {
                const data = JSON.parse(jsonStr);
                const { error } = await supabase
                    .from('nodes')
                    .update({ riding_knowledge: data })
                    .eq('id', id);

                if (error) {
                    console.error(`Error updating ${id}:`, error.message);
                } else if (i % 20 === 0) {
                    console.log(`Progress: ${Math.round(i / statements.length * 100)}% (${i}/${statements.length})`);
                }
            } catch (e) {
                console.error(`Failed to parse JSON for ${id}:`, e);
            }
        }
    }
    console.log('Done!');
}

applySql();
