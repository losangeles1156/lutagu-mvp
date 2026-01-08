import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const ODPT_TOKEN = process.env.ODPT_API_TOKEN ||
    process.env.ODPT_API_TOKEN_CHALLENGE ||
    process.env.ODPT_AUTH_TOKEN ||
    process.env.NEXT_PUBLIC_ODPT_TOKEN;

async function checkStation() {
    if (!ODPT_TOKEN) {
        console.error('No token found');
        return;
    }
    const url = `https://api.odpt.org/api/v4/odpt:Station?owl:sameAs=odpt.Station:TokyoMetro.Ginza.Ginza&acl:consumerKey=${ODPT_TOKEN}`;
    console.log(`Fetching Ginza (Prod)... Token len: ${ODPT_TOKEN.length}`);
    const res = await fetch(url);
    if (!res.ok) {
        console.error('Fetch failed:', res.status, res.statusText);
        return;
    }
    const stations = await res.json();
    console.log(`Fetch count: ${stations.length}`);

    if (stations.length > 0) {
        console.log('Sample Station:', JSON.stringify(stations[0], null, 2));
    }

    // Check included railways
    const railways = new Set(stations.map((s: any) => s['odpt:railway']));
    console.log('Railways found:', Array.from(railways));

    // Check Ginza (G09 / M16 / H08)
    const ginza = stations.filter((s: any) => s['odpt:stationTitle']?.en?.includes('Ginza'));
    console.log('Ginza stations found:', ginza.length);
    ginza.forEach((s: any) => {
        console.log(`ID: ${s['owl:sameAs']}`);
        console.log(`Lat/Lon: ${s['geo:lat']}, ${s['geo:long']}`);
    });
}
checkStation();
type SimpleStation = any;
