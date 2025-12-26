import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs/promises';

// 1. Environment Setup
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const ODPT_PROD = 'https://api.odpt.org/api/v4';
const ODPT_PUB = 'https://api-public.odpt.org/api/v4';
const ODPT_CHALLENGE = 'https://api-challenge.odpt.org/api/v4';

const TOKEN_DEV = process.env.ODPT_API_TOKEN;
const TOKEN_CHALLENGE = process.env.ODPT_API_TOKEN_BACKUP;

const supabase = createClient(supabaseUrl, supabaseKey);

// 2. Helper: Triple-Strategy Fetcher
async function fetchOdpt(type: string, params: Record<string, string>) {
    const operator = params['odpt:operator'] || '';

    let baseUrl = ODPT_PROD;
    let token = TOKEN_DEV;

    // Detect strategy matching src/lib/odpt/client.ts
    if (operator.includes('Toei')) {
        baseUrl = ODPT_PUB;
        token = undefined;
    } else if (operator.includes('JR-East')) {
        baseUrl = ODPT_CHALLENGE;
        token = TOKEN_CHALLENGE;
    } else {
        // Metro, MIR, etc.
        baseUrl = ODPT_PROD;
        token = TOKEN_DEV;
    }

    const searchParams = new URLSearchParams(params);
    if (token) searchParams.append('acl:consumerKey', token);

    const url = `${baseUrl}/${type}?${searchParams.toString()}`;

    try {
        const res = await fetch(url);
        if (!res.ok) {
            console.error(`[API Error] ${res.status}: ${url}`);
            return null;
        }
        return res.json();
    } catch (e: any) {
        console.error(`[Network Error] ${e.message}`);
        return null;
    }
}

// 3. Helper: Resolve Operator from Station ID
function getOperatorFromId(stationId: string): string {
    if (stationId.includes('Toei')) return 'odpt.Operator:Toei';
    if (stationId.includes('TokyoMetro')) return 'odpt.Operator:TokyoMetro';
    if (stationId.includes('JR-East')) return 'odpt.Operator:JR-East';
    if (stationId.includes('MIR')) return 'odpt.Operator:MIR';
    return ''; // Unknown
}

// 4. Main ETL Process
async function runETL() {
    console.log('--- Starting ODPT Knowledge Base ETL ---');

    // A. Get List of Target Nodes
    const { data: nodes, error } = await supabase
        .from('nodes')
        .select('id, name')
        .limit(1000); // Fetch all (assuming <1000 for now)

    if (error || !nodes) {
        console.error('Failed to fetch nodes from DB:', error);
        return;
    }
    console.log(`Found ${nodes.length} nodes to process.`);

    const baseDir = path.resolve(process.cwd(), 'knowledge/stations');

    // B. Process Each Node
    for (const node of nodes) {
        const stationId = node.id;
        const operator = getOperatorFromId(stationId);

        if (!operator) {
            console.log(`[Skip] Unknown operator for ${stationId}`);
            continue;
        }

        console.log(`[Processing] ${stationId} (${operator})`);

        // C. Fetch Data
        // 1. Timetables
        const timetables = await fetchOdpt('odpt:StationTimetable', {
            'odpt:station': stationId,
            'odpt:operator': operator
        });

        // 2. Fares (From this station)
        const fares = await fetchOdpt('odpt:RailwayFare', {
            'odpt:fromStation': stationId,
            'odpt:operator': operator
        });

        // D. Save to Knowledge Base
        if ((timetables && timetables.length > 0) || (fares && fares.length > 0)) {
            const nodeDir = path.join(baseDir, stationId);
            await fs.mkdir(nodeDir, { recursive: true });

            if (timetables?.length) {
                await fs.writeFile(path.join(nodeDir, 'timetables.json'), JSON.stringify(timetables, null, 2));
            }
            if (fares?.length) {
                await fs.writeFile(path.join(nodeDir, 'fares.json'), JSON.stringify(fares, null, 2));
            }
            console.log(`   -> Saved: Timetables=${timetables?.length || 0}, Fares=${fares?.length || 0}`);
        } else {
            console.log(`   -> No data found.`);
        }

        // Nap to be polite
        await new Promise(r => setTimeout(r, 200));
    }

    console.log('--- ETL Complete ---');
}

runETL();
