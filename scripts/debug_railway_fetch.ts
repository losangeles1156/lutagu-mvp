
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const ODPT_API_URL = "https://api-challenge.odpt.org/api/v4/odpt:Railway";
const ODPT_TOKEN = process.env.ODPT_API_TOKEN_CHALLENGE ||
    process.env.ODPT_API_TOKEN ||
    process.env.ODPT_AUTH_TOKEN ||
    process.env.NEXT_PUBLIC_ODPT_TOKEN;

async function fetchRailway() {
    const r = 'odpt.Railway:TokyoMetro.Ginza';
    const url = `${ODPT_API_URL}?owl:sameAs=${r}&acl:consumerKey=${ODPT_TOKEN}`;
    console.log(`Fetching ${url}...`);

    const res = await fetch(url);
    if (!res.ok) {
        console.error(`Failed: ${res.status}`);
        return;
    }
    const data = await res.json();
    console.log(`Count: ${data.length}`);

    if (data.length > 0) {
        const railway = data[0];
        console.log('Station Order:', JSON.stringify(railway['odpt:stationOrder'], null, 2));
    }
}

fetchRailway();
