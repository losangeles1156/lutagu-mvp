import { TokyoLetsgojpCrawler } from './tokyo_letsgojp';
import { MatchaJpCrawler } from './matcha_jp';
import { DataProcessor } from './processor';
import { DbImporter } from './db_importer';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const LEGACY_URLS = [
    "https://matcha-jp.com/jp/23082",
    "https://matcha-jp.com/jp/19472",
    "https://matcha-jp.com/jp/1771",
    "https://matcha-jp.com/jp/18263",
    "https://matcha-jp.com/jp/953",
    "https://matcha-jp.com/jp/26454",
    "https://matcha-jp.com/jp/26550",
    "https://tokyo.letsgojp.com/archives/599078/",
    "https://tokyo.letsgojp.com/archives/596934/",
    "https://tokyo.letsgojp.com/archives/573958/",
    "https://tokyo.letsgojp.com/archives/635412/",
    "https://tokyo.letsgojp.com/archives/519348/",
    "https://tokyo.letsgojp.com/archives/562266/",
    "https://tokyo.letsgojp.com/archives/837182/",
    "https://tokyo.letsgojp.com/archives/825108/",
    "https://tokyo.letsgojp.com/archives/712089/",
    "https://tokyo.letsgojp.com/archives/355805/",
    "https://tokyo.letsgojp.com/archives/837419/",
    "https://tokyo.letsgojp.com/archives/526729/",
    "https://www.letsgojp.com/archives/379869/",
    "https://tokyo.letsgojp.com/archives/82094/",
    "https://tokyo.letsgojp.com/archives/94083/",
    "https://tokyo.letsgojp.com/archives/61965/",
    "https://tokyo.letsgojp.com/archives/634771/",
    "https://www.letsgojp.com/archives/532251/",
    "https://matcha-jp.com/jp/26414",
    "https://tokyo.letsgojp.com/archives/418608/",
    "https://tokyo.letsgojp.com/archives/808394/",
    "https://matcha-jp.com/jp/1061",
    "https://tokyo.letsgojp.com/archives/489268/"
];

async function main() {
    const tokyoCrawler = new TokyoLetsgojpCrawler();
    const matchaCrawler = new MatchaJpCrawler();
    const processor = new DataProcessor();
    const importer = new DbImporter();

    await tokyoCrawler.init();
    await matchaCrawler.init();

    console.log(`Starting patch for ${LEGACY_URLS.length} legacy URLs...`);

    let successCount = 0;
    let failCount = 0;

    for (const url of LEGACY_URLS) {
        try {
            console.log(`[Patching] ${url}...`);
            
            // Choose crawler based on URL
            const crawler = url.includes('letsgojp.com') ? tokyoCrawler : matchaCrawler;
            
            const result = await crawler.crawl(url);
            
            if (result && result.title) {
                // Process and Import L1
                const l1Data = processor.processL1(result);
                await importer.importL1(l1Data);
                
                // Also process L4 to ensure consistency (upsert will handle existing)
                const l4Items = processor.processL4(result);
                for (const l4 of l4Items) {
                    await importer.importL4(l4);
                }
                
                console.log(`[Success] ${url} - Title: ${result.title}`);
                successCount++;
            } else {
                console.warn(`[Fail] ${url} - Could not extract content.`);
                failCount++;
            }

            // Respectful delay
            await new Promise(resolve => setTimeout(resolve, 2000));
            
        } catch (error) {
            console.error(`[Error] Failed to patch ${url}:`, error);
            failCount++;
        }
    }

    await tokyoCrawler.close();
    await matchaCrawler.close();

    console.log('\n--- Patch Completed ---');
    console.log(`Successfully patched: ${successCount}`);
    console.log(`Failed: ${failCount}`);
    console.log('------------------------');
}

main().catch(console.error);
