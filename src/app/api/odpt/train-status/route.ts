import { NextRequest, NextResponse } from 'next/server';

const ODPT_API_KEY = process.env.ODPT_API_KEY;

// Base URLs
const BASE_URL_STANDARD = 'https://api.odpt.org/api/v4';
const BASE_URL_CHALLENGE = 'https://api-tokyochallenge.odpt.org/api/v4';

// Operator ID Mapping (Internal -> ODPT)
const OPERATOR_MAP: Record<string, string> = {
    'TokyoMetro': 'odpt.Operator:TokyoMetro',
    'Toei': 'odpt.Operator:Toei',
    'JR-East': 'odpt.Operator:JR-East'
};

export async function GET(req: NextRequest) {
    if (!ODPT_API_KEY) {
        // Prevent functionality if key is missing to avoid errors
        return NextResponse.json({ error: 'Server configuration error: Missing ODPT Key' }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const operator = searchParams.get('operator'); // e.g., 'TokyoMetro'

    if (!operator || !OPERATOR_MAP[operator]) {
        return NextResponse.json({ error: 'Invalid or missing operator' }, { status: 400 });
    }

    const odptOperatorId = OPERATOR_MAP[operator];

    // Switch Base URL based on Operator
    // JR East usually resides on the Challenge API for detailed data, 
    // though sometimes available on standard. Safe bet is Challenge if key permits.
    // NOTE: If the user's key is NOT a challenge key, this might fail for JR. 
    // We assume the user has a key valid for the endpoint they need.
    const baseUrl = operator === 'JR-East' ? BASE_URL_CHALLENGE : BASE_URL_STANDARD;

    const apiUrl = `${baseUrl}/odpt:TrainInformation?odpt:operator=${odptOperatorId}&acl:consumerKey=${ODPT_API_KEY}`;

    try {
        const res = await fetch(apiUrl);

        if (!res.ok) {
            console.error(`ODPT API Error (${res.status}):`, await res.text());
            return NextResponse.json({ error: 'Failed to fetch upstream data' }, { status: res.status });
        }

        const data = await res.json();

        // Return raw array for now, let frontend process
        return NextResponse.json(data);

    } catch (error) {
        console.error('Proxy Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
