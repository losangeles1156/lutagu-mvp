import { DbImporter } from './db_importer';
import { DataProcessor } from './processor';
import { CrawlerResult } from './types';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function verifyL1Storage() {
    const importer = new DbImporter();
    const processor = new DataProcessor();

    console.log('--- Verifying L1 Storage ---');

    const mockResult: CrawlerResult = {
        url: 'https://example.com/test-l1-storage-' + Date.now(),
        title: 'L1 Storage Test',
        content: 'This is a test content for L1 storage verification.',
        rawHtml: '<html><body>Test</body></html>',
        metadata: {
            author: 'Test Bot',
            publishedAt: new Date().toISOString(),
            category: 'Testing',
            tags: ['test', 'l1'],
            description: 'Verification'
        },
        extractedAt: new Date().toISOString()
    };

    try {
        const l1Data = processor.processL1(mockResult);
        console.log(`[Test] Attempting to import L1 data for ${l1Data.url}...`);
        
        // This should not log the "Table not found" warning anymore
        await importer.importL1(l1Data);
        
        console.log('[Test] L1 import call completed.');
        console.log('[Success] If no warning appeared above, the table exists and data was sent.');

    } catch (error) {
        console.error('[Error] L1 verification failed:', error);
    }
}

verifyL1Storage();
