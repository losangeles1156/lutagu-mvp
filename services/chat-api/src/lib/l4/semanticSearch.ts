/**
 * L4 Knowledge Semantic Search Client
 * 
 * Provides AI Agent with efficient knowledge retrieval that only
 * returns relevant information based on user context.
 * 
 * Usage:
 * 
 * import { SemanticL4Client } from '@/lib/l4/semanticSearch';
 * 
 * const client = new SemanticL4Client();
 * 
 * // Get relevant knowledge for a user query
 * const results = await client.searchRelevantKnowledge({
 *   query: "上野站有電梯嗎？我推著嬰兒車",
 *   stationId: "odpt:Station:JR-East.Ueno",
 *   userContext: ["stroller"],
 *   timeContext: "weekday-morning"
 * });
 * 
 * // Get station transfer tips
 * const transferTips = await client.getTransferTips({
 *   stationId: "odpt:Station:JR-East.Shinjuku"
 * });
 */

const API_BASE = '/api/l4/semantic-search';

export interface SearchParams {
  query: string;
  stationId?: string;
  knowledgeType?: 'railway' | 'hub_station' | 'accessibility' | 'special_location' | 'pass' | 'crowd';
  userContext?: ('wheelchair' | 'stroller' | 'largeLuggage' | 'vision' | 'senior' | 'general')[];
  timeContext?: 'weekday-morning' | 'weekday-evening' | 'weekend' | 'holiday';
  topK?: number;
  threshold?: number;
}

export interface SearchResult {
  id: string;
  content: string;
  icon: string;
  category: string;
  subcategory?: string;
  knowledge_type: string;
  entity_id: string;
  relevance_score: number;
  entity_name?: { 'zh-TW': string; 'ja': string; 'en': string };
}

export interface SearchResponse {
  success: boolean;
  results: SearchResult[];
  metadata: {
    query: string;
    total_results: number;
    generation_time_ms: number;
    filters_applied: {
      station_id?: string;
      knowledge_type?: string;
      user_context?: string[];
      time_context?: string;
    };
  };
}

export class SemanticL4Client {
  private defaultTopK = 5;
  private defaultThreshold = 0.5;

  /**
   * Search for relevant knowledge based on user query and context
   */
  async searchRelevantKnowledge(params: SearchParams): Promise<SearchResponse> {
    const {
      query,
      stationId,
      knowledgeType,
      userContext = [],
      timeContext,
      topK = this.defaultTopK,
      threshold = this.defaultThreshold
    } = params;

    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        station_id: stationId,
        knowledge_type: knowledgeType,
        user_context: userContext,
        time_context: timeContext,
        top_k: topK,
        threshold
      })
    });

    if (!response.ok) {
      throw new Error(`L4 Semantic Search failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get transfer tips for a specific station
   */
  async getTransferTips(stationId: string, query?: string): Promise<SearchResponse> {
    return this.searchRelevantKnowledge({
      query: query || `如何在 ${stationId} 轉乘？轉乘距離和時間？`,
      stationId,
      knowledgeType: 'hub_station',
      topK: 3
    });
  }

  /**
   * Get accessibility information for users with specific needs
   */
  async getAccessibilityInfo(
    stationId: string,
    userNeed: 'wheelchair' | 'stroller' | 'largeLuggage' | 'vision' | 'senior'
  ): Promise<SearchResponse> {
    return this.searchRelevantKnowledge({
      query: `${stationId} 的無障礙設施資訊`,
      stationId,
      knowledgeType: 'accessibility',
      userContext: [userNeed],
      topK: 3
    });
  }

  /**
   * Get crowd information for a specific time period
   */
  async getCrowdInfo(
    stationId: string,
    timeContext: 'weekday-morning' | 'weekday-evening' | 'weekend' | 'holiday'
  ): Promise<SearchResponse> {
    return this.searchRelevantKnowledge({
      query: `${stationId} 的尖峰時段和人潮状况`,
      stationId,
      knowledgeType: 'crowd',
      timeContext,
      topK: 3
    });
  }

  /**
   * Get railway line tips (crowd, warnings, passes)
   */
  async getRailwayTips(
    railwayId: string,
    category?: 'warning' | 'tip' | 'pass' | 'crowd'
  ): Promise<SearchResponse> {
    return this.searchRelevantKnowledge({
      query: `${railwayId} 的搭乘注意事項和建議`,
      stationId: railwayId,
      knowledgeType: 'railway',
      topK: 5
    });
  }

  /**
   * Get special location tips (airports, tourist spots)
   */
  async getSpecialLocationTips(locationId: string): Promise<SearchResponse> {
    return this.searchRelevantKnowledge({
      query: `${locationId} 的交通和旅遊建議`,
      knowledgeType: 'special_location',
      topK: 5
    });
  }

  /**
   * Get pass recommendations for a trip
   */
  async getPassRecommendations(
    origin: string,
    destination: string
  ): Promise<SearchResponse> {
    return this.searchRelevantKnowledge({
      query: `從 ${origin} 到 ${destination} 推薦使用哪種交通票券？`,
      knowledgeType: 'pass',
      topK: 3
    });
  }

  /**
   * Get station-specific knowledge with full context
   */
  async getStationKnowledge(
    stationId: string,
    userContext: string[],
    timeContext?: string
  ): Promise<SearchResponse> {
    const stationName = stationId.split('.').pop() || stationId;
    
    return this.searchRelevantKnowledge({
      query: `${stationName} 的車站資訊、設施和建議`,
      stationId,
      userContext: userContext as any,
      timeContext: timeContext as any,
      topK: 5
    });
  }
}

// Export singleton instance
export const semanticL4Client = new SemanticL4Client();

/**
 * AI Agent helper function - formats results for LLM consumption
 */
export function formatKnowledgeForLLM(results: SearchResult[]): string {
  if (results.length === 0) {
    return '沒有找到相關知識。';
  }

  return results
    .map((result, idx) => {
      const icon = result.icon || '💡';
      const category = result.category || 'tip';
      return `${idx + 1}. ${icon} [${category}] ${result.content}`;
    })
    .join('\n');
}

/**
 * AI Agent helper function - creates a prompt with relevant knowledge
 */
export function createKnowledgePrompt(
  userQuery: string,
  knowledge: string
): string {
  return `
User Query: ${userQuery}

Relevant Knowledge:
${knowledge}

Please provide a helpful response based on the above knowledge.
If the knowledge doesn't fully answer the question, please indicate that and provide general guidance.
`;
}
