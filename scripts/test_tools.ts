
import { FareTool, TimetableTool, FacilityTool } from '../src/lib/agent/tools/standardTools';
import { IToolContext } from '../src/lib/agent/tools/types';
import { AgentLevel } from '../src/lib/agent/core/types';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testTools() {
    console.log('--- Testing Agent Tools ---');

    const context: IToolContext = {
        nodeId: 'odpt:Station:JR-East.Ueno',
        level: AgentLevel.L4_STRATEGY
    };

    // 1. Test Facility Tool (L3)
    console.log('\nTesting FacilityTool...');
    const facilityTool = new FacilityTool();
    const facilityResult = await facilityTool.execute({ category: 'toilet' }, context);
    console.log('Facility Result:', JSON.stringify(facilityResult, null, 2).slice(0, 500) + '...');

    // 2. Test Timetable Tool (L2) - Using Toei (Public API, no token needed)
    console.log('\nTesting TimetableTool (Toei)...');
    const timetableTool = new TimetableTool();
    const timetableResult = await timetableTool.execute({
        station: 'odpt.Station:Toei.Oedo.UenoOkachimachi',
        operator: 'odpt.Operator:Toei'
    }, context);
    console.log('Timetable Result:', JSON.stringify(timetableResult, null, 2).slice(0, 500) + '...');

    // 3. Test Fare Tool (L2) - Using Toei (Public API)
    console.log('\nTesting FareTool (Toei)...');
    const fareTool = new FareTool();
    const fareResult = await fareTool.execute({
        from: 'odpt.Station:Toei.Oedo.UenoOkachimachi',
        to: 'odpt.Station:Toei.Oedo.Ryogoku'
    }, context);
    console.log('Fare Result:', JSON.stringify(fareResult, null, 2).slice(0, 500) + '...');
}

testTools();
