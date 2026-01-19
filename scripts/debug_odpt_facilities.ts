
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const ODPT_CHALLENGE = 'https://api-challenge.odpt.org/api/v4';
const TOKEN_CHALLENGE = process.env.ODPT_API_TOKEN_BACKUP || process.env.ODPT_AUTH_TOKEN;

async function main() {
    console.log('Fetching JR East Ueno info from ODPT Challenge API...');

    if (!TOKEN_CHALLENGE) {
        console.error('No ODPT Token found!');
        return;
    }

    const stationId = 'odpt.Station:JR-East.Yamanote.Ueno'; // ID might vary, try generic
    // Actually, JR IDs are like "odpt.Station:JR-East.Yamanote.Ueno"

    const url = `${ODPT_CHALLENGE}/odpt:Station?odpt:operator=odpt.Operator:JR-East&acl:consumerKey=${TOKEN_CHALLENGE}`;

    try {
        const res = await fetch(url);
        if (!res.ok) {
            console.error(`Error ${res.status}: ${res.statusText}`);
            return;
        }
        const data = await res.json();
        console.log(`Found ${data.length} stations.`);

        const ueno = data.find((s: any) => s['odpt:stationTitle']?.en === 'Ueno' || s['dc:title'] === 'Ueno');
        if (ueno) {
            console.log('Ueno Data:', JSON.stringify(ueno, null, 2));
        } else {
            console.log('Ueno not found in list.');
            if (data.length > 0) console.log('Sample:', JSON.stringify(data[0], null, 2));
        }

    } catch (e) {
        console.error(e);
    }
}

main();
