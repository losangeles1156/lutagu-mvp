
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const ODPT_API_URL = "https://api.odpt.org/api/v4/odpt:Station";
const ODPT_TOKEN = process.env.ODPT_AUTH_TOKEN ||
                   process.env.NEXT_PUBLIC_ODPT_TOKEN ||
                   process.env.ODPT_API_TOKEN ||
                   process.env.ODPT_API_TOKEN_BACKUP;

async function inspectJr() {
    // Fetch specifically JR Tokyo Station
    const url = `${ODPT_API_URL}?owl:sameAs=odpt.Station:JR-East.Yamanote.Tokyo&acl:consumerKey=${ODPT_TOKEN}`;
    console.log(`Fetching ${url}...`);
    const res = await fetch(url);
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
}

inspectJr();
