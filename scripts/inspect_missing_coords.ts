
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
const ODPT_TOKEN = process.env.ODPT_API_TOKEN_CHALLENGE || process.env.ODPT_API_TOKEN;

async function main() {
    // Target a specific station known to fail: Toei Oedo Higashi-Nakano
    const stationId = 'odpt.Station:Toei.Oedo.HigashiNakano';
    const url = `https://api-challenge.odpt.org/api/v4/odpt:Station?owl:sameAs=${stationId}&acl:consumerKey=${ODPT_TOKEN}`;

    console.log(`Fetching ${url}...`);
    const res = await fetch(url);
    if (!res.ok) {
        console.error('Failed:', res.status, res.statusText);
        return;
    }

    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
        console.log(JSON.stringify(data[0], null, 2));
    } else {
        console.log('No data found for this station ID.');

        // Try fetching generic Toei stations to see if ANY have coords
        console.log('Fetching any Toei Oedo station...');
        const url2 = `https://api-challenge.odpt.org/api/v4/odpt:Station?odpt:railway=odpt.Railway:Toei.Oedo&acl:consumerKey=${ODPT_TOKEN}&limit=1`;
        const res2 = await fetch(url2);
        const data2 = await res2.json();
        console.log(JSON.stringify(data2[0], null, 2));
    }
}

main();
