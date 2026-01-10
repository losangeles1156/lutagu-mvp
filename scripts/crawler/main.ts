import { TokyoLetsgojpCrawler } from './tokyo_letsgojp';
import { MatchaJpCrawler } from './matcha_jp';
import { DataProcessor } from './processor';
import { DbImporter } from './db_importer';
import fs from 'fs';
import path from 'path';

async function main() {
    const importer = new DbImporter();
    const processor = new DataProcessor();
    const tokyoCrawler = new TokyoLetsgojpCrawler();
    const matchaCrawler = new MatchaJpCrawler();

    console.log('--- Starting Full Crawler Job ---');

    try {
        await importer.initTables();

        // 1. Scrape Tokyo LetsgoJP
        console.log('[TokyoLetsgojp] Fetching article list...');
        await tokyoCrawler.init();
        const tokyoPage = await tokyoCrawler.browser!.newPage();
        await tokyoPage.goto('https://tokyo.letsgojp.com/articles', { waitUntil: 'networkidle2' });
        const tokyoUrls = await tokyoPage.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a[href*="/archives/"]'));
            return Array.from(new Set(links.map(l => (l as HTMLAnchorElement).href)))
                .filter(url => /\/archives\/\d+\/$/.test(url));
        });
        await tokyoPage.close();
        console.log(`[TokyoLetsgojp] Found ${tokyoUrls.length} potential articles.`);

        for (const url of tokyoUrls.slice(0, 5)) { // Limit for now
            if (await importer.isAlreadyCrawled(url)) {
                console.log(`[Skip] ${url} already crawled.`);
                continue;
            }
            const result = await tokyoCrawler.crawl(url);
            if (result) {
                await importer.importL1(processor.processL1(result));
                const l4Items = processor.processL4(result);
                for (const l4 of l4Items) {
                    await importer.importL4(l4);
                    console.log(`[L4] Imported: ${l4.entity_id} - ${l4.subcategory}`);
                }
            }
        }

        // 2. Scrape Matcha JP
        console.log('[MatchaJp] Fetching article list...');
        await matchaCrawler.init();
        const matchaPage = await matchaCrawler.browser!.newPage();
        await matchaPage.goto('https://matcha-jp.com/jp', { waitUntil: 'networkidle2' });
        const matchaUrls = await matchaPage.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a[href*="/jp/"]'));
            return Array.from(new Set(links.map(l => (l as HTMLAnchorElement).href)))
                .filter(url => /\/\d+$/.test(url));
        });
        await matchaPage.close();
        console.log(`[MatchaJp] Found ${matchaUrls.length} potential articles.`);

        for (const url of matchaUrls.slice(0, 5)) { // Limit for now
            if (await importer.isAlreadyCrawled(url)) {
                console.log(`[Skip] ${url} already crawled.`);
                continue;
            }
            const result = await matchaCrawler.crawl(url);
            if (result) {
                await importer.importL1(processor.processL1(result));
                const l4Items = processor.processL4(result);
                for (const l4 of l4Items) {
                    await importer.importL4(l4);
                    console.log(`[L4] Imported: ${l4.entity_id} - ${l4.subcategory}`);
                }
            }
        }

        console.log('--- Full Crawler Job Completed ---');
        
        // Generate a simple report
        const report = {
            timestamp: new Date().toISOString(),
            tokyoArticlesFound: tokyoUrls.length,
            matchaArticlesFound: matchaUrls.length,
            status: 'Success'
        };
        fs.writeFileSync(path.join(process.cwd(), 'crawler_report.json'), JSON.stringify(report, null, 2));
        console.log('Report generated: crawler_report.json');

    } catch (error) {
        console.error('Crawler Job Failed:', error);
    } finally {
        await tokyoCrawler.close();
        await matchaCrawler.close();
    }
}

main();
