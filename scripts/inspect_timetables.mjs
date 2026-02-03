#!/usr/bin/env node

/**
 * Query Supabase static_timetables to verify data structure
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectTimetableData() {
    console.log('📊 Querying static_timetables...\n');

    // Get first row
    const { data, error } = await supabase
        .from('static_timetables')
        .select('*')
        .limit(1);

    if (error) {
        console.error('❌ Query failed:', error.message);
        process.exit(1);
    }

    if (!data || data.length === 0) {
        console.log('⚠️  No data found in static_timetables table.');
        console.log('📌 Table may be empty. Check if migration script has been run.');
        process.exit(0);
    }

    const sample = data[0];
    console.log('✅ Found sample data:\n');
    console.log('Station ID:', sample.station_id);
    console.log('Updated At:', sample.updated_at);
    console.log('\n📋 Data Structure:');
    console.log(JSON.stringify(sample.data, null, 2));

    // Analyze structure
    console.log('\n🔍 Structure Analysis:');
    if (sample.data) {
        const keys = Object.keys(sample.data);
        console.log('Top-level keys:', keys.join(', '));

        keys.forEach(key => {
            const value = sample.data[key];
            console.log(`\n  ${key}:`);
            if (Array.isArray(value)) {
                console.log(`    Type: Array (${value.length} items)`);
                if (value.length > 0) {
                    console.log(`    Sample: ${typeof value[0] === 'object' ? JSON.stringify(value[0]) : value[0]}`);
                }
            } else if (typeof value === 'object') {
                console.log(`    Type: Object`);
                console.log(`    Keys: ${Object.keys(value).join(', ')}`);
            } else {
                console.log(`    Type: ${typeof value}`);
                console.log(`    Value: ${value}`);
            }
        });
    }

    // Get count
    const { count } = await supabase
        .from('static_timetables')
        .select('*', { count: 'exact', head: true });

    console.log(`\n📊 Total stations with timetable data: ${count}`);
}

inspectTimetableData().catch(console.error);
