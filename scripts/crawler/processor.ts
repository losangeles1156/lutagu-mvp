import { CrawlerResult, L1Data, L4Data } from './types';
import fs from 'fs';
import path from 'path';

// Load station mapping from JSON
const MAPPING_PATH = path.join(__dirname, 'station_mapping.json');
let STATION_MAPPING: Record<string, string> = {};

try {
    if (fs.existsSync(MAPPING_PATH)) {
        STATION_MAPPING = JSON.parse(fs.readFileSync(MAPPING_PATH, 'utf-8'));
    }
} catch (error) {
    console.error('Failed to load station mapping:', error);
}

// List of common words that are also station names but often lead to false positives
const STATION_FALSE_POSITIVES = new Set([
    '昭和', '日本', '東京', '品川', '新宿', '池袋', '澀谷', '渋谷', '上野', '大門', '泉', '小田', '高田', '中山'
]);

export class DataProcessor {
    processL1(result: CrawlerResult): L1Data {
        return {
            url: result.url,
            title: result.title,
            raw_structure: JSON.stringify({
                meta: result.metadata,
                extracted_at: result.extractedAt
            }),
            metadata: result.metadata,
            crawled_at: result.extractedAt
        };
    }

    processL4(result: CrawlerResult): L4Data[] {
        const knowledgeItems: L4Data[] = [];
        const content = result.content;
        const title = result.title;

        // Find entities (stations) mentioned in the content
        for (const [name, id] of Object.entries(STATION_MAPPING)) {
            // Skip false positives if they are too short and common
            if (STATION_FALSE_POSITIVES.has(name) && !title.includes(name)) {
                // Only include if the title specifically mentions it, or if it's a longer name
                continue;
            }

            if (title.includes(name) || content.includes(name)) {
                // Determine knowledge type based on keywords
                let category = 'tip';
                let subcategory = 'general';
                let icon = '💡';

                if (content.includes('注意') || content.includes('警告') || content.includes('小心')) {
                    category = 'warning';
                    icon = '⚠️';
                } else if (content.includes('轉乘') || content.includes('換乘')) {
                    subcategory = 'transfer';
                    icon = '🔄';
                } else if (content.includes('出口') || content.includes('位置')) {
                    subcategory = 'facility';
                    icon = '📍';
                }

                knowledgeItems.push({
                    knowledge_type: 'hub_station',
                    entity_id: id,
                    entity_name: { ja: name, 'zh-TW': name },
                    content: this.summarizeContent(content, name),
                    category,
                    subcategory,
                    source: result.url,
                    url: result.url
                });
            }
        }

        return knowledgeItems;
    }

    private summarizeContent(content: string, entityName: string): string {
        // Simplified summarization: take the first 200 characters or lines containing the entity
        const lines = content.split('\n');
        const relevantLines = lines.filter(l => l.includes(entityName)).slice(0, 3);
        if (relevantLines.length > 0) {
            return relevantLines.join('\n').substring(0, 500);
        }
        return content.substring(0, 500);
    }
}
