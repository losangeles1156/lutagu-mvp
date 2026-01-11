import { DataProcessor } from './processor';
import { CrawlerResult } from './types';

const processor = new DataProcessor();

const mockResult: CrawlerResult = {
    url: 'https://tokyo.letsgojp.com/articles/jiyugaoka-test',
    title: '自由が丘散策指南',
    content: '自由が丘是一個非常適合散策的地方，這裡有很多甜點店。',
    metadata: {
        description: '自由が丘旅遊指南',
        keywords: ['自由が丘', '甜點']
    },
    extractedAt: new Date().toISOString()
};

const l4Data = processor.processL4(mockResult);

console.log('Processed L4 Data count:', l4Data.length);
if (l4Data.length > 0) {
    console.log('First Item Entity ID:', l4Data[0].entity_id);
    console.log('First Item Title:', l4Data[0].title);
} else {
    console.log('No stations found in the article.');
}
