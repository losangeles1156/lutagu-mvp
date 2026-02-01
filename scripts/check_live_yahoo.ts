
async function checkYahoo() {
    console.log('Fetching live Yahoo Japan Transit info (Kanto Area)...');
    try {
        const response = await fetch('https://transit.yahoo.co.jp/diainfo/area/4');
        const html = await response.text();

        // Very basic extraction of lines with trouble
        const troubleLines = html.match(/<a[^>]*>([^<]+)<\/a>[^<]*<span class="icnTrouble">/g);

        if (troubleLines) {
            console.log(`Found ${troubleLines.length} lines with issues on Yahoo Japan:`);
            troubleLines.forEach((line: string) => {
                const nameMatch = line.match(/>([^<]+)</);
                if (nameMatch) {
                    console.log(`- ${nameMatch[1]}`);
                }
            });
        } else {
            console.log('No issues found on Yahoo Japan (All lines NORMAL).');
        }
    } catch (e: any) {
        console.error('Failed to fetch Yahoo Japan data:', e.message);
    }
}

checkYahoo();
