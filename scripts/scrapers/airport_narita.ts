import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
import { createClient } from '@supabase/supabase-js';
import puppeteer from 'puppeteer';

// Environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const NARITA_HUB_ID = 'odpt:Station:Airport.Narita';

async function upsertL1Places(items: any[]) {
    if (items.length === 0) return;

    // Map to DB Schema
    const records = items.map(item => ({
        station_id: NARITA_HUB_ID,
        osm_id: -1 * Math.floor(Math.random() * 1000000000),
        name: item.name,
        category: item.category.toLowerCase().includes('duty free') ? 'shopping' : (item.category.includes('Restaurant') || item.category.includes('Cafe') ? 'dining' : 'shopping'), // Simple guess
        // vibe_tags: ['Airport', item.terminal], // Removed
        location: 'POINT(140.392 35.771)', // Narita Center
        lat: 35.771,
        lng: 140.392,
        tags: {
            "source": "official_scraper",
            "terminal": item.terminal,
            "floor": item.floor,
            "opening_hours": item.hours,
            "raw_location": item.locationRaw,
            "category_raw": item.category,
            "vibe_generated": "Airport Shop"
        },
        created_at: new Date().toISOString()
    }));

    // Clear old data first to avoid dupes
    const { error: delError } = await supabase
        .from('l1_places')
        .delete()
        .eq('station_id', NARITA_HUB_ID)
        .contains('tags', { source: 'official_scraper' });

    if (delError) console.error('Delete Error:', delError.message);

    // Insert
    const { error } = await supabase.from('l1_places').insert(records).select();
    if (error) {
        console.error('DB Insert Error:', error.message);
    } else {
        console.log(`Saved ${items.length} Narita items.`);
    }
}

async function scrapeNarita() {
    console.log('Starting Puppeteer for Narita...');
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Narita Search URL (First page only for now)
    const targetUrl = 'https://www.narita-airport.jp/en/shops/search/?page=1';

    try {
        await page.goto(targetUrl, { waitUntil: 'networkidle2' });

        let allItems: any[] = [];

        // Loop pages? Narita uses query param ?page=1. Limit to 3 pages for MVP.
        for (let i = 1; i <= 3; i++) {
            if (i > 1) {
                await page.goto(`https://www.narita-airport.jp/en/shops/search/?page=${i}`, { waitUntil: 'networkidle2' });
            }

            const items = await page.evaluate(() => {
                const cards = Array.from(document.querySelectorAll('[class*="styles_contents"]'));
                return cards.map(c => {
                    const nameEl = c.querySelector('[class*="styles_title"]');
                    const labelEl = c.querySelector('[class*="styles_text"]'); // Category
                    // Captions: usually 2 lines: hours, location
                    const captions = Array.from(c.querySelectorAll('[class*="styles_caption"]')).map((el: any) => el.innerText);

                    const locationRaw = captions.find(t => t.includes('Terminal') || t.includes('T1') || t.includes('T2') || t.includes('T3')) || '';
                    const hours = captions.find(t => t.includes(':') || t.includes('-')) || '';

                    let terminal = 'Unknown';
                    if (locationRaw.includes('T1') || locationRaw.includes('Terminal 1')) terminal = 'Terminal 1';
                    if (locationRaw.includes('T2') || locationRaw.includes('Terminal 2')) terminal = 'Terminal 2';
                    if (locationRaw.includes('T3') || locationRaw.includes('Terminal 3')) terminal = 'Terminal 3';

                    return {
                        name: nameEl ? (nameEl.textContent || '').trim() : 'Unknown',
                        category: labelEl ? (labelEl.textContent || '').trim() : 'Unknown',
                        terminal: terminal,
                        locationRaw: locationRaw,
                        hours: hours,
                        floor: locationRaw // Simplified
                    };
                });
            });

            console.log(`Page ${i}: Found ${items.length} items`);
            allItems = [...allItems, ...items];

            if (items.length === 0) break;
        }

        await upsertL1Places(allItems);

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
    You are a data extraction AI. Extract facility information from Narita Airport website text.
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

async function scrapeNaritaFacilities(page: any) {
    console.log('Scraping Facilities...');
    const targets = [
        { url: 'https://www.narita-airport.jp/en/service/exchange/', type: 'atm' },
        { url: 'https://www.narita-airport.jp/en/service/delivery/', type: 'coin_locker' },
        { url: 'https://www.narita-airport.jp/en/service/medical/', type: 'clinic' },
        { url: 'https://www.narita-airport.jp/en/service/child/', type: 'nursery' },
        { url: 'https://www.narita-airport.jp/en/service/internet/', type: 'charging_station' }
    ];

    let allFacilities: any[] = [];

    for (const t of targets) {
        console.log(`Scraping ${t.type} from ${t.url}...`);
        await page.goto(t.url, { waitUntil: 'networkidle2' });

        // Extract text content specifically from main area
        const mainText = await page.evaluate(() => {
            // Heuristic: Narita might have specific main class
            const main = document.querySelector('main') || document.body;
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
                id: NARITA_HUB_ID,
                l3_services: l3Services,
                updated_at: new Date().toISOString()
            }, { onConflict: 'id' });

        if (error) console.error('L3 DB Error:', error.message);
        else console.log(`Saved ${allFacilities.length} L3 facilities.`);
    }
}

async function main() {
    // await scrapeNarita(); // Skip L1 if already done, or keep it.
    // Let's run both for completeness if fast, or just Facilities.
    // L1 was already done. Comment out to save time?
    // User wants "The current goals are to develop web scrapers...".
    // I should provide a complete script.

    // Uncomment to run L1 again if needed
    // await scrapeNarita();

    console.log('Starting Puppeteer for Facilities...');
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    try {
        await scrapeNaritaFacilities(page);
    } catch (e) { console.error(e); }
    finally { await browser.close(); }
}

main().catch(console.error);
