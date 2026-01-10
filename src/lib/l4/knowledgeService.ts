
import path from 'path';
import { parseKnowledgeMarkdown, ParsedKnowledge } from './markdownParser';

class KnowledgeService {
    private static instance: KnowledgeService;
    private knowledge: ParsedKnowledge[] = [];
    private lastLoaded: number = 0;
    private readonly CACHE_TTL = 1000 * 60 * 60; // 1 hour

    private constructor() {
        this.loadKnowledge();
    }

    public static getInstance(): KnowledgeService {
        if (!KnowledgeService.instance) {
            KnowledgeService.instance = new KnowledgeService();
        }
        return KnowledgeService.instance;
    }

    private loadKnowledge() {
        const filePath = path.join(process.cwd(), 'src/data/tokyo_transit_knowledge_base.md');
        this.knowledge = parseKnowledgeMarkdown(filePath);
        this.lastLoaded = Date.now();
        console.log(`[KnowledgeService] Loaded ${this.knowledge.length} knowledge items from markdown.`);
    }

    private ensureFresh() {
        if (Date.now() - this.lastLoaded > this.CACHE_TTL) {
            this.loadKnowledge();
        }
    }

    public getAllKnowledge(): ParsedKnowledge[] {
        this.ensureFresh();
        return this.knowledge;
    }

    public getKnowledgeByStationId(stationId: string): ParsedKnowledge[] {
        this.ensureFresh();
        // Normalize ID for matching (handle odpt.Station vs odpt:Station)
        const normalizedId = stationId.replace(/\./g, ':');
        return this.knowledge.filter(k => 
            k.stationIds.some(id => id.replace(/\./g, ':') === normalizedId)
        );
    }

    public getKnowledgeByType(type: string): ParsedKnowledge[] {
        this.ensureFresh();
        return this.knowledge.filter(k => k.type === type);
    }
}

export const knowledgeService = KnowledgeService.getInstance();
