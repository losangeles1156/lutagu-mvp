
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLiveStatus() {
    console.log('📡 Checking Live Data Status...\n');

    // 1. Check Railway Alerts (transit_alerts)
    console.log('--- Railway Alerts (transit_alerts) ---');
    const { data: railData, error: railError } = await supabase
        .from('transit_alerts')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(3);

    if (railError) {
        // Table might be named differently or RLS issue
        console.error('❌ Failed to fetch transit_alerts:', railError.message);
    } else if (railData && railData.length > 0) {
        console.log(`✅ Found ${railData.length} recent records.`);
        railData.forEach(r => {
            console.log(`   - [${r.operator || 'Unknown'}] ${r.railway || r.id} (${r.status}): ${r.updated_at}`);
            console.log(`     Message: ${r.text_ja?.substring(0, 50)}...`);
        });
    } else {
        console.log('⚠️ No recent railway alerts found (This might be normal if everything is running smoothly).');
    }

    // 2. Check Weather Alerts Cache (l2_cache)
    console.log('\n--- Weather Alerts Cache (l2_cache) ---');
    // Schema unknown, avoiding sort by updated_at
    const { data: weatherCache, error: weatherError } = await supabase
        .from('l2_cache')
        .select('*')
        .ilike('key', 'weather%')
        .limit(1);

    if (weatherError) {
        console.error('❌ Failed to fetch l2_cache:', weatherError.message);
    } else if (weatherCache && weatherCache.length > 0) {
        const item = weatherCache[0];
        console.log(`✅ Most recent Weather AI Translation (Random Sample):`);
        console.log(`   - Keys available: ${Object.keys(item).join(', ')}`);
        console.log(`   - Key: ${item.key}`);
        console.log(`   - Value Preview: ${JSON.stringify(item.value).substring(0, 50)}...`);
    } else {
        console.log('⚠️ No weather translation cache found.');
    }

    // 3. Test Live Weather API (Open-Meteo)
    console.log('\n--- Live Weather API (Open-Meteo) ---');
    try {
        const lat = 35.6895, lon = 139.6917;
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=Asia%2FTokyo`;
        const start = Date.now();
        const res = await fetch(url);
        const duration = Date.now() - start;

        if (res.ok) {
            const data = await res.json();
            console.log(`✅ Open-Meteo API Reachable (${duration}ms)`);
            console.log(`   - Current Time (API): ${data.current.time}`);
            console.log(`   - Temp: ${data.current.temperature_2m}°C`);
            console.log(`   - Weather Code: ${data.current.weather_code}`);
        } else {
            console.error(`❌ Open-Meteo API Error: ${res.status}`);
        }
    } catch (e: any) {
        console.error(`❌ Connection Failed: ${e.message}`);
    }
}

checkLiveStatus();
