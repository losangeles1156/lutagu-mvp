/**
 * Run database migration via Supabase REST API
 * Usage: npx tsx scripts/run_migration_rest.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { STATION_LINES, getStationIdVariants, guessPhysicalOdptStationIds, resolveHubStationMembers } from '../src/lib/constants/stationLines';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

function buildStationIdSearchCandidates(stationId: string): string[] {
    const ids = new Set<string>();

    const stationSlugOf = (id: string) => {
        const tail = (id.split(':').pop() || '').trim();
        const slug = (tail.split('.').pop() || '').trim();
        return slug;
    };

    const add = (id: string | null | undefined) => {
        if (!id) return;
        ids.add(id);
        for (const v of getStationIdVariants(id)) ids.add(v);
    };

    add(stationId);

    const stationSlug = stationSlugOf(stationId);
    if (stationSlug) {
        for (const key of Object.keys(STATION_LINES)) {
            if (stationSlugOf(key) === stationSlug) add(key);
        }
    }

    for (const member of resolveHubStationMembers(stationId)) add(member);

    const snapshot1 = Array.from(ids);
    for (const id of snapshot1) {
        for (const physical of guessPhysicalOdptStationIds(id)) {
            add(physical);
            if (physical.startsWith('odpt.Station:JR-East.Chuo.')) {
                add(physical.replace('odpt.Station:JR-East.Chuo.', 'odpt.Station:JR-East.ChuoSobuLocal.'));
                add(physical.replace('odpt.Station:JR-East.Chuo.', 'odpt.Station:JR-East.ChuoRapid.'));
            }
            if (physical.startsWith('odpt.Station:JR-East.Sobu.')) {
                add(physical.replace('odpt.Station:JR-East.Sobu.', 'odpt.Station:JR-East.ChuoSobuLocal.'));
            }
            for (const member of resolveHubStationMembers(physical)) add(member);
        }
    }

    const snapshot2 = Array.from(ids);
    for (const id of snapshot2) {
        for (const member of resolveHubStationMembers(id)) add(member);
    }

    return Array.from(ids);
}

function parseRidingKnowledgeReplacements(sql: string): Map<string, Json> {
    const result = new Map<string, Json>();

    const updateSingleRegex =
        /UPDATE\s+nodes\s+SET\s+riding_knowledge\s*=\s*'([^']*)'\s*WHERE\s+id\s*=\s*'([^']+)'\s*;\s*/g;

    const updateInRegex =
        /UPDATE\s+nodes\s+SET\s+riding_knowledge\s*=\s*'([^']*)'\s*WHERE\s+id\s+IN\s*\(([\s\S]*?)\)\s*;\s*/g;

    for (const match of sql.matchAll(updateSingleRegex)) {
        const jsonText = match[1];
        const id = match[2];
        result.set(id, JSON.parse(jsonText));
    }

    for (const match of sql.matchAll(updateInRegex)) {
        const jsonText = match[1];
        const idsBlock = match[2];
        const value = JSON.parse(jsonText);
        const ids = Array.from(idsBlock.matchAll(/'([^']+)'/g)).map(m => m[1]);
        for (const id of ids) {
            result.set(id, value);
        }
    }

    return result;
}

type JsonPatch = { path: (string | number)[]; value: Json };

function parseRidingKnowledgeJsonbSetPatches(sql: string): Map<string, JsonPatch[]> {
    const result = new Map<string, JsonPatch[]>();

    const regex =
        /UPDATE\s+nodes\s+SET\s+riding_knowledge\s*=\s*jsonb_set\(\s*riding_knowledge\s*,\s*'\{([^}]*)\}'\s*,\s*'([\s\S]*?)'\s*\)\s*WHERE\s+id\s*=\s*'([^']+)'\s*;\s*/g;

    for (const match of sql.matchAll(regex)) {
        const pathText = match[1];
        const valueText = match[2];
        const id = match[3];

        const pathSegments = pathText
            .split(',')
            .map(s => s.trim())
            .filter(Boolean)
            .map(seg => (seg.match(/^\d+$/) ? Number(seg) : seg));

        const value = JSON.parse(valueText) as Json;

        const existing = result.get(id) || [];
        existing.push({ path: pathSegments, value });
        result.set(id, existing);
    }

    return result;
}

