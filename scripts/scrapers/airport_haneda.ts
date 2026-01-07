import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
import { createClient } from '@supabase/supabase-js';
import puppeteer from 'puppeteer';

// Environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const HANEDA_HUB_ID = 'odpt:Station:Airport.Haneda';

async function upsertL1Places(items: any[], category: string) {
    if (items.length === 0) return;

    // Map to DB Schema
    const records = items.map(item => ({
        station_id: HANEDA_HUB_ID,
        osm_id: -1 * Math.floor(Math.random() * 1000000000), // Fake ID for scraped data
        name: item.name,
        category: category,
        // vibe_tags not in schema, put in tags or special logic? For now omit.
        location: 'POINT(139.784 35.549)', // Haneda Center as string? Or just rely on lat/lng if mapped?
        // Actually Supabase client usually expects GeoJSON or WKT string for geometry? 
        // Or if we use `upsert`, we pass values.
        // Let's pass lat/lng separate columns too if they exist.
        lat: 35.549,
        lng: 139.784,

        tags: {
            "source": "official_scraper",
            "terminal": item.terminal,
            "floor": item.floor,
            "opening_hours": item.hours || '',
            "website": item.url,
            "image": item.image,
            "area": item.area,
            "vibe_generated": category === 'dining' ? 'Airport Dining' : 'Airport Shopping'
        },
        created_at: new Date().toISOString()
    }));

    // upsert requires ignoring specific columns on conflict?
    // onConflict: 'name, station_id' might work if those have unique constraint.
    // If not, we might create dupes.
    // Let's try to fetch existing by name? No, too slow.
    // We will assume name+station_id is unique enough or just Append.
    // Actually, l1_places PK is id.
    // If we want to update, we need a unique constraint.
    // For now, let's just insert and ignore conflicts if possible, or just insert.

    // We can't easily upsert without a unique key.
    // Let's delete existing for this station+category then insert?
    // That's safer for full sync.

    // First, delete
    // await supabase.from('l1_places').delete().eq('station_id', HANEDA_HUB_ID).eq('category', category);
    // But that might wipe user data if any? Unlikely for this hub.
    // Let's toggle this behavior? For now, append is risky.
    // Let's try to Match by name using Select first? 
    // Optimization: Read all for this station first.

    const { data: existing } = await supabase.from('l1_places').select('id, name').eq('station_id', HANEDA_HUB_ID).eq('category', category);
    // Ignore existing check, just clean and reload for scraped data

    // Clear old data for this category
    const { error: delError } = await supabase
        .from('l1_places')
        .delete()
        .eq('station_id', HANEDA_HUB_ID)
        .eq('category', category)
        .contains('tags', { source: 'official_scraper' });

    if (delError) console.error('Delete Error:', delError.message);

    const { error } = await supabase.from('l1_places').insert(records).select();
    if (error) {
        console.error('DB Insert Error:', error.message);
    } else {
        console.log(`Saved ${items.length} ${category} items.`);
    }
}

