import { TokyoLetsgojpCrawler } from './tokyo_letsgojp';
import { DataProcessor } from './processor';
import { DbImporter } from './db_importer';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testTargetedCrawl() {
    const importer = new DbImporter();
    const processor = new DataProcessor();
    const tokyoCrawler = new TokyoLetsgojpCrawler();

    console.log('--- Starting Targeted Test Crawl (Jiyugaoka) ---');

    try {
        await tokyoCrawler.init();
        
        const targetUrls = [
            'https://tokyo.letsgojp.com/archives/634771/', // 2025東京必買
            'https://tokyo.letsgojp.com/archives/61965/',  // 淺草攻略
            'https://tokyo.letsgojp.com/archives/475471/', // 自由が丘攻略 (Try this one)
            'https://tokyo.letsgojp.com/archives/38317/'   // 二子玉川 (Try this one)
        ];

        for (const url of targetUrls) {
            console.log(`[Targeted] Crawling: ${url}`);
            const result = await tokyoCrawler.crawl(url);
            
            if (result) {
                console.log(`[Targeted] Title: ${result.title}`);
                const l4Items = processor.processL4(result);
                
                if (l4Items.length > 0) {
                    console.log(`[Targeted] Successfully mapped to ${l4Items.length} entities:`);
                    for (const l4 of l4Items) {
                        console.log(`  - Entity ID: ${l4.entity_id}`);
                        console.log(`  - Entity Name: ${l4.entity_name}`);
                        console.log(`  - Subcategory: ${l4.subcategory}`);
                        
                        // Try importing to verify DB connection and table structure
                        try {
                            await importer.importL4(l4);
                            console.log(`  - [DB] Imported successfully.`);
                        } catch (dbErr) {
                            console.error(`  - [DB] Import failed:`, dbErr);
                        }
                    }
                } else {
                    console.warn(`[Targeted] No station mapping found in article: ${result.title}`);
                }
            }
        }

    } catch (error) {
        console.error('Targeted Crawl Failed:', error);
    } finally {
        await tokyoCrawler.close();
    }
}

testTargetedCrawl();
