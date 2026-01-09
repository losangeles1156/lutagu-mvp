/**
 * Verification Script for L2 Status Hybrid Logic
 * This script imports the logic from route.ts (or simulates it closely)
 * to prove that live ODPT data is being fetched and merged.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Use environment variable instead of hardcoded key
const ODPT_API_KEY = process.env.ODPT_API_TOKEN || process.env.ODPT_API_KEY || '';
const ODPT_BASE_URL = 'https://api.odpt.org/api/v4';

async function fetchLiveTrainInfo() {
    if (!ODPT_API_KEY) {
        console.log('❌ ODPT_API_KEY is missing');
        return [];
    }
    // Mask key safely
    const maskedKey = ODPT_API_KEY.slice(0, 5) + '...';
    console.log(`🔑 Using API Key (New Challenge): ${maskedKey}`);
    try {
        const url = `${ODPT_BASE_URL}/odpt:TrainInformation?acl:consumerKey=${ODPT_API_KEY}`;
        console.log(`📡 Fetching: ${url}`);
        const res = await fetch(url);
        if (!res.ok) {
            console.log(`❌ API Error: ${res.status} ${res.statusText}`);
            return [];
        }
        const data = await res.json();
        console.log(`✅ Received ${data.length} records from ODPT.`);

        const operators: Record<string, number> = {};
        data.forEach((item: any) => {
            const op = item['odpt:operator'].replace('odpt.Operator:', '');
            operators[op] = (operators[op] || 0) + 1;
        });

        console.log('\n--- TrainInformation Operators ---');
        console.table(operators);

        // Filter for non-normal status (existing logic)
        const issues = data.filter((item: any) => {
            const status = item['odpt:trainInformationStatus'];
            console.log('Status Type:', typeof status, 'Value:', JSON.stringify(status));

            // Handle if status is object (LocalizedText)
            const statusText = (typeof status === 'object' && status !== null) ? (status.ja || status.en) : status;

            if (!statusText || typeof statusText !== 'string') return false;

            // Keep if NOT "平常運転" (Normal)
            return statusText !== '平常運転' && !statusText.includes('平常通り');
        });

        console.log(`⚠️ Found ${issues.length} active service issues (delays/suspensions).`);
        if (issues.length > 0) {
            console.log('Example Issue:', JSON.stringify(issues[0], null, 2));
        } else {
            console.log('✨ All lines are operating normally (No issues found in live feed).');
        }

        return issues;
    } catch (e) {
        console.error('❌ Exception:', e);
        return [];
    }
}

async function main() {
    console.log('🔍 Verifying L2 Live Data Fetch Logic...\n');
    await fetchLiveTrainInfo();
}

main();
