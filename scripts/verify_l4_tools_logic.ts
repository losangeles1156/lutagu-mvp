
import { TOOL_HANDLERS } from '../src/lib/agent/toolDefinitions';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function verifyTools() {
    console.log('🔍 Verifying L4 Tools Logic...');

    const context = { locale: 'zh-TW' };

    // 1. Test get_fare
    console.log('\n--- Testing get_fare ---');
    try {
        const fareResult = await TOOL_HANDLERS.get_fare({
            fromStation: 'odpt.Station:TokyoMetro.Ginza.Ueno',
            toStation: 'odpt.Station:TokyoMetro.Ginza.Asakusa'
        }, context);
        console.log('Result:', fareResult);
    } catch (e) {
        console.error('get_fare failed:', e);
    }

    // 2. Test get_timetable
    console.log('\n--- Testing get_timetable ---');
    try {
        const timetableResult = await TOOL_HANDLERS.get_timetable({
            stationId: 'odpt.Station:TokyoMetro.Ginza.Ueno'
        }, context);
        console.log('Result:', timetableResult ? timetableResult.substring(0, 100) + '...' : 'No result');
    } catch (e) {
        console.error('get_timetable failed:', e);
    }

    // 3. Test get_route
    console.log('\n--- Testing get_route ---');
    try {
        const routeResult = await TOOL_HANDLERS.get_route({
            fromStation: 'odpt.Station:TokyoMetro.Ginza.Ueno',
            toStation: 'odpt.Station:JR-East.Yamanote.Shinjuku'
        }, context);
        console.log('Result:', routeResult);
    } catch (e) {
        console.error('get_route failed:', e);
    }
}

verifyTools();
