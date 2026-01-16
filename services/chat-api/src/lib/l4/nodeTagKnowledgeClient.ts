/**
 * L4 Knowledge Client with Node & Tag Integration
 * 
 * Leverages the project's two main features: Nodes and Tags
 * for more efficient and accurate knowledge retrieval.
 * 
 * Key Features:
 * - Node-based knowledge retrieval (by station)
 * - Tag-based filtering (by facility category)
 * - Vibe matching (station personality)
 * - Hierarchical search (node -> tag -> knowledge)
 * 
 * Usage:
 * 
 * import { NodeTagL4Client } from '@/lib/l4/nodeTagKnowledgeClient';
 * 
 * const client = new NodeTagL4Client();
 * 
 * // Get knowledge for a specific node with vibe matching
 * const results = await client.getNodeKnowledge({
 *   nodeId: 'odpt:Station:JR-East.Ueno',
 *   userContext: ['stroller'],
 *   timeContext: 'weekday-morning'
 * });
 * 
 * // Get shopping-related knowledge
 * const shopping = await client.getKnowledgeByTags({
 *   mainCategory: 'shopping',
 *   subCategory: 'market',
 *   nodeVibe: ['traditional', 'shitamachi']
 * });
 */

const API_BASE = '/api/l4/enhanced-search';

export interface NodeKnowledgeParams {
  nodeId: string;
  query?: string;
  userContext?: ('wheelchair' | 'stroller' | 'largeLuggage' | 'vision' | 'senior' | 'general')[];
  timeContext?: 'weekday-morning' | 'weekday-evening' | 'weekend' | 'holiday';
  tagFocus?: ('leisure' | 'shopping' | 'dining' | 'service' | 'medical')[];
  maxResults?: number;
}

export interface TagKnowledgeParams {
  mainCategory: ('leisure' | 'shopping' | 'dining' | 'service' | 'medical')[];
  subCategory?: string[];
  detailCategory?: string[];
  nodeVibe?: string[];
  maxResults?: number;
}

export interface KnowledgeResult {
  id: string;
  knowledge_type: string;
  content: string;
  title?: { 'zh-TW': string; 'ja': string; 'en': string };
  icon: string;
  category: string;
  tag_category?: string[];
  tag_subcategory?: string[];
  node_id?: string;
  importance: number;
  relevance_score: number;
}

export interface NodeInfo {
  id: string;
  name: { 'zh-TW': string; 'ja': string; 'en': string };
  vibe: string[];
  is_hub: boolean;
  parent_hub_id?: string;
}

export interface TagInfo {
  mainCategory: string;
  subCategory: string;
  detailCategory?: string;
  name: string;
  distanceMeters: number;
  direction: string;
}

export class NodeTagL4Client {
  private defaultMaxResults = 5;

