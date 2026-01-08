
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!
);

async function main() {
    console.log('--- Consolidating Duplicate Subway Nodes ---');

    // 1. Fetch all active Metro and Toei nodes
    const { data: nodes, error } = await supabase
        .from('nodes')
        .select('*')
        .eq('is_active', true)
        .or('id.ilike.odpt.Station:TokyoMetro.%,id.ilike.odpt.Station:Toei.%');

    if (error || !nodes) {
        console.error('Error fetching nodes:', error);
        return;
    }

    console.log(`Fetched ${nodes.length} active subway nodes.`);

    // 2. Group by Operator + Name (English)
    // Key: "TokyoMetro:Ginza", "Toei:Otemachi"
    const groups = new Map<string, any[]>();

    for (const node of nodes) {
        const nameEn = node.name?.en;
        if (!nameEn) continue;

        const operator = node.id.includes('TokyoMetro') ? 'TokyoMetro' :
            node.id.includes('Toei') ? 'Toei' : null;

        if (!operator) continue;

        const key = `${operator}:${nameEn}`;
        if (!groups.has(key)) {
            groups.set(key, []);
        }
        groups.get(key)!.push(node);
    }

    console.log(`Found ${groups.size} unique station/operator groups.`);

    // 3. Process Groups
    let deactivatedCount = 0;
    let mergedCount = 0;

    for (const [key, group] of groups.entries()) {
        if (group.length < 2) continue; // No duplicates

        console.log(`Processing duplicates for ${key} (${group.length} nodes)`);

        // Strategy: Find the "best" node to keep.
        // 1. Prefer ID that is strictly "odpt.Station:Operator.Name" (shortest usually, or without Line name)
        // 2. Or prefer the one that already has multiple lines.

        // Sort: Shortest ID length first.
        // e.g. odpt.Station:TokyoMetro.Ginza (len 27) vs odpt.Station:TokyoMetro.Ginza.Ginza (len 33)
        group.sort((a, b) => a.id.length - b.id.length);

        const master = group[0];
        const duplicates = group.slice(1);

        // Merge transit lines
        const allLines = new Set<string>();

        // Add master's lines
        if (Array.isArray(master.transit_lines)) {
            master.transit_lines.forEach((l: string) => allLines.add(l));
        }

        // Add duplicates' lines
        for (const dup of duplicates) {
            if (Array.isArray(dup.transit_lines)) {
                dup.transit_lines.forEach((l: string) => allLines.add(l));
            }
        }

        const mergedLines = Array.from(allLines);

        // Update Master
        const { error: updateErr } = await supabase
            .from('nodes')
            .update({
                transit_lines: mergedLines,
                // Maybe update facility_profile too if needed?
            })
            .eq('id', master.id);

        if (updateErr) console.error(`Failed to update master ${master.id}:`, updateErr);
        else mergedCount++;

        // Deactivate Duplicates
        const dupIds = duplicates.map(d => d.id);
        const { error: deactErr } = await supabase
            .from('nodes')
            .update({ is_active: false })
            .in('id', dupIds);

        if (deactErr) console.error(`Failed to deactivate duplicates for ${master.id}:`, deactErr);
        else deactivatedCount += dupIds.length;

        console.log(`  -> Kept ${master.id}, merged ${mergedLines.length} lines, hid ${dupIds.length} nodes.`);
    }

    console.log('--- Consolidation Complete ---');
    console.log(`Merged Groups: ${mergedCount}`);
    console.log(`Deactivated Nodes: ${deactivatedCount}`);
}

main();
