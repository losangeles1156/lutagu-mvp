
const testYahooData = {
    lines: [
        '<tr><td><a href="...">山手線</a></td><td class="exp">平常運転</td></tr>',
        '<tr><td><a href="...">成田エクスプレス</a></td><td class="trouble"><td class="exp">強風の影響で遅延が出ています。</td></td></tr>'
    ]
};

const testODPTData = [
    {
        'owl:sameAs': 'odpt.Railway:JR-East.ChuoQuick',
        'odpt:operator': 'odpt.Operator:JR-East',
        'odpt:railway': 'odpt.Railway:JR-East.ChuoQuick',
        'odpt:trainInformationStatus': { ja: '遅延' },
        'odpt:trainInformationText': { ja: '人身事故の影響で遅延しています。' },
        'dc:date': '2026-01-12T10:00:00Z'
    }
];

function yahooTransform(items) {
    const results = [];
    for (const item of items) {
        const lines = item.lines;
        if (!lines) continue;
        for (const html of lines) {
            const nameMatch = html.match(/<a[^>]*>([^<]+)<\/a>/);
            if (nameMatch) {
                const name = nameMatch[1];
                let status = "平常運転";
                let detail = "";
                if (html.includes('trouble')) {
                    const tdExp = html.match(/<td class="exp">([^<]+)<\/td>/);
                    status = "遅延・運休";
                    detail = tdExp ? tdExp[1] : "";
                }
                if (status !== "平常運転") {
                    results.push({
                        id: `yahoo:${name}`,
                        source: 'Yahoo',
                        railway: name,
                        status: status,
                        message: detail,
                        updated_at: new Date().toISOString()
                    });
                }
            }
        }
    }
    return results;
}

function odptTransform(data) {
    const results = [];
    if (Array.isArray(data)) {
        for (const alert of data) {
            results.push({
                id: alert['owl:sameAs'],
                source: 'ODPT',
                operator: alert['odpt:operator'],
                railway: alert['odpt:railway'],
                status: alert['odpt:trainInformationStatus']?.ja || 'Unknown',
                message: alert['odpt:trainInformationText']?.ja || '',
                updated_at: alert['dc:date'] || new Date().toISOString()
            });
        }
    }
    return results;
}

console.log('--- Testing Yahoo Transformation Logic ---');
const yahooResult = yahooTransform([testYahooData]);
console.log(JSON.stringify(yahooResult, null, 2));

console.log('\n--- Testing ODPT Transformation Logic ---');
const odptResult = odptTransform(testODPTData);
console.log(JSON.stringify(odptResult, null, 2));

if (yahooResult.length > 0 && yahooResult[0].railway === '成田エクスプレス') {
    console.log('\n✅ Yahoo Logic Verified: Corrected delay detected for Narita Express!');
}
if (odptResult.length > 0 && odptResult[0].status === '遅延') {
    console.log('✅ ODPT Logic Verified: Corrected delay detected for Chuo Line!');
}
