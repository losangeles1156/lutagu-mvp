
import { createClient } from '@supabase/supabase-js';
import { EmbeddingService } from '../src/lib/ai/embeddingService';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';

// Load .env.local
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}

// Config
const SKILL_ROOTS = [
    '.agent/skills/tokyo-expert-knowledge',
    '.agent/skills/strategies/deep-research'
];

// ✅ Reduced delay: Gemini supports 1500 RPM (vs MiniMax 10 RPM)
const DELAY_MS = 500; // Was 3500ms for MiniMax rate limits

interface IngestionItem {
    id: string; // Deterministic ID based on file+section
    content: string;
    category: string;
    tags: string[];
    source: string;
}

function parseFrontmatter(content: string): { data: Record<string, any>; content: string } {
    const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) return { data: {}, content };

    const yaml = match[1];
    const body = match[2];
    const data: Record<string, any> = {};

    yaml.split('\n').forEach(line => {
        const [key, ...values] = line.split(':');
        if (key && values.length) {
            const val = values.join(':').trim();
            if (val.startsWith('[') && val.endsWith(']')) {
                // Simple array parse
                data[key.trim()] = val.slice(1, -1).split(',').map(s => s.trim());
            } else {
                data[key.trim()] = val;
            }
        }
    });

    return { data, content: body.trim() };
}

function getSkillTags(dir: string): string[] {
    const skillPath = path.join(process.cwd(), dir, 'SKILL.md');
    if (fs.existsSync(skillPath)) {
        const raw = fs.readFileSync(skillPath, 'utf-8');
        const { data } = parseFrontmatter(raw);
        return data.tags || [];
    }
    return [];
}

function crawlFiles(dir: string): string[] {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            results = results.concat(crawlFiles(filePath));
        } else if (file.endsWith('.md') && file !== 'SKILL.md') {
            results.push(filePath);
        }
    });
    return results;
}

// 🛡️ Security: Risk Pattern Matcher
function containsSensitiveData(text: string): { hasRisk: boolean; type?: string } {
    // 1. Specific API Key Patterns
    const patterns = [
        { type: 'OpenAI/Zeabur Key', regex: /sk-[a-zA-Z0-9]{20,}/ },
        { type: 'Google API Key', regex: /AIza[0-9A-Za-z-_]{35}/ },
        { type: 'Supabase Key', regex: /sb_[a-z]+_[a-zA-Z0-9]{20,}/ },
        { type: 'Private Key', regex: /-----BEGIN PRIVATE KEY-----/ },
        { type: 'Generic Token', regex: /(?:api_key|access_token|secret)[\s=:"']+([a-zA-Z0-9_\-]{16,})/i }
    ];

    for (const p of patterns) {
        if (p.regex.test(text)) {
            return { hasRisk: true, type: p.type };
        }
    }
    return { hasRisk: false };
}

async function main() {
    console.log('📚 Starting Dynamic Skill Ingestion...');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Supabase Creds Missing');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const items: IngestionItem[] = [];

    // 1. Crawl & Parse
    for (const rootRelative of SKILL_ROOTS) {
        const rootDir = path.join(process.cwd(), rootRelative);
        if (!fs.existsSync(rootDir)) {
            console.warn(`⚠️  Directory not found: ${rootDir}`);
            continue;
        }

        const baseTags = getSkillTags(rootRelative);
        const category = path.basename(rootRelative); // e.g., 'deep-research'
        const files = crawlFiles(rootDir);

        for (const file of files) {
            const raw = fs.readFileSync(file, 'utf-8');
            const { content } = parseFrontmatter(raw);
            const fileName = path.basename(file, '.md');

            // Chunk by Header 2 (##)
            const sections = content.split(/\n## /);

            sections.forEach((section, idx) => {
                const cleanSection = section.trim();
                let sectionTitle = 'Intro';
                let body = cleanSection;

                if (idx > 0 || cleanSection.startsWith('## ')) {
                    // Re-add ## if stripped by split (split consumes separator)
                    // The split separator is `\n## `, so the next chunk starts with the title text
                    const firstLineEnd = cleanSection.indexOf('\n');
                    if (firstLineEnd > -1) {
                        sectionTitle = cleanSection.substring(0, firstLineEnd).trim();
                        // Keep full content including title for context
                        body = `## ${cleanSection}`;
                    } else {
                        sectionTitle = cleanSection;
                        body = `## ${cleanSection}`;
                    }
                } else {
                    // First chunk (Intro) often has Title (# X)
                    const titleMatch = cleanSection.match(/^# (.*)/);
                    if (titleMatch) sectionTitle = titleMatch[1];
                }

                if (body.length < 50) return; // Skip too short



                // 🛡️ Security Check
                const risk = containsSensitiveData(body);
                if (risk.hasRisk) {
                    console.error(`  🚨 SECURITY ALERT: Skipped "${sectionTitle}" in ${fileName}.md - Detected ${risk.type}`);
                    return;
                }

                items.push({
                    id: `${category}-${fileName}-${idx}`,
                    content: body,
                    category: category,
                    tags: [...baseTags, fileName, sectionTitle.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()],
                    source: path.relative(process.cwd(), file)
                });
            });
        }
    }

    console.log(`Found ${items.length} chunks to ingest.`);

    // 2. Embed & Ingest
    for (const [i, item] of items.entries()) {
        console.log(`[${i + 1}/${items.length}] Embedding: ${item.id}`);

        try {
            const vector = await EmbeddingService.generateEmbedding(item.content, 'db');

            const isZero = vector.every(v => v === 0);
            if (isZero) {
                console.warn('  ⚠️ Got Zero Vector. Skipping.');
                await new Promise(r => setTimeout(r, DELAY_MS));
                continue;
            }

            // Upsert (using delete+insert or real upsert if ID supported? Table uses UUID usually)
            // We use randomUUID content-based hashing simulation or just insert new ones?
            // The table likely has `id` uuid. We should check if we can dedup.
            // For now, we proceed with insert (duplicate content might occur if we run multiple times without cleanup)
            // Ideally: Delete by category first? Or check content existence?
            // Simple approach: Delete all where category IN target_categories

            // NOTE: Safe mode - just insert. User can clear table manually if needed.
            // Or better: Upsert based on content hash? No column for that.

            // Let's rely on standard insert.

            const { error } = await supabase.from('expert_knowledge').insert({
                content: item.content,
                embedding: vector,
                category: item.category,
                tags: item.tags,
                // metadata: { source: item.source, version: 'dynamic-v1' } // if metadata col exists
            });

            if (error) console.error('  ❌ DB Error:', error.message);
            else console.log('  ✅ Ingested');

        } catch (e: any) {
            console.error('  ❌ Failed:', e.message);
        }

        await new Promise(r => setTimeout(r, DELAY_MS));
    }
}

main().catch(console.error);
