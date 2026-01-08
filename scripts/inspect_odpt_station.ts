
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
const ODPT_TOKEN = process.env.ODPT_API_TOKEN_CHALLENGE || process.env.ODPT_API_TOKEN;

async function main() {
    const url = `https://api-challenge.odpt.org/api/v4/odpt:Railway?acl:consumerKey=${ODPT_TOKEN}&limit=5`;
    const res = await fetch(url);
    const data = await res.json();
    console.log('Result Length:', data.length);
    console.log('First Item:', JSON.stringify(data[0], null, 2));
}

main();
