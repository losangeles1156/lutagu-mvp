import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
const supabase = createClient(envConfig.NEXT_PUBLIC_SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY || envConfig.SUPABASE_SERVICE_KEY);

// Copied subset of wisdom data (focused on L3)
const WISDOM_DATA = {
    'odpt:Station:TokyoMetro.Ginza': [
        { type: 'toilet', floor: 'Metro B1', operator: 'Metro', location: '銀座四丁目交差點方面驗票口附近', attributes: { wheelchair: true, hasWashlet: true }, source: 'https://www.tokyometro.jp/lang_tcn/station/ginza/accessibility/' },
        { type: 'toilet', floor: 'Metro B1', operator: 'Metro', location: 'C8 出口附近改札外 (新設)', attributes: { wheelchair: true, hasWashlet: true } },
        { type: 'locker', floor: 'Metro B1', operator: 'Metro', location: '有樂町方面驗票口外 右側通路', attributes: { count: 30, sizes: ['S', 'M', 'L'] }, source: 'https://coinlocker.click/ginza-station.php' },
        { type: 'locker', floor: 'Metro B1', operator: 'Metro', location: 'C5/C6 出口之間通路', attributes: { count: 50, sizes: ['S', 'M', 'L'] } },
        { type: 'elevator', floor: 'Metro GF', operator: 'Metro', location: 'A7 出口 (銀座三越)', attributes: { wheelchair: true } },
        { type: 'elevator', floor: 'Metro B1', operator: 'Metro', location: '銀座線/丸之內線月台 → 穿堂層', attributes: { wheelchair: true } },
        { type: 'wifi', floor: 'Metro GF', operator: 'Metro', location: '改札內', attributes: { ssid: 'METRO_FREE_WiFi' } }
    ],
    'odpt:Station:Toei.Nihombashi': [
        { type: 'toilet', floor: 'Metro B1', operator: 'Metro', location: '吳服橋方面驗票口內 (東西線側)', attributes: { wheelchair: true, hasWashlet: true }, source: 'https://www.tokyometro.jp/lang_tcn/station/nihombashi/accessibility/' },
        { type: 'toilet', floor: 'Toei B1', operator: 'Toei', location: '茅場町方面驗票口附近', attributes: { wheelchair: true, hasWashlet: true }, source: 'https://www.kotsu.metro.tokyo.jp/subway/stations/nihombashi.html' },
        { type: 'locker', floor: 'Metro B1', operator: 'Metro', location: 'B0 出口向處 (高島屋方面)', attributes: { count: 40, sizes: ['S', 'M', 'L'] }, source: 'https://coin-locker.net/nihonbashi/' },
        { type: 'locker', floor: 'Toei B1', operator: 'Toei', location: '改札外 茅場町方面出口通路', attributes: { count: 20, sizes: ['S', 'M'] } },
        { type: 'elevator', floor: 'Metro GF', operator: 'Metro', location: 'B0 出口電梯', attributes: { wheelchair: true } },
        { type: 'elevator', floor: 'Toei GF', operator: 'Toei', location: 'D1 出口電梯', attributes: { wheelchair: true } },
        { type: 'wifi', floor: 'Metro/Toei', operator: 'Metro', location: '全站', attributes: { ssid: 'METRO_FREE_WiFi' } }
    ],
    'odpt:Station:TokyoMetro.Ueno': [
        { type: 'toilet', floor: 'Metro B1', operator: 'Metro', location: '銀座線 往JR方向驗票口內', attributes: { wheelchair: true, hasWashlet: true }, source: 'https://www.tokyometro.jp/lang_tcn/station/ueno/accessibility/' },
        { type: 'toilet', floor: 'Metro B1', operator: 'Metro', location: '日比谷線 電梯專用出口驗票口外', attributes: { wheelchair: true, hasWashlet: true }, source: 'https://www.tokyometro.jp/lang_tcn/station/ueno/accessibility/' },
        { type: 'toilet', floor: 'JR 3F', operator: 'JR', location: '大連絡橋通道', attributes: { wheelchair: true, hasWashlet: true }, source: 'https://www.jreast.co.jp/estation/stations/204.html' },
        { type: 'toilet', floor: 'JR 3F', operator: 'JR', location: 'ecute Ueno 內', attributes: { wheelchair: true, hasWashlet: true, hasBabyRoom: true, note: '含育嬰室' }, source: 'https://www.jreast.co.jp/estation/stations/204.html' },
        { type: 'locker', floor: 'JR 1F', operator: 'JR', location: '中央口改札外', attributes: { count: 300, sizes: ['S', 'M', 'L', 'XL'], note: '最大量置物櫃區' }, source: 'https://www.jreast.co.jp/estation/stations/204.html' },
        { type: 'locker', floor: 'Metro B1', operator: 'Metro', location: '不忍口改札外', attributes: { count: 80, sizes: ['S', 'M', 'L'] } },
        { type: 'elevator', floor: 'Metro B1', operator: 'Metro', location: '銀座線月台 → JR方向驗票口', attributes: { wheelchair: true }, source: 'https://www.tokyometro.jp/lang_tcn/station/ueno/accessibility/' },
        { type: 'elevator', floor: 'Metro B1', operator: 'Metro', location: '公園驗票口 → 5a出口', attributes: { wheelchair: true, note: '通往上野公園' }, source: 'https://www.tokyometro.jp/lang_tcn/station/ueno/accessibility/' },
        { type: 'wifi', floor: 'Metro 全層', operator: 'Metro', location: '改札內全區', attributes: { ssid: 'METRO_FREE_WiFi', note: '限時30分' } },
        { type: 'charging', floor: 'JR 3F', operator: 'JR', location: 'ecute Ueno 咖啡廳', attributes: { note: 'Type-A, Type-C 插座' } }
    ],
    'odpt:Station:TokyoMetro.Tokyo': [
        { type: 'toilet', floor: 'Metro B1', operator: 'Metro', location: '丸之內線 大手町方向驗票口外', attributes: { wheelchair: true, hasWashlet: true }, source: 'https://www.tokyometro.jp/lang_tcn/station/tokyo/accessibility/' },
        { type: 'toilet', floor: 'JR 1F', operator: 'JR', location: '丸之內南口改札內', attributes: { wheelchair: true, hasWashlet: true }, source: 'https://www.jreast.co.jp/estation/stations/1039.html' },
        { type: 'locker', floor: 'JR B1', operator: 'JR', location: '丸之內地下改札外', attributes: { count: 500, sizes: ['S', 'M', 'L', 'XL'], note: '最大置物櫃區' }, source: 'https://www.jreast.co.jp/estation/stations/1039.html' },
        { type: 'locker', floor: 'JR B1', operator: 'JR', location: '八重洲地下街', attributes: { count: 800, sizes: ['S', 'M', 'L', 'XL', 'XXL'], note: '超大型行李可' }, source: 'https://www.jreast.co.jp/estation/stations/1039.html' },
        { type: 'elevator', floor: 'Metro B1', operator: 'Metro', location: '丸之內線月台 → 驗票口', attributes: { wheelchair: true }, source: 'https://www.tokyometro.jp/lang_tcn/station/tokyo/accessibility/' },
        { type: 'elevator', floor: 'JR 1F', operator: 'JR', location: '丸之內北口 → B1', attributes: { wheelchair: true }, source: 'https://www.jreast.co.jp/estation/stations/1039.html' },
        { type: 'wifi', floor: 'JR 全層', operator: 'JR', location: '改札內外全站', attributes: { ssid: 'JR-EAST_FREE_WiFi', note: '需登錄' } },
        { type: 'charging', floor: 'JR 1F', operator: 'Private', location: 'KITTE 1F', attributes: { note: 'Type-A, Type-C, USB 免費' } }
    ],
    'odpt:Station:Toei.Asakusa.Asakusa': [
        { type: 'toilet', floor: 'Metro B1', operator: 'Metro', location: '銀座線 1號線月台終端', attributes: { wheelchair: true, hasWashlet: true }, source: 'https://www.tokyometro.jp/lang_tcn/station/asakusa/accessibility/' },
        { type: 'toilet', floor: 'Toei B1', operator: 'Toei', location: '都營淺草線 改札內', attributes: { wheelchair: true, hasWashlet: true } },
        { type: 'locker', floor: 'B1', operator: 'Metro', location: '銀座線改札外 (雷門方向)', attributes: { count: 80, sizes: ['S', 'M', 'L'] } },
        { type: 'locker', floor: '1F', operator: 'Private', location: '淺草文化觀光中心前', attributes: { count: 150, sizes: ['S', 'M', 'L', 'XL'], note: '大型行李推薦' } },
        { type: 'elevator', floor: 'Metro B1', operator: 'Metro', location: '淺草寺・雷門方向驗票口 → 1號出口', attributes: { wheelchair: true }, source: 'https://www.tokyometro.jp/lang_tcn/station/asakusa/accessibility/' },
        { type: 'elevator', floor: 'Toei B2', operator: 'Toei', location: '都營淺草線 → A2b出口 (駒形橋方向)', attributes: { wheelchair: true, note: '唯一直達電梯' }, source: 'https://www.kotsu.metro.tokyo.jp/subway/stations/asakusa.html' },
        { type: 'wifi', floor: 'Metro B1', operator: 'Metro', location: '銀座線改札內', attributes: { ssid: 'ASAKUSA_FREE_WiFi', note: '淺草觀光WiFi' } }
    ],
    'odpt:Station:Toei.Asakusa.Asakusabashi': [
        { type: 'toilet', floor: 'Toei B1', operator: 'Toei', location: '改札內', attributes: { wheelchair: true } },
        { type: 'locker', floor: 'B1', operator: 'Private', location: 'A3出口附近', attributes: { count: 50, sizes: ['S', 'M', 'L'] } },
        { type: 'elevator', floor: 'Toei B1', operator: 'Toei', location: 'A3出口', attributes: { wheelchair: true, note: '唯一電梯' } },
        { type: 'wifi', floor: 'Toei B1', operator: 'Toei', location: '改札內', attributes: { ssid: 'Toei_Free_Wi-Fi' } }
    ],
    'odpt:Station:TokyoMetro.Tawaramachi': [
        { type: 'toilet', floor: 'Metro B1', operator: 'Metro', location: '改札內', attributes: { wheelchair: true }, source: 'https://www.tokyometro.jp/lang_tcn/station/tawaramachi/accessibility/' },
        { type: 'elevator', floor: 'Metro B1', operator: 'Metro', location: '2號出口', attributes: { wheelchair: true, note: '合羽橋方向推薦' } },
        { type: 'wifi', floor: 'Metro B1', operator: 'Metro', location: '改札內', attributes: { ssid: 'METRO_FREE_WiFi' } }
    ],
    'odpt:Station:JR-East.Akihabara': [
        { type: 'toilet', floor: 'JR 1F', operator: 'JR', location: '電氣街口 改札內', attributes: { wheelchair: true, hasWashlet: true, note: '含人工肛門友善設施' }, source: 'https://www.jreast.co.jp/estation/stations/41.html' },
        { type: 'toilet', floor: 'JR 1F', operator: 'JR', location: '中央改札內', attributes: { wheelchair: true } },
        { type: 'locker', floor: 'JR 1F', operator: 'JR', location: '中央改札內', attributes: { count: 180, sizes: ['S', 'M', 'L', 'XL'] } },
        { type: 'elevator', floor: 'JR', operator: 'JR', location: '各月台 ⇄ 改札層', attributes: { wheelchair: true } },
        { type: 'wifi', floor: 'JR', operator: 'JR', location: '改札內', attributes: { ssid: 'JR-EAST_FREE_WiFi' } }
    ]
};

