
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const YAHOO_URL = 'https://transit.yahoo.co.jp/diainfo/area/4'; // Kanto Area

const isDryRun = process.argv.includes('--dry-run') || process.env.DRY_RUN === 'true';

const supabase = (!isDryRun && SUPABASE_URL && SUPABASE_KEY)
    ? createClient(SUPABASE_URL, SUPABASE_KEY)
    : null;

if (!isDryRun && !supabase) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const YAHOO_TO_ODPT_MAP: Record<string, string> = {
    'ＪＲ山手線': 'odpt.Railway:JR-East.Yamanote',
    'ＪＲ京浜東北根岸線': 'odpt.Railway:JR-East.KeihinTohoku',
    'ＪＲ京浜東北線': 'odpt.Railway:JR-East.KeihinTohoku',
    'ＪＲ中央線快速電車': 'odpt.Railway:JR-East.ChuoKaisoku',
    'ＪＲ中央・総武各駅停車': 'odpt.Railway:JR-East.ChuoSobu',
    'ＪＲ総武線快速電車': 'odpt.Railway:JR-East.SobuKaisoku',
    'ＪＲ埼京川越線': 'odpt.Railway:JR-East.Saikyo',
    'ＪＲ埼京線': 'odpt.Railway:JR-East.Saikyo',
    'ＪＲ湘南新宿ライン': 'odpt.Railway:JR-East.ShonanShinjuku',

    '東京メトロ銀座線': 'odpt.Railway:TokyoMetro.Ginza',
    '東京メトロ丸ノ內線': 'odpt.Railway:TokyoMetro.Marunouchi',
    '東京メトロ日比谷線': 'odpt.Railway:TokyoMetro.Hibiya',
    '東京メトロ東西線': 'odpt.Railway:TokyoMetro.Tozai',
    '東京メトロ千代田線': 'odpt.Railway:TokyoMetro.Chiyoda',
    '東京メトロ有楽町線': 'odpt.Railway:TokyoMetro.Yurakucho',
    '東京メトロ半蔵門線': 'odpt.Railway:TokyoMetro.Hanzomon',
    '東京メトロ南北線': 'odpt.Railway:TokyoMetro.Namboku',
    '東京メトロ副都心線': 'odpt.Railway:TokyoMetro.Fukutoshin',

    '都営浅草線': 'odpt.Railway:Toei.Asakusa',
    '都営三田線': 'odpt.Railway:Toei.Mita',
    '都営新宿線': 'odpt.Railway:Toei.Shinjuku',
    '都営大江戸線': 'odpt.Railway:Toei.Oedo',

    'ゆりかもめ': 'odpt.Railway:Yurikamome.Yurikamome',
    'りんかい線': 'odpt.Railway:TWR.Rinkai'
};

function inferOperatorFromRailwayId(railwayId: string): string | null {
    const cleaned = railwayId.replace(/^odpt[.:]Railway:/, '');
    const op = cleaned.split('.')[0];
    if (!op) return null;
    return `odpt.Operator:${op}`;
}

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
                const message = item['odpt:trainInformationText']?.ja || '';

                // Strict skip for normal operations (including both Simplified and Traditional Chinese variants if they appear)
                if (status === '平常運転' || status === 'Normal' ||
                    message === '平常運転' || message.includes('平常通り運転') ||
                    message === '平常運轉' || message.includes('平常通り運轉')) continue;

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

                const mappedRailwayId = YAHOO_TO_ODPT_MAP[name];
                const railway = mappedRailwayId || name;
                const operator = mappedRailwayId ? (inferOperatorFromRailwayId(mappedRailwayId) ?? undefined) : undefined;

                results.push({
                    id: mappedRailwayId ? `yahoo:${mappedRailwayId}` : `yahoo:${name}`,
                    source: 'Yahoo',
                    operator,
                    railway,
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

    if (isDryRun) {
        console.log(`\n🧪 Dry run: ${activeAlerts.length} active alerts (ODPT ${odptAlerts.length}, Yahoo ${yahooAlerts.length})`);
        return;
    }

    // 1. Clear Stale Records
    console.log('🧹 Cleaning up stale alerts...');
    const { data: existing } = await supabase!.from('transit_alerts').select('id');
    const staleIds = (existing || []).map(r => r.id).filter(id => !activeIds.has(id));

    if (staleIds.length > 0) {
        const { error: delError } = await supabase!.from('transit_alerts').delete().in('id', staleIds);
        if (delError) console.error('❌ Failed to clear stale ids:', delError.message);
        else console.log(`✅ Cleared ${staleIds.length} resolved alerts.`);
    }

    // 2. Upsert Active Alerts
    if (activeAlerts.length > 0) {
        console.log(`\n💾 Upserting ${activeAlerts.length} active records...`);

        for (const alert of activeAlerts) {
            const { error } = await supabase!
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
