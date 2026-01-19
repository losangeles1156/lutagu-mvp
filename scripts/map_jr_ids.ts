
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

const OUTPUT_FILE = path.resolve(process.cwd(), 'scripts/data/jr_station_ids.json');

const STATIONS = [
    // Yamanote
    'Tokyo', 'Kanda', 'Akihabara', 'Okachimachi', 'Ueno', 'Uguisudani', 'Nippori', 'Nishi-Nippori',
    'Tabata', 'Komagome', 'Sugamo', 'Otsuka', 'Ikebukuro', 'Mejiro', 'Takadanobaba', 'Shin-Okubo',
    'Shinjuku', 'Yoyogi', 'Harajuku', 'Shibuya', 'Ebisu', 'Meguro', 'Gotanda', 'Osaki', 'Shinagawa',
    'Takanawa Gateway', 'Tamachi', 'Hamamatsucho', 'Shimbashi', 'Yurakucho',
    // Chuo-Sobu (Local)
    'Ochanomizu', 'Suidobashi', 'Iidabashi', 'Ichigaya', 'Yotsuya', 'Shinanomachi', 'Sendagaya',
    'Okubo', 'Higashi-Nakano', 'Nakano',
    // Sobu (Rapid/Local)
    'Shin-Nihombashi', 'Bakurocho', 'Kinshicho', 'Kameido', 'Ryogoku', 'Asakusabashi'
];

async function main() {
    console.log('Mapping JR East Station IDs via Search...');

    const stationMap: Record<string, string> = {}; // Name -> ID

    // Ensure directory exists
    const dir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // Load existing if any
    if (fs.existsSync(OUTPUT_FILE)) {
        try {
            const existing = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
            Object.assign(stationMap, existing);
            console.log(`Loaded ${Object.keys(stationMap).length} existing IDs.`);
        } catch (e) {
            console.warn('Failed to load existing map.');
        }
    }

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    for (const name of STATIONS) {
        if (stationMap[name] || stationMap[name.toLowerCase()]) {
            console.log(`Skipping ${name} (Already mapped)`);
            continue;
        }

        const query = `site:jreast.co.jp/estation/stations/ "${name}"`;
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

        process.stdout.write(`Searching for ${name}... `);

        try {
            await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

            // Extract links
            const hrefs = await page.$$eval('a', as => as.map(a => a.href));

            let foundId = null;
            for (const href of hrefs) {
                const match = href.match(/jreast\.co\.jp\/estation\/stations\/(\d+)\.html/);
                if (match) {
                    foundId = match[1];
                    break;
                }
            }

            if (foundId) {
                console.log(`Found: ${foundId}`);
                stationMap[name] = foundId;
            } else {
                console.log('Not found');
            }

            // Random delay to avoid block
            await new Promise(r => setTimeout(r, 2000 + Math.random() * 2000));

        } catch (e) {
            console.error(`\nError searching ${name}:`, e);
        }

        // Save periodically
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(stationMap, null, 2));
    }

    await browser.close();
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(stationMap, null, 2));
    console.log(`\nDone. Saved ${Object.keys(stationMap).length} station IDs to ${OUTPUT_FILE}`);
}

main();
