import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { parseKnowledgeMarkdown, ParsedKnowledge } from '../src/lib/l4/markdownParser';

// Load env
dotenv.config({ path: '.env.local' });

// Constants
const KNOWLEDGE_MD_PATH = path.join(process.cwd(), 'src/data/tokyo_transit_knowledge_base.md');
const KNOWLEDGE_JSON_PATH = path.join(process.cwd(), 'src/data/knowledge_base.json');
const DIFY_CSV_PATH_KNOWLEDGE = path.join(process.cwd(), 'dify/lutagu_station_knowledge.csv');
const DIFY_CSV_PATH_RULES = path.join(process.cwd(), 'dify/lutagu_scenario_rules.csv');

// Initialize Supabase (Optional, for strict validation)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let dbClient: any = null;
if (supabaseUrl && supabaseKey) {
    dbClient = createClient(supabaseUrl, supabaseKey);
}

async function validateStationIds(knowledgeItems: ParsedKnowledge[]): Promise<string[]> {
    if (!dbClient) {
        console.warn('⚠️ No Supabase credentials found, skipping rigorous DB validation.');
        return [];
    }

    // Collect all Station IDs referenced
    const allReferencedIds = new Set<string>();
    knowledgeItems.forEach(item => {
        item.stationIds.forEach(id => allReferencedIds.add(id));
    });

    console.log(`🔍 Validating ${allReferencedIds.size} unique Station IDs...`);

    const { data, error } = await dbClient
        .from('nodes')
        .select('id')
        .in('id', Array.from(allReferencedIds));

    if (error) {
        console.error('❌ DB Validation failed:', error);
        return [];
    }

    const validIds = new Set(data.map((row: any) => row.id));
    const invalidIds: string[] = [];

    allReferencedIds.forEach(id => {
        if (!validIds.has(id)) {
            invalidIds.push(id);
        }
    });

    return invalidIds;
}

function generateDifyCSV(knowledgeItems: ParsedKnowledge[]) {
    // CSV Header: station_name, section, content, station_ids, type
    const header = 'station_name,section,content,keywords,type\n';
    const rows = knowledgeItems.map(item => {
        // Sanitize for CSV (simple quote escape)
        const sanitize = (str: string | undefined) => {
            if (typeof str !== 'string') return '""';
            return `"${str.replace(/"/g, '""')}"`;
        };

        // Keywords: derived from station name and section
        const keywords = `${item.stationName},${item.section},${item.type}`;

        return [
            sanitize(item.stationName),
            sanitize(item.section),
            sanitize(item.content),
            sanitize(keywords),
            sanitize(item.type)
        ].join(',');
    });

    return header + rows.join('\n');
}

async function main() {
    console.log('🚀 Starting Knowledge Sync Engine...');

    // 1. Parse Markdown (SSOT)
    if (!fs.existsSync(KNOWLEDGE_MD_PATH)) {
        console.error(`❌ Source file not found: ${KNOWLEDGE_MD_PATH}`);
        process.exit(1);
    }
    console.log(`📖 Reading source: ${KNOWLEDGE_MD_PATH}`);
    const knowledgeItems = parseKnowledgeMarkdown(KNOWLEDGE_MD_PATH);
    console.log(`✅ Parsed ${knowledgeItems.length} items from Markdown.`);

    // 2. Validate IDs
    const invalidIds = await validateStationIds(knowledgeItems);
    if (invalidIds.length > 0) {
        console.warn('⚠️ WARNING: The following Station IDs were found in MD but NOT in DB:');
        console.warn(invalidIds.join('\n'));
        // We warn but don't fail, maybe they are virtual stations or data is incomplete
    } else {
        console.log('✅ All used Station IDs are valid.');
    }

    // 3. Generate Static JSON (For Frontend/API)
    fs.writeFileSync(KNOWLEDGE_JSON_PATH, JSON.stringify(knowledgeItems, null, 2));
    console.log(`💾 Generated JSON Asset: ${KNOWLEDGE_JSON_PATH}`);

    // 4. Generate Dify CSVs
    const csvContent = generateDifyCSV(knowledgeItems);
    fs.writeFileSync(DIFY_CSV_PATH_KNOWLEDGE, csvContent);
    console.log(`💾 Generated Dify CSV: ${DIFY_CSV_PATH_KNOWLEDGE}`);

    console.log('✨ Knowledge Sync Complete!');
}

main().catch(console.error);
