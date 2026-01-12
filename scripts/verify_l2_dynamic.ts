
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyL2() {
    console.log('--- 🚄 L2 Dynamic Data Verification ---');

    const { data: alerts, error } = await supabase
        .from('transit_alerts')
        .select('*');

    if (error) {
        console.error('Error fetching alerts:', error);
        return;
    }

    console.log(`Current active alerts in DB: ${alerts.length}`);

    // Check for "Normal" leaks
    const normalLeaks = alerts.filter(a => a.status === '平常運行' || a.status === '平常運転' || a.text_ja?.includes('平常運転') || a.text_ja === '平常運転');
    if (normalLeaks.length > 0) {
        console.warn('❌ Found "Normal Operation" alerts that should have been filtered out!');
        console.log(JSON.stringify(normalLeaks.slice(0, 2), null, 2));
    } else {
        console.log('✅ Filtering logic verified: No normal operation alerts found.');
    }

    // Check freshness
    if (alerts.length > 0) {
        const latest = new Date(Math.max(...alerts.map(a => new Date(a.updated_at).getTime())));
        console.log(`Latest update in DB: ${latest.toISOString()} (Current: ${new Date().toISOString()})`);
    } else {
        console.log('No alerts found. This is normal if all lines are operational.');
    }
}

verifyL2();
