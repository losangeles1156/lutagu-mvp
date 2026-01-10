import { CrawlerResult, L1Data, L4Data } from './types';

// Mocked or imported entity mapping (simplified for this script)
const STATION_MAPPING: Record<string, string> = {
    '新宿': 'odpt.Station:JR-East.Shinjuku',
    '澀谷': 'odpt.Station:JR-East.Shibuya',
    '上野': 'odpt.Station:JR-East.Ueno',
    '東京': 'odpt.Station:JR-East.Tokyo',
    '秋葉原': 'odpt.Station:JR-East.Akihabara',
    '淺草': 'odpt.Station:TokyoMetro.Ginza.Asakusa',
    '池袋': 'odpt.Station:JR-East.Ikebukuro',
    '銀座': 'odpt.Station:TokyoMetro.Ginza.Ginza',
    '品川': 'odpt.Station:JR-East.Shinagawa',
    '成田機場': 'odpt.Station:Keisei.NaritaAirportTerminal1',
    '羽田機場': 'odpt.Station:TokyoMonorail.HanedaAirportTerminal1'
};

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
        
        // Find entities (stations) mentioned in the content
        for (const [name, id] of Object.entries(STATION_MAPPING)) {
            if (result.title.includes(name) || content.includes(name)) {
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