async function migrate() {
    console.log('Starting L3 Migration...');

    // We need to map ODPT IDs to internal IDs if necessary, or just use ODPT ID matching
    // Our nodes.ts strategy handles ODPT mapping, so if stations_static is keyed by station_id (which might be ODPT or internal)

    // Let's check stations_static keys via query
    const { data: sample } = await supabase.from('stations_static').select('station_id').limit(1);
    console.log('Sample Station ID in DB:', sample?.[0]?.station_id);

    // If DB uses internal IDs (e.g. "TokyoMetro.Ueno"), we need to strip 'odpt:Station:' prefix or map it.
    // Based on previous inspections, stations_static uses "odpt:Station:..." format?
    // Let's assume it does match the keys in WISDOM_DATA.

    for (const [id, facilities] of Object.entries(WISDOM_DATA)) {
        console.log(`Migrating ${id}... (${facilities.length} items)`);

        // Upsert
        const { error } = await supabase
            .from('stations_static')
            .update({
                l3_services: facilities,
                updated_at: new Date().toISOString()
            })
            .eq('station_id', id);

        if (error) {
            console.error(`Failed to update ${id}:`, error.message);
        } else {
            console.log(`✅ Updated ${id}`);
        }
    }

    console.log('Migration Complete.');
}

migrate();
