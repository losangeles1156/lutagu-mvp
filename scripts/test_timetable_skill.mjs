#!/usr/bin/env node

/**
 * Simple test to verify TimetableSkill can query Supabase correctly
 */

import { TimetableSkill } from '../src/lib/l4/skills/implementations.js';

const testStationId = 'odpt.Station:Keikyu.Airport.Shinagawa'; // Known working station from our earlier query

async function testTimetableSkill() {
    console.log('🧪 Testing TimetableSkill...\n');

    const skill = new TimetableSkill();

    // Mock context
    const context = {
        currentStation: testStationId,
        nodeContext: {
            primaryNodeId: testStationId,
            intent: 'timetable'
        }
    };

    console.log(`📍 Station ID: ${testStationId}`);
    console.log(`📅 Current Day: ${new Date().toLocaleDateString('zh-TW', { weekday: 'long' })}\n`);

    try {
        const result = await skill.execute('時刻表', context as any, {});

        console.log('✅ Skill execution successful!\n');
        console.log('📊 Result:', JSON.stringify(result, null, 2));

        if (result?.data?.timetables && result.data.timetables.length > 0) {
            console.log(`\n📈 Found ${result.data.timetables.length} timetable(s) for calendar type: ${result.data.calendarType}`);

            // Show first few departures
            const firstTimetable = result.data.timetables[0];
            const departures = firstTimetable['odpt:stationTimetableObject'] || [];
            console.log(`\n⏰ Sample departures (first 5):`);
            departures.slice(0, 5).forEach((dep: any, i: number) => {
                console.log(`  ${i + 1}. ${dep['odpt:departureTime']} - ${dep['odpt:trainType']?.split(':').pop() || 'Unknown'}`);
            });
        }

    } catch (error: any) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

testTimetableSkill();
