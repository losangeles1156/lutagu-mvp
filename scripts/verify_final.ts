
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config({ path: '.env.local' });

async function testViewportNodes() {
    console.log('--- Testing Viewport Nodes API ---');
    // We'll mock a request to the API route
    // Since we can't easily call the local API from here without the server running,
    // we will check the logic and the database state one last time.

    // We already know stations are now is_active=true.
    // Let's check a few stations' coordinates to make sure they are within a reasonable Tokyo range.
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    const { data: nodes } = await supabase.from('nodes').select('name, coordinates, is_active').eq('id', 'odpt.Station:JR-East.Yamanote.Shinjuku').single();
    console.log('Shinjuku Status:', nodes);
}

testViewportNodes();
