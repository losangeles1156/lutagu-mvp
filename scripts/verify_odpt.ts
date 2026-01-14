import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const ODPT_API_URL = 'https://api-public.odpt.org/api/v4';
const ODPT_API_TOKEN = process.env.ODPT_API_TOKEN;

console.log('--- ODPT Verification Script ---');
if (ODPT_API_TOKEN) {
    console.log('Token found.');
} else {
    console.error('ERROR: ODPT_API_TOKEN is missing in .env.local');
    process.exit(1);
}

const ODPT_API_TOKEN_BACKUP = process.env.ODPT_API_TOKEN_BACKUP;

async function testToken(name: string, token: string | undefined) {
    if (!token) {
        console.log(`[${name}] Skipped (No token)`);
        return;
    }

    const params = new URLSearchParams();
    params.append('odpt:operator', 'odpt.Operator:Toei');
    params.append('acl:consumerKey', token);

    const url = `${ODPT_API_URL}/odpt:Railway?${params.toString()}`;
    console.log(`[${name}] Fetching...`);

    try {
        const res = await fetch(url);
        if (!res.ok) {
            console.log(`[${name}] Failed: ${res.status} ${res.statusText}`);
            return;
        }
        const data = await res.json();
        console.log(`[${name}] Success! Found ${data.length} railways.`);
    } catch (e: any) {
        console.log(`[${name}] Error: ${e.message}`);
    }
}

async function testNoToken() {
    const params = new URLSearchParams();
    params.append('odpt:operator', 'odpt.Operator:Toei');
    const url = `${ODPT_API_URL}/odpt:Railway?${params.toString()}`;
    console.log(`[No-Token] Fetching...`);
    try {
        const res = await fetch(url);
        if (!res.ok) {
            console.log(`[No-Token] Failed: ${res.status} ${res.statusText}`);
            return;
        }
        const data = await res.json();
        console.log(`[No-Token] Success! Found ${data.length} railways.`);
    } catch (e: any) {
        console.log(`[No-Token] Error: ${e.message}`);
    }
}

async function verify() {
    await testToken('Toei (Public, Token)', ODPT_API_TOKEN);
    await testToken('Toei (Public, Backup)', ODPT_API_TOKEN_BACKUP);
    await testNoToken();

    console.log('\n--- Testing Tokyo Metro (User Provided URL) ---');
    // Use environment variable for Metro token
    const metroToken = process.env.ODPT_METRO_TOKEN || process.env.ODPT_API_TOKEN || '';
    const metroUrl = `https://api.odpt.org/api/v4/odpt:Station?odpt:operator=odpt.Operator:TokyoMetro&acl:consumerKey=${metroToken}`;

    console.log(`[Metro] Fetching: ${metroUrl.replace(metroToken, '***')}`);
    try {
        const res = await fetch(metroUrl);
        if (!res.ok) {
            console.log(`[Metro] Failed: ${res.status} ${res.statusText}`);
        } else {
            const data = await res.json();
            console.log(`[Metro] Success! Found ${data.length} stations.`);
        }
    } catch (e: any) {
        console.log(`[Metro] Error: ${e.message}`);
    }

    console.log('\n--- Testing JR East (Challenge API) ---');
    // Use environment variable for JR token
    const jrToken = process.env.ODPT_JR_TOKEN || process.env.ODPT_API_TOKEN_BACKUP || '';
    const jrUrl = `https://api-challenge.odpt.org/api/v4/odpt:Station?odpt:operator=odpt.Operator:JR-East&acl:consumerKey=${jrToken}`;
    console.log(`[JR-East] Fetching: ${jrUrl.replace(jrToken, '***')}`);
    try {
        const res = await fetch(jrUrl);
        if (!res.ok) {
            console.log(`[JR-East] Failed: ${res.status} ${res.statusText}`);
        } else {
            const data = await res.json();
            console.log(`[JR-East] Success! Found ${data.length} stations.`);
        }
    } catch (e: any) {
        console.log(`[JR-East] Error: ${e.message}`);
    }

    console.log('\n--- Testing MIR (Tsukuba Express) ---');
    // MIR uses standard api.odpt.org with the Metro token (ntf1r...)
    const mirUrl = `https://api.odpt.org/api/v4/odpt:Station?odpt:operator=odpt.Operator:MIR&acl:consumerKey=${metroToken}`;
    console.log(`[MIR] Fetching: ${mirUrl.replace(metroToken, '***')}`);
    try {
        const res = await fetch(mirUrl);
        if (!res.ok) {
            console.log(`[MIR] Failed: ${res.status} ${res.statusText}`);
        } else {
            const data = await res.json();
            console.log(`[MIR] Success! Found ${data.length} stations.`);
        }
    } catch (e: any) {
        console.log(`[MIR] Error: ${e.message}`);
    }
}

verify();
