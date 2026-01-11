
const TOKEN_STANDARD = process.env.ODPT_API_KEY || process.env.ODPT_API_TOKEN || process.env.ODPT_API_KEY_PUBLIC;
const TOKEN_CHALLENGE = process.env.ODPT_API_TOKEN_BACKUP || process.env.ODPT_API_KEY || process.env.ODPT_API_KEY_CHALLENGE2025;

// Base URLs
const BASE_URL_STANDARD = 'https://api.odpt.org/api/v4';
const BASE_URL_CHALLENGE = 'https://api-challenge.odpt.org/api/v4';

const OPERATOR_MAP: Record<string, string[]> = {
    'TokyoMetro': ['odpt.Operator:TokyoMetro'],
    'Toei': ['odpt.Operator:Toei'],
    'JR-East': ['odpt.Operator:JR-East', 'odpt.Operator:jre-is'],
    'Keikyu': ['odpt.Operator:Keikyu'],
    'Seibu': ['odpt.Operator:Seibu'],
    'Tobu': ['odpt.Operator:Tobu'],
    'Tokyu': ['odpt.Operator:Tokyu'],
    'TWR': ['odpt.Operator:TWR'],
    'MIR': ['odpt.Operator:MIR']
};

async function fetchForOperator(key: string, ids: string[]) {
    // Challenge API operators
    const challengeOperators = ['JR-East', 'Keikyu', 'Seibu', 'Tobu', 'Tokyu'];
    const baseUrl = challengeOperators.includes(key) ? BASE_URL_CHALLENGE : BASE_URL_STANDARD;
    const token = challengeOperators.includes(key) ? TOKEN_CHALLENGE : TOKEN_STANDARD;
    if (!token) return [];

    const fetchPromises = ids.map(async (id) => {
        const odptSearchParams = new URLSearchParams({
            'odpt:operator': id,
            'acl:consumerKey': token
        });
        const apiUrl = `${baseUrl}/odpt:TrainInformation?${odptSearchParams.toString()}`;

        try {
            const res = await fetch(apiUrl, { next: { revalidate: 60 } }); // Cache 60s
            if (!res.ok) return [];
            return await res.json();
        } catch (e) {
            console.error(`Fetch failed for ${key} (ID: ${id})`, e);
            return [];
        }
    });

    const results = await Promise.all(fetchPromises);
    return results.flat();
}

export async function getTrainStatus(operator?: string) {
    if (!TOKEN_STANDARD && !TOKEN_CHALLENGE) {
        throw new Error('Missing ODPT API Key');
    }

    let results = [];

    if (operator && OPERATOR_MAP[operator]) {
        // Single Operator
        results = await fetchForOperator(operator, OPERATOR_MAP[operator]);
    } else {
        // Fetch All
        const promises = Object.entries(OPERATOR_MAP).map(([key, ids]) => fetchForOperator(key, ids));
        const allData = await Promise.all(promises);
        results = allData.flat();
    }

    return results;
}