  /**
   * Get knowledge for a specific node with context-aware filtering
   */
  async getNodeKnowledge(params: NodeKnowledgeParams): Promise<KnowledgeResult[]> {
    const {
      nodeId,
      query,
      userContext = [],
      timeContext,
      tagFocus,
      maxResults = this.defaultMaxResults
    } = params;

    const response = await fetch(`${API_BASE}/node`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        node_id: nodeId,
        query: query || `關於 ${nodeId} 的知識和建議`,
        user_context: userContext,
        time_context: timeContext,
        tag_focus: tagFocus,
        max_results: maxResults
      })
    });

    if (!response.ok) {
      throw new Error(`Node knowledge search failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.results || [];
  }

  /**
   * Get knowledge by tag categories
   */
  async getKnowledgeByTags(params: TagKnowledgeParams): Promise<KnowledgeResult[]> {
    const {
      mainCategory,
      subCategory,
      detailCategory,
      nodeVibe,
      maxResults = this.defaultMaxResults
    } = params;

    const response = await fetch(`${API_BASE}/tag`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tag_category: mainCategory,
        tag_subcategory: subCategory,
        tag_detail: detailCategory,
        node_vibe: nodeVibe,
        max_results: maxResults
      })
    });

    if (!response.ok) {
      throw new Error(`Tag knowledge search failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.results || [];
  }

  /**
   * Get contextual knowledge combining node, tags, and user context
   */
  async getContextualKnowledge(
    nodeId: string,
    userContext: string[],
    timeContext?: string,
    tagFocus?: string[]
  ): Promise<KnowledgeResult[]> {
    const response = await fetch(`${API_BASE}/contextual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        node_id: nodeId,
        user_context: userContext,
        time_context: timeContext,
        tag_focus: tagFocus,
        max_results: this.defaultMaxResults
      })
    });

    if (!response.ok) {
      throw new Error(`Contextual knowledge search failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.results || [];
  }

  /**
   * Get knowledge related to nearby facilities (by tag)
   */
  async getNearbyFacilityKnowledge(
    nodeId: string,
    facilityTags: TagInfo[],
    maxResults: number = 3
  ): Promise<KnowledgeResult[]> {
    if (facilityTags.length === 0) {
      return [];
    }

    // Extract unique categories from facility tags
    const categories = [...new Set(facilityTags.map(t => t.mainCategory))];
    const subCategories = [...new Set(facilityTags.map(t => t.subCategory))];

    return this.getKnowledgeByTags({
      mainCategory: categories as any,
      subCategory: subCategories,
      maxResults
    });
  }

  /**
   * Get vibe-based recommendations
   */
  async getVibeBasedKnowledge(
    nodeVibe: string[],
    category?: string
  ): Promise<KnowledgeResult[]> {
    const response = await fetch(`${API_BASE}/vibe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        node_vibe: nodeVibe,
        category,
        max_results: this.defaultMaxResults
      })
    });

    if (!response.ok) {
      throw new Error(`Vibe-based knowledge search failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.results || [];
  }

  /**
   * Get transfer knowledge for a hub station
   */
  async getTransferKnowledge(
    hubNodeId: string,
    connectingLine?: string
  ): Promise<KnowledgeResult[]> {
    return this.getNodeKnowledge({
      nodeId: hubNodeId,
      query: connectingLine 
        ? `${hubNodeId} 轉乘 ${connectingLine}`
        : `${hubNodeId} 轉乘資訊和建議`,
      maxResults: 3
    });
  }

  /**
   * Get shopping knowledge for a station
   */
  async getShoppingKnowledge(
    nodeId: string,
    subCategory?: 'market' | 'department' | 'specialty' | 'drugstore' | 'variety_store'
  ): Promise<KnowledgeResult[]> {
    return this.getContextualKnowledge(
      nodeId,
      ['general'],
      undefined,
      subCategory ? ['shopping', subCategory] : ['shopping']
    );
  }

  /**
   * Get dining knowledge for a station
   */
  async getDiningKnowledge(
    nodeId: string,
    subCategory?: 'cafe' | 'restaurant' | 'japanese' | 'bar'
  ): Promise<KnowledgeResult[]> {
    return this.getContextualKnowledge(
      nodeId,
      ['general'],
      undefined,
      subCategory ? ['dining', subCategory] : ['dining']
    );
  }

  /**
   * Get leisure/tourist knowledge for a station
   */
  async getLeisureKnowledge(
    nodeId: string,
    detailCategory?: 'park' | 'museum' | 'temple' | 'shrine' | 'theater'
  ): Promise<KnowledgeResult[]> {
    return this.getContextualKnowledge(
      nodeId,
      ['general'],
      undefined,
      detailCategory ? ['leisure', detailCategory] : ['leisure']
    );
  }
}

// Export singleton instance
export const nodeTagL4Client = new NodeTagL4Client();

/**
 * AI Agent helper - Format knowledge for LLM with node/tag context
 */
export function formatKnowledgeWithContext(results: KnowledgeResult[]): string {
  if (results.length === 0) {
    return '沒有找到相關知識。';
  }

  return results
    .map((result, idx) => {
      const icon = result.icon || '💡';
      const tags = result.tag_category?.join('.') || 'general';
      const importance = '⭐'.repeat(Math.min(result.importance, 5));
      
      return `${idx + 1}. ${icon} [${tags}] ${importance}\n   ${result.content}`;
    })
    .join('\n\n');
}

/**
 * AI Agent helper - Create a structured prompt with node/tag context
 */
export function createStructuredPrompt(
  userQuery: string,
  nodeInfo: NodeInfo | null,
  facilityTags: TagInfo[],
  knowledge: KnowledgeResult[]
): string {
  let prompt = `## 使用者問題\n${userQuery}\n\n`;
  
  if (nodeInfo) {
    prompt += `## 節點資訊\n`;
    prompt += `- 車站: ${nodeInfo.name['zh-TW']}\n`;
    prompt += `- 風格: ${nodeInfo.vibe.join(', ')}\n`;
    prompt += `- 類型: ${nodeInfo.is_hub ? '樞紐站' : '一般站點'}\n\n`;
  }
  
  if (facilityTags.length > 0) {
    prompt += `## 附近設施標籤\n`;
    facilityTags.slice(0, 5).forEach(tag => {
      prompt += `- ${tag.mainCategory}.${tag.subCategory}${tag.detailCategory ? `.${tag.detailCategory}` : ''}: ${tag.name} (${tag.distanceMeters}m, ${tag.direction})\n`;
    });
    prompt += '\n';
  }
  
  if (knowledge.length > 0) {
    prompt += `## 相關知識\n${formatKnowledgeWithContext(knowledge)}\n\n`;
  }
  
  prompt += `## 回答指南\n`;
  prompt += `- 根據節點風格調整回答語氣\n`;
  prompt += `- 優先推薦附近的設施\n`;
  prompt += `- 提供實用的交通和轉乘建議\n`;
  prompt += `- 考慮使用者的無障礙需求（如有）`;

  return prompt;
}

/**
 * AI Agent helper - Extract query intent for better knowledge retrieval
 */
export function extractQueryIntent(query: string): {
  action: 'shopping' | 'dining' | 'leisure' | 'transfer' | 'accessibility' | 'general';
  targetTags?: string[];
  urgency: 'normal' | 'urgent';
} {
  const lowerQuery = query.toLowerCase();
  
  // Detect action
  if (lowerQuery.match(/購物|逛街|買|shop|purchase/)) {
    return { action: 'shopping', targetTags: ['shopping'], urgency: 'normal' };
  }
  if (lowerQuery.match(/吃|餐廳|美食|dining|restaurant|food/)) {
    return { action: 'dining', targetTags: ['dining'], urgency: 'normal' };
  }
  if (lowerQuery.match(/參觀|景點|公園|museum|park|temple|tour/)) {
    return { action: 'leisure', targetTags: ['leisure'], urgency: 'normal' };
  }
  if (lowerQuery.match(/轉乘|換車|transfer/)) {
    return { action: 'transfer', urgency: 'normal' };
  }
  if (lowerQuery.match(/電梯|輪椅|無障礙|elevator|wheelchair|accessible/)) {
    return { action: 'accessibility', targetTags: ['accessibility'], urgency: 'urgent' };
  }
  
  return { action: 'general', urgency: 'normal' };
}
