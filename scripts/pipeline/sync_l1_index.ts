import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { IdMatcher } from '../../src/lib/utils/idMatcher';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Service Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('Fetching stations with L1 data...');

    // 1. Get all station_counts from l1_places
    const stationCounts: Record<string, number> = {};
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
        console.log(`Fetching page ${page + 1}...`);
        const { data, error } = await supabase
            .from('l1_places')
            .select('station_id')
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
            console.error('Error fetching L1 data:', error);
            return;
        }

        if (data.length === 0) {
            hasMore = false;
        } else {
            data.forEach(row => {
                const normalized = IdMatcher.normalize(row.station_id);
                stationCounts[normalized] = (stationCounts[normalized] || 0) + 1;
            });
            page++;
        }
    }

    const normalizedStationIds = Object.keys(stationCounts);
    console.log(`Found ${normalizedStationIds.length} unique stations in l1_places (normalized).`);

    // 2. Fetch ALL station nodes to ensure we have name mappings
    console.log('Fetching all station nodes for name mapping...');
    const { data: allNodes, error: nodesError } = await supabase
        .from('nodes')
        .select('id, name')
        .not('name', 'is', null);

    if (nodesError) {
        console.error('Error fetching nodes:', nodesError);
        return;
    }

    // 3. Match l1_places to nodes using IdMatcher
    const nameToIndex: Record<string, { id: string, count: number }> = {};

    allNodes.forEach(node => {
        const nodeId = node.id;
        const normalizedNodeId = IdMatcher.normalize(nodeId);

        // Find if any l1_place normalized ID matches this node
        // We also check for variants
        const variants = IdMatcher.getVariants(nodeId);
        let totalCount = 0;

        variants.forEach(variant => {
            const normalizedVariant = IdMatcher.normalize(variant);
            if (stationCounts[normalizedVariant]) {
                totalCount += stationCounts[normalizedVariant];
            }
        });

        // Some special cases for Tokyo Metro/Toei where the node ID might be shorter
        // e.g. nodes has odpt:Station:TokyoMetro.Shinjuku
        // l1_places has odpt.Station:TokyoMetro.Marunouchi.Shinjuku
        if (totalCount === 0) {
            normalizedStationIds.forEach(l1Id => {
                if (IdMatcher.isMatch(nodeId, l1Id)) {
                    totalCount += stationCounts[l1Id];
                }
            });
        }

        if (totalCount > 0) {
            const nameObj = node.name as any;
            const ja = nameObj?.ja;
            const en = nameObj?.en;

            const update = (name: string) => {
                if (!name) return;
                const key = name.replace(/ (Station|站)$/, '');
                if (!nameToIndex[key] || nameToIndex[key].count < totalCount) {
                    nameToIndex[key] = { id: nodeId, count: totalCount };
                }
            };

            update(ja);
            update(en);
            if (ja && ja.includes('ヶ')) update(ja.replace('ヶ', 'ケ'));
            if (ja && ja.includes('ケ')) update(ja.replace('ケ', 'ヶ'));
        }
    });

    const finalIndex: Record<string, string> = {};
    Object.keys(nameToIndex).sort().forEach(name => {
        finalIndex[name] = nameToIndex[name].id.replace(/:/g, '.');
    });

    // 4. Update src/data/staticL1Data.ts
    const filePath = path.resolve(__dirname, '../../src/data/staticL1Data.ts');
    let content = fs.readFileSync(filePath, 'utf-8');

    const indexStr = JSON.stringify(finalIndex, null, 4);
    const regex = /export const L1_NAME_INDEX: Record<string, string> = \{[\s\S]*?\};/;
    const replacement = `export const L1_NAME_INDEX: Record<string, string> = ${indexStr};`;

    if (regex.test(content)) {
        content = content.replace(regex, replacement);
        fs.writeFileSync(filePath, content);
        console.log(`Successfully updated L1_NAME_INDEX in ${filePath}`);
        console.log(`Total indexed names: ${Object.keys(finalIndex).length}`);
    } else {
        console.error('Could not find L1_NAME_INDEX block in staticL1Data.ts to replace.');
    }
}

main().catch(err => {
    console.error('Sync failed:', err);
    process.exit(1);
});

