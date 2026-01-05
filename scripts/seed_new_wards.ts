/**
 * Seed new wards (Ota, Setagaya) into the database
 * and update Nerima to be inactive
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY are set.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface WardData {
    id: string;
    name_i18n: { ja: string; en: string; 'zh-TW': string };
    prefecture: string;
    ward_code: string;
    center_point: { lat: number; lng: number };
    boundary: { type: string; coordinates: number[][][] };
    is_active: boolean;
    priority_order: number;
}

const NEW_WARDS: WardData[] = [
    {
        id: 'ward:ota',
        name_i18n: { ja: '大田区', en: 'Ota', 'zh-TW': '大田區' },
        prefecture: 'Tokyo',
        ward_code: '13111',
        center_point: { lat: 35.5616, lng: 139.7161 },
        boundary: {
            type: 'Polygon',
            coordinates: [[[139.68, 35.52], [139.76, 35.52], [139.76, 35.60], [139.68, 35.60], [139.68, 35.52]]]
        },
        is_active: true,
        priority_order: 16
    },
    {
        id: 'ward:setagaya',
        name_i18n: { ja: '世田谷区', en: 'Setagaya', 'zh-TW': '世田谷區' },
        prefecture: 'Tokyo',
        ward_code: '13112',
        center_point: { lat: 35.6461, lng: 139.6532 },
        boundary: {
            type: 'Polygon',
            coordinates: [[[139.59, 35.62], [139.68, 35.62], [139.68, 35.68], [139.59, 35.68], [139.59, 35.62]]]
        },
        is_active: true,
        priority_order: 17
    }
];

async function main() {
    console.log('=== Seeding new wards ===');

    // 1. Upsert new wards
    for (const ward of NEW_WARDS) {
        const { error } = await supabase
            .from('wards')
            .upsert({
                id: ward.id,
                name_i18n: ward.name_i18n,
                prefecture: ward.prefecture,
                ward_code: ward.ward_code,
                center_point: `SRID=4326;POINT(${ward.center_point.lng} ${ward.center_point.lat})`,
                boundary: ward.boundary,
                is_active: ward.is_active,
                priority_order: ward.priority_order
            }, { onConflict: 'id' });

        if (error) {
            console.error(`Failed to upsert ${ward.id}:`, error.message);
        } else {
            console.log(`✅ Upserted ${ward.id} (${ward.name_i18n['zh-TW']})`);
        }
    }

    // 2. Deactivate Nerima
    const { error: nerimaError } = await supabase
        .from('wards')
        .update({ is_active: false })
        .eq('id', 'ward:nerima');

    if (nerimaError) {
        console.error('Failed to deactivate ward:nerima:', nerimaError.message);
    } else {
        console.log('✅ Deactivated ward:nerima (練馬區)');
    }

    console.log('\n=== Done! ===');
}

main().catch(console.error);
