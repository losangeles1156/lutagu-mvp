
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const YAHOO_URL = 'https://transit.yahoo.co.jp/diainfo/area/4'; // Kanto Area

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface TransitAlert {
    id: string;
    source: 'ODPT' | 'Yahoo';
    operator?: string;
    railway: string;
    status: string;
    message: string;
    updated_at: string;
    link?: string;
}

// --- Combined Fetcher ---
async function fetchODPTAll(): Promise<TransitAlert[]> {
    const endpoints = [
        { name: 'Standard', url: 'https://api.odpt.org/api/v4', token: process.env.ODPT_API_KEY || process.env.ODPT_API_TOKEN },
        { name: 'Challenge', url: 'https://api-challenge.odpt.org/api/v4', token: process.env.ODPT_CHALLENGE_KEY || process.env.ODPT_API_TOKEN_CHALLENGE },
        { name: 'Public', url: 'https://api-public.odpt.org/api/v4', token: process.env.ODPT_API_KEY_PUBLIC || '' }
    ];

    const allResults: TransitAlert[] = [];

    for (const ep of endpoints) {
        if (!ep.token && ep.name !== 'Public') continue;

        console.log(`🚄 Fetching from ODPT ${ep.name} API...`);
        const url = `${ep.url}/odpt:TrainInformation?acl:consumerKey=${ep.token || ''}`;

        try {
            const res = await fetch(url);
            if (!res.ok) {
                console.warn(`⚠️ ODPT ${ep.name} failed: ${res.status}`);
                continue;
            }
            const data = await res.json();
            for (const item of data) {
                const status = item['odpt:trainInformationStatus']?.ja || 'Unknown';
                if (status === '平常運転' || status === 'Normal') continue;

                allResults.push({
                    id: item['owl:sameAs'] || `odpt:${item['odpt:railway']}`,
                    source: 'ODPT',
                    operator: item['odpt:operator'],
                    railway: item['odpt:railway'],
                    status: status,
                    message: item['odpt:trainInformationText']?.ja || '',
                    updated_at: item['dc:date'] || new Date().toISOString()
                });
            }
        } catch (e: any) {
            console.error(`❌ ODPT ${ep.name} error:`, e.message);
        }
    }
    return allResults;
}

// --- Yahoo Fetcher ---
async function fetchYahoo(): Promise<TransitAlert[]> {
    console.log('🌐 Fetching from Yahoo Japan Transit...');
    try {
        const res = await fetch(YAHOO_URL);
        const html = await res.text();
        const results: TransitAlert[] = [];

        const lineRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
        let match;

        while ((match = lineRegex.exec(html)) !== null) {
            const rowContent = match[1];

            const nameMatch = rowContent.match(/<a[^>]*>([^<]+)<\/a>/);
            if (!nameMatch) continue;
            const name = nameMatch[1];

            if (rowContent.includes('icnTrouble') || rowContent.includes('trouble')) {
                const expMatch = rowContent.match(/<td class="exp">([\s\S]*?)<\/td>/);
                const message = expMatch ? expMatch[1].replace(/<[^>]+>/g, '').trim() : '運行情報あり';

                results.push({
                    id: `yahoo:${name}`,
                    source: 'Yahoo',
                    railway: name,
                    status: '遅延・運休',
                    message: message,
                    updated_at: new Date().toISOString(),
                    link: YAHOO_URL
                });
            }
        }

        console.log(`✅ Yahoo: Found ${results.length} active alerts.`);
        return results;

    } catch (e: any) {
        console.error('❌ Yahoo Fetch Failed:', e.message);
        return [];
    }
}

// --- Main Pipeline ---
async function run() {
    console.log('🔄 Starting Railway Status Update Pipeline...\n');

    const [odptAlerts, yahooAlerts] = await Promise.all([
        fetchODPTAll(),
        fetchYahoo()
    ]);

    const activeAlerts = [...odptAlerts, ...yahooAlerts];
    const activeIds = new Set(activeAlerts.map(a => a.id));

    // 1. Clear Stale Records
    console.log('🧹 Cleaning up stale alerts...');
    const { data: existing } = await supabase.from('transit_alerts').select('id');
    const staleIds = (existing || []).map(r => r.id).filter(id => !activeIds.has(id));

    if (staleIds.length > 0) {
        const { error: delError } = await supabase.from('transit_alerts').delete().in('id', staleIds);
        if (delError) console.error('❌ Failed to clear stale ids:', delError.message);
        else console.log(`✅ Cleared ${staleIds.length} resolved alerts.`);
    }

    // 2. Upsert Active Alerts
    if (activeAlerts.length > 0) {
        console.log(`\n💾 Upserting ${activeAlerts.length} active records...`);

        for (const alert of activeAlerts) {
            const { error } = await supabase
                .from('transit_alerts')
                .upsert({
                    id: alert.id,
                    operator: alert.operator || alert.source,
                    railway: alert.railway,
                    status: alert.status,
                    text_ja: alert.message,
                    updated_at: alert.updated_at
                });
            if (error) console.error(`❌ Failed to save ${alert.id}:`, error.message);
            else console.log(`   - Active: ${alert.railway} (${alert.source})`);
        }
    } else {
        console.log('✅ No delays detected. System clear.');
    }

    console.log('\n✅ Pipeline Complete.');
}

run();
