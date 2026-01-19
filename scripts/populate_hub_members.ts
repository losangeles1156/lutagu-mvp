/**
 * Populate Hub Members Script
 *
 * 將 src/lib/constants/stationLines.ts 中的 HUB_STATION_MEMBERS
 * 導入到 Supabase 的 hub_station_members 資料表
 */

import { createClient } from '@supabase/supabase-js';
import { HUB_STATION_MEMBERS } from '../src/lib/constants/stationLines';
import { extractOperator } from '../src/lib/nodes/nodeIdNormalizer';

const fs = require('fs');

async function main() {
    console.log('-- Auto-generated migration to populate hub_station_members');
    console.log('INSERT INTO hub_station_members (hub_id, member_id, operator) VALUES');

    const records = [];

    for (const [hubId, members] of Object.entries(HUB_STATION_MEMBERS)) {
        for (const memberId of members) {
            const operator = extractOperator(memberId) || 'Unknown';
            // Escape single quotes if necessary
            records.push(`('${hubId}', '${memberId}', '${operator}')`);
        }
    }

    if (records.length > 0) {
        console.log(records.join(',\n') + ';');
    } else {
        console.log('-- No data to insert');
    }
}

main().catch(console.error);
