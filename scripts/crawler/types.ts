export interface CrawlerResult {
    url: string;
    title: string;
    content: string;
    rawHtml: string;
    metadata: {
        author?: string;
        publishedAt?: string;
        category?: string;
        tags?: string[];
        description?: string;
    };
    extractedAt: string;
}

export interface L1Data {
    url: string;
    title: string;
    raw_structure: string; // JSON string of basic metadata
    metadata: any;
    crawled_at: string;
}

export interface L4Data {
    knowledge_type: string;
    entity_id: string;
    entity_name: { ja?: string; en?: string; 'zh-TW'?: string };
    content: string;
    category: string;
    subcategory: string;
    source: string;
    url: string;
}