function setAtPath(root: Json, pathSegments: (string | number)[], value: Json): Json {
    const clone = typeof structuredClone === 'function' ? structuredClone(root) : JSON.parse(JSON.stringify(root));

    let cursor: any = clone;
    for (let i = 0; i < pathSegments.length; i++) {
        const seg = pathSegments[i];
        const isLast = i === pathSegments.length - 1;

        if (isLast) {
            cursor[seg as any] = value;
            break;
        }

        const nextSeg = pathSegments[i + 1];
        const nextIsIndex = typeof nextSeg === 'number';

        if (cursor[seg as any] == null) {
            cursor[seg as any] = nextIsIndex ? [] : {};
        }

        cursor = cursor[seg as any];
    }

    return clone;
}

async function applySqlViaPostgrest(sql: string) {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const replacements = parseRidingKnowledgeReplacements(sql);
    const patches = parseRidingKnowledgeJsonbSetPatches(sql);

    if (replacements.size === 0 && patches.size === 0) {
        console.log('⚠️ No supported statements found for PostgREST fallback.');
        return;
    }

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const [id, riding_knowledge] of replacements.entries()) {
        const candidates = buildStationIdSearchCandidates(id);
        const { error } = await supabase
            .from('nodes')
            .update({ riding_knowledge })
            .in('id', candidates);

        if (error) {
            failed++;
            errors.push(`${id}: ${error.message}`);
        } else {
            success++;
        }
    }

    for (const [id, idPatches] of patches.entries()) {
        const candidates = buildStationIdSearchCandidates(id);
        const { data, error: fetchError } = await supabase
            .from('nodes')
            .select('id, riding_knowledge')
            .in('id', candidates);

        if (fetchError) {
            failed++;
            errors.push(`${id}: ${fetchError.message}`);
            continue;
        }

        const rows = (data || []) as any[];
        if (rows.length === 0) {
            failed++;
            errors.push(`${id}: no matching node ids found`);
            continue;
        }

        for (const row of rows) {
            let next: Json = row.riding_knowledge || {};
            for (const p of idPatches) {
                next = setAtPath(next, p.path, p.value);
            }

            const { error: updateError } = await supabase
                .from('nodes')
                .update({ riding_knowledge: next })
                .eq('id', row.id);

            if (updateError) {
                failed++;
                errors.push(`${row.id}: ${updateError.message}`);
            } else {
                success++;
            }
        }
    }

    console.log(`✅ PostgREST applied updates. Success: ${success}, Failed: ${failed}`);
    if (errors.length > 0) {
        console.log('First errors:', errors.slice(0, 5));
    }
}

async function runMigration() {
    console.log('=== Running Hub Metadata Migration via REST API ===\n');

    const argPath = process.argv[2];
    const envPath = process.env.MIGRATION_FILE;
    const selectedPath = argPath || envPath || 'supabase/migrations/20260103_create_hub_metadata.sql';
    const migrationPath = path.resolve(process.cwd(), selectedPath);
    
    if (!fs.existsSync(migrationPath)) {
        console.error('❌ Migration file not found:', migrationPath);
        process.exit(1);
    }

    const sql = fs.readFileSync(migrationPath, 'utf-8');
    console.log('📄 Loaded migration file\n');

    try {
        // Execute SQL directly
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SERVICE_KEY}`,
                'Content-Type': 'application/json',
                'apikey': SERVICE_KEY
            },
            body: JSON.stringify({ sql_query: sql })
        });

        if (response.ok) {
            console.log('✅ Migration executed successfully!');
        } else {
            const error = await response.text();
            console.log('⚠️  Response:', response.status, error.substring(0, 200));

            const isMissingExecSql =
                response.status === 404 &&
                (error.includes('PGRST202') || error.includes('Could not find the function') || error.includes('exec_sql'));

            if (isMissingExecSql) {
                console.log('↪️ Falling back to PostgREST updates (no exec_sql RPC in this database)...');
                await applySqlViaPostgrest(sql);
            }
        }

        console.log('\n📋 Migration Summary:');
        console.log('   - hub_metadata table');
        console.log('   - hub_members table');
        console.log('   - Indexes');
        console.log('   - Helper functions: get_hub_members, get_hub_info_by_member');
        console.log('   - Sample data for Tokyo hubs (Ueno, Tokyo, Shinjuku, Ikebukuro)');
        
    } catch (err: any) {
        console.error('❌ Migration failed:', err.message);
        console.log('\n💡 Note: The SQL migration file is ready at:');
        console.log('   supabase/migrations/20260103_create_hub_metadata.sql');
        console.log('\n   You can run this manually in Supabase Dashboard SQL Editor.');
    }
}

runMigration();