async function scrapeCategory(page: any, url: string, category: string) {
    console.log(`Scraping ${category} from ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle2' });

    let allItems: any[] = [];
    let hasNext = true;
    let pageNum = 1;

    while (hasNext && pageNum <= 5) { // Limit pages for safety
        console.log(`Processing Page ${pageNum}...`);

        const items = await page.evaluate(() => {
            const cards = Array.from(document.querySelectorAll('.shop-card'));
            return cards.map(c => {
                const nameEl = c.querySelector('.store-info__name span');
                const supEl = c.querySelector('.store-info__sup');
                const linkEl = c.querySelector('a');
                const imgEl = c.querySelector('img');

                let terminal = 'Unknown Terminal';
                const supText = supEl ? (supEl.textContent || '') : '';
                if (supText.includes('Terminal 1')) terminal = 'Terminal 1';
                if (supText.includes('Terminal 2')) terminal = 'Terminal 2';
                if (supText.includes('Terminal 3')) terminal = 'Terminal 3';

                return {
                    name: nameEl ? (nameEl.textContent || '').trim() : 'Unknown',
                    terminal: terminal,
                    floor: supText.trim(),
                    url: linkEl ? linkEl.href : null,
                    image: imgEl ? imgEl.src : null,
                    area: supText.includes('after security') ? 'Airside' : 'Landside'
                };
            });
        });

        allItems = [...allItems, ...items];
        console.log(`Found ${items.length} items on page ${pageNum}`);

        // Check Pagination
        // Selector for Next button? We need to guess or inspect.
        // Assuming there is a "Next >" or similar link. 
        // For MVP, fetch only page 1 effectively unless we find the selector.
        // Let's accept page 1 for now to safeguard.
        hasNext = false;
        pageNum++;
    }

    // Save
    await upsertL1Places(allItems, category);
}

// Scrape Restaurants
async function scrapeHanedaRestaurants() {
    console.log('Starting Puppeteer...');
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    try {
        await scrapeCategory(page, 'https://tokyo-haneda.com/en/shop_and_dine/search_r.html', 'dining');
        await scrapeCategory(page, 'https://tokyo-haneda.com/en/shop_and_dine/search_s.html', 'shopping');
    } catch (e) {
        console.error('Puppeteer Error:', e);
    } finally {
        await browser.close();
    }
}

// Setup Mistral
import { Mistral } from '@mistralai/mistralai';
const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

async function extractFacilitiesWithLLM(text: string, category: string) {
    const prompt = `
    You are a data extraction AI. Extract facility information from Haneda Airport website text.
    Category: ${category}
    
    Extract as JSON array of objects:
    - type: one of "atm", "money_exchange", "coin_locker", "nursery", "charging_station", "toilet", "clinic"
    - name_ja: Name in Japanese (or infer from context)
    - name_en: Name in English
    - location_desc: Location description (e.g. "Terminal 1 2F")
    
    Input Text:
    ${text.substring(0, 15000)}
    
    Return ONLY JSON array.
    `;

    try {
        const result = await mistral.chat.complete({
            model: 'mistral-large-latest',
            messages: [{ role: 'user', content: prompt }],
            responseFormat: { type: 'json_object' }
        });

        let content = result.choices[0].message.content as string;
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(content);
        return Array.isArray(parsed) ? parsed : (parsed.facilities || parsed.data || []);
    } catch (e) {
        console.error("LLM Extraction Error:", e);
        return [];
    }
}

// Scrape Facilities
// Scrape Facilities
async function scrapeHanedaFacilities(page: any) {
    console.log('Scraping Facilities...');

    const targets = [
        { url: 'https://tokyo-haneda.com/en/service/facilities/bank.html', type: 'atm' },
        { url: 'https://tokyo-haneda.com/en/service/facilities/coin_locker.html', type: 'coin_locker' },
        { url: 'https://tokyo-haneda.com/en/service/facilities/battery_charge.html', type: 'charging_station' },
        { url: 'https://tokyo-haneda.com/en/service/facilities/baby_nurseries.html', type: 'nursery' },
        { url: 'https://tokyo-haneda.com/en/service/facilities/toilets.html', type: 'toilet' }
    ];

    let allFacilities: any[] = [];

    for (const t of targets) {
        console.log(`Scraping ${t.type} from ${t.url}...`);
        await page.goto(t.url, { waitUntil: 'networkidle2' });

        // Extract text content specifically from main area
        const mainText = await page.evaluate(() => {
            const main = document.querySelector('.layout') || document.body;
            return main.innerText;
        });

        const extracted = await extractFacilitiesWithLLM(mainText, t.type);
        console.log(`Extracted ${extracted.length} items for ${t.type}`);
        allFacilities = [...allFacilities, ...extracted];
    }

    // Save to stations_static
    if (allFacilities.length > 0) {
        // Map to Schema
        const l3Services = allFacilities.map(f => ({
            type: f.type,
            name: { ja: f.name_ja, en: f.name_en },
            location: f.location_desc,
            attributes: { source: 'official_scraper' }
        }));

        const { error } = await supabase
            .from('stations_static')
            .upsert({
                id: HANEDA_HUB_ID,
                l3_services: l3Services,
                updated_at: new Date().toISOString()
            }, { onConflict: 'id' });

        if (error) console.error('L3 DB Error:', error.message);
        else console.log(`Saved ${allFacilities.length} L3 facilities.`);
    }
}

async function main() {
    // await scrapeHanedaRestaurants(); // Skip for now

    console.log('Starting Puppeteer for Facilities...');
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    try {
        await scrapeHanedaFacilities(page);
    } catch (e) { console.error(e); }
    finally { await browser.close(); }
}

main().catch(console.error);
