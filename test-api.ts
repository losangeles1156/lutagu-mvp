import { GET } from './src/app/api/odpt/route/route';
import { NextRequest } from 'next/server';

async function testApi() {
    console.log('Testing API with names: 蔵前 -> 新宿');
    const req1 = new NextRequest('http://localhost/api/odpt/route?from=蔵前&to=新宿');
    const res1 = await GET(req1);
    const body1 = await res1.json();
    console.log('Status:', res1.status);
    if (body1.routes && body1.routes.length > 0) {
        console.log('Found', body1.routes.length, 'routes');
        console.log('First route label:', body1.routes[0].label);
        body1.routes[0].steps.forEach((s: any) => console.log(' -', s.text));
    } else {
        console.log('No routes found or error:', body1.error);
    }

    console.log('\nTesting API with names: 東京 -> 新宿');
    const req2 = new NextRequest('http://localhost/api/odpt/route?from=東京&to=新宿');
    const res2 = await GET(req2);
    const body2 = await res2.json();
    console.log('Status:', res2.status);
    if (body2.routes && body2.routes.length > 0) {
        console.log('Found', body2.routes.length, 'routes');
        console.log('First route label:', body2.routes[0].label);
        body2.routes[0].steps.forEach((s: any) => console.log(' -', s.text));
    } else {
        console.log('No routes found or error:', body2.error);
    }
}

testApi().catch(console.error);
