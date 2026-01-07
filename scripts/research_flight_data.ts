
import dotenv from 'dotenv';


dotenv.config({ path: '.env.local' });

const API_TOKEN = process.env.ODPT_API_TOKEN;
const BASE_URL = 'https://api-challenge.odpt.org/api/v4';

if (!API_TOKEN) {
    console.error('ODPT_API_TOKEN is missing');
    process.exit(1);
}

const endpoints = [
    {
        name: 'HND Flight Schedule',
        url: `${BASE_URL}/odpt:FlightSchedule?odpt:operator=odpt.Operator:HND-TIAT&acl:consumerKey=${API_TOKEN}`
    },
    {
        name: 'HND Realtime Departure',
        url: `${BASE_URL}/odpt:FlightInformationDeparture?odpt:operator=odpt.Operator:HND-TIAT&acl:consumerKey=${API_TOKEN}`
    },
    {
        name: 'HND Realtime Arrival',
        url: `${BASE_URL}/odpt:FlightInformationArrival?odpt:operator=odpt.Operator:HND-TIAT&acl:consumerKey=${API_TOKEN}`
    },
    {
        name: 'NRT Realtime Departure',
        url: `${BASE_URL}/odpt:FlightInformationDeparture?odpt:operator=odpt.Operator:NAA&acl:consumerKey=${API_TOKEN}`
    },
    {
        name: 'NRT Realtime Arrival',
        url: `${BASE_URL}/odpt:FlightInformationArrival?odpt:operator=odpt.Operator:NAA&acl:consumerKey=${API_TOKEN}`
    }
];

async function run() {
    console.log(`Using Token: ${API_TOKEN.slice(0, 5)}...`);

    for (const ep of endpoints) {
        console.log(`\n--- Fetching ${ep.name} ---`);
        try {
            const res = await fetch(ep.url);
            if (!res.ok) {
                console.error(`Error: ${res.status} ${res.statusText}`);
                const text = await res.text();
                console.error(text);
                continue;
            }
            const json = await res.json();
            if (Array.isArray(json)) {
                console.log(`Count: ${json.length}`);
                if (json.length > 0) {
                    console.log('First Item Structure:');
                    console.dir(json[0], { depth: null, colors: true });
                } else {
                    console.log('Empty Array returned.');
                }
            } else {
                console.log('Not an array?');
                console.dir(json, { depth: null });
            }
        } catch (e) {
            console.error('Fetch failed:', e);
        }
    }
}

run();
