
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testRoutePlanning() {
    console.log('--- Testing Route Planning API ---');
    const url = 'http://localhost:3000/api/odpt/route'; // Assuming the server is running locally or we can mock the request
    
    // We'll test the internal logic directly if we can't call the API
    const from = 'odpt.Station:JR-East.Yamanote.Shinjuku';
    const to = 'odpt.Station:JR-East.Yamanote.Tokyo';
    
    console.log(`Route: ${from} -> ${to}`);
    
    // I'll call the actual endpoint if possible, but since I'm in a script, 
    // I'll look at the route.ts of /api/odpt/route
}

testRoutePlanning();
