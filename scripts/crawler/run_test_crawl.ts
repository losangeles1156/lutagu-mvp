import { TokyoLetsgojpCrawler } from './tokyo_letsgojp';
import { MatchaJpCrawler } from './matcha_jp';
import { DataProcessor } from './processor';
import { DbImporter } from './db_importer';

async function runTestCrawl() {
    const importer = new DbImporter();
    const processor = new DataProcessor();
    const tokyoCrawler = new TokyoLetsgojpCrawler();
    const matchaCrawler = new MatchaJpCrawler();

    console.log('--- Starting Test Crawl ---');

    try {
        // 1. Initialize tables (if possible)
        await importer.initTables();

        // 2. Test Tokyo LetsgoJP (1 article)
        const tokyoUrls = ['https://tokyo.letsgojp.com/archives/489268/']; // Ueno guide
        for (const url of tokyoUrls) {
            if (await importer.isAlreadyCrawled(url)) {
                console.log(`[Skip] ${url} already crawled.`);
                continue;
            }

            const result = await tokyoCrawler.crawl(url);
            if (result) {
                console.log(`[Success] Scraped: ${result.title}`);
                
                // Process L1
                const l1Data = processor.processL1(result);
                await importer.importL1(l1Data);

                // Process L4
                const l4Items = processor.processL4(result);
                for (const l4 of l4Items) {
                    await importer.importL4(l4);
                    console.log(`[L4] Imported knowledge: ${l4.entity_id} - ${l4.subcategory}`);
                }
            }
        }

        // 3. Test Matcha JP (1 article)
        const matchaUrls = ['https://matcha-jp.com/jp/1061']; 
        for (const url of matchaUrls) {
            if (await importer.isAlreadyCrawled(url)) {
                console.log(`[Skip] ${url} already crawled.`);
                continue;
            }

            const result = await matchaCrawler.crawl(url);
            if (result) {
                console.log(`[Success] Scraped: ${result.title}`);
                
                // Process L1
                const l1Data = processor.processL1(result);
                await importer.importL1(l1Data);

                // Process L4
                const l4Items = processor.processL4(result);
                for (const l4 of l4Items) {
                    await importer.importL4(l4);
                    console.log(`[L4] Imported knowledge: ${l4.entity_id} - ${l4.subcategory}`);
                }
            }
        }
        
        console.log('--- Test Crawl Completed ---');
    } catch (error) {
        console.error('Test Crawl Failed:', error);
    } finally {
        await tokyoCrawler.close();
        await matchaCrawler.close();
    }
}

runTestCrawl();
