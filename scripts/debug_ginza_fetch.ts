
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const ODPT_API_URL = "https://api-challenge.odpt.org/api/v4/odpt:Station";
const ODPT_TOKEN = process.env.ODPT_API_TOKEN_CHALLENGE ||
    process.env.ODPT_API_TOKEN ||
    process.env.ODPT_AUTH_TOKEN ||
    process.env.NEXT_PUBLIC_ODPT_TOKEN;

async function fetchGinza() {
    const r = 'odpt.Railway:TokyoMetro.Ginza';
    const url = `${ODPT_API_URL}?odpt:railway=${r}&acl:consumerKey=${ODPT_TOKEN}&limit=1000`;
    console.log(`Fetching ${url}...`);

    const res = await fetch(url);
    if (!res.ok) {
        console.error(`Failed: ${res.status}`);
        return;
    }
    const data = await res.json();
    console.log(`Count: ${data.length}`);

    data.forEach((s: any) => {
        const title = s['odpt:stationTitle']?.en;
        console.log(`- ${title} (ID: ${s['owl:sameAs']})`);
        if (!title) console.log('  FULL:', JSON.stringify(s));
    });
}

fetchGinza();
