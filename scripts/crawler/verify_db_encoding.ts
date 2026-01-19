import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

async function verifyEncoding() {
    console.log('--- Verifying Database Encoding & Multi-language Structure ---');

    const { data, error } = await supabase
        .from('l4_knowledge_embeddings')
        .select('entity_id, entity_name, content, source')
        .limit(5);

    if (error) {
        console.error('Error fetching data:', error);
        return;
    }

    data.forEach((item, index) => {
        console.log(`\n[Sample ${index + 1}]`);
        console.log(`ID: ${item.entity_id}`);
        console.log(`Entity Name (JSONB):`, JSON.stringify(item.entity_name, null, 2));
        console.log(`Content Preview: ${item.content.substring(0, 100)}...`);
        console.log(`Source: ${item.source}`);

        // Check for actual replacement characters (U+FFFD)
        const hasIssue = item.content.includes('\uFFFD') || JSON.stringify(item.entity_name).includes('\uFFFD');
        if (hasIssue) {
            console.error('❌ Encoding issue detected (Replacement characters found)');
        } else {
            console.log('✅ Encoding check passed (UTF-8)');
        }
    });
}

verifyEncoding().catch(console.error);
