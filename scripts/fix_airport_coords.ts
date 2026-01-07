
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

const TERMINAL_MAP: Record<string, { lat: number, lng: number }> = {
    // Narita
    'NRT_T1': { lat: 35.764, lng: 140.386 },
    'NRT_T2': { lat: 35.773, lng: 140.388 },
    'NRT_T3': { lat: 35.780, lng: 140.383 },
    'NRT_CENTER': { lat: 35.771, lng: 140.392 },

    // Haneda
    'HND_T1': { lat: 35.548, lng: 139.785 },
    'HND_T2': { lat: 35.549, lng: 139.790 },
    'HND_T3': { lat: 35.544, lng: 139.768 },
    'HND_CENTER': { lat: 35.549, lng: 139.780 }
};

function getJitter() {
    // +/- 0.0004 is roughly 30-40 meters
    return (Math.random() - 0.5) * 0.0008;
}

function detectTerminal(text: string, airport: 'NRT' | 'HND'): string {
    const t = (text || '').toLowerCase();

    if (airport === 'NRT') {
        if (t.includes('terminal 1') || t.includes('t1') || t.includes('第1')) return 'NRT_T1';
        if (t.includes('terminal 2') || t.includes('t2') || t.includes('第2')) return 'NRT_T2';
        if (t.includes('terminal 3') || t.includes('t3') || t.includes('第3')) return 'NRT_T3';
        return 'NRT_CENTER';
    } else {
        if (t.includes('terminal 1') || t.includes('t1') || t.includes('第1')) return 'HND_T1';
        if (t.includes('terminal 2') || t.includes('t2') || t.includes('第2')) return 'HND_T2';
        if (t.includes('terminal 3') || t.includes('t3') || t.includes('第3')) return 'HND_T3';
        return 'HND_CENTER';
    }
}

async function fixL1Places(stationId: string, airport: 'NRT' | 'HND') {
    console.log(`Fixing L1 Places for ${airport}...`);
    const { data: places, error } = await supabase
        .from('l1_places')
        .select('*')
        .eq('station_id', stationId);

    if (error || !places) {
        console.error('Fetch Error:', error);
        return;
    }

    let updatedCount = 0;

    for (const place of places) {
        const rawLoc = place.tags?.raw_location || place.tags?.terminal || '';
        const terminalKey = detectTerminal(rawLoc, airport);
        const center = TERMINAL_MAP[terminalKey];

        const newLat = center.lat + getJitter();
        const newLng = center.lng + getJitter();
        const newLocation = `POINT(${newLng} ${newLat})`;

        const { error: updateError } = await supabase
            .from('l1_places')
            .update({
                lat: newLat,
                lng: newLng,
                location: newLocation
            })
            .eq('id', place.id);

        if (!updateError) updatedCount++;
    }

    console.log(`Updated ${updatedCount} L1 places for ${airport}.`);
}

async function fixL3Services(stationId: string, airport: 'NRT' | 'HND') {
    console.log(`Fixing L3 Services for ${airport}...`);
    const { data: rows, error } = await supabase
        .from('stations_static')
        .select('*')
        .eq('id', stationId);

    if (error || !rows || rows.length === 0) {
        console.log('No L3 data found.');
        return;
    }

    const row = rows[0];
    const services = row.l3_services || [];
    let changed = false;

    const newServices = services.map((s: any) => {
        const rawLoc = s.location || '';
        const terminalKey = detectTerminal(rawLoc, airport);
        const center = TERMINAL_MAP[terminalKey];

        // Always overwrite or add coordinates
        const newLat = center.lat + getJitter();
        const newLng = center.lng + getJitter();

        changed = true;
        return {
            ...s,
            coordinates: { lat: newLat, lng: newLng }
        };
    });

    if (changed) {
        const { error: upError } = await supabase
            .from('stations_static')
            .update({ l3_services: newServices })
            .eq('id', stationId);

        if (upError) console.error('L3 Update Error:', upError);
        else console.log(`Updated L3 services for ${airport}.`);
    }
}

async function main() {
    await fixL1Places('odpt:Station:Airport.Narita', 'NRT');
    await fixL3Services('odpt:Station:Airport.Narita', 'NRT');

    await fixL1Places('odpt:Station:Airport.Haneda', 'HND');
    await fixL3Services('odpt:Station:Airport.Haneda', 'HND');
}

main().catch(console.error);
