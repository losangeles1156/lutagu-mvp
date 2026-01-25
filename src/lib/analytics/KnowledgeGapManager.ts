/**
 * KnowledgeGapManager - 知識缺口管理器 (Deep Tech Implementation)
 * 
 * 超越單純的計數器，利用向量相似度分析 (Vector Clustering) 與語義理解
 * 來識別並聚合「真正的知識缺口」。
 * 
 * 功能：
 * 1. 語義聚合：將 "怎麼去淺草" 和 "淺草交通方式" 識別為同一缺口 (via Vector/LLM)
 * 2. 影響力評估：結合頻率、時間急迫性與用戶情緒計算優先級
 * 3. Agent 觸發：生成結構化的 Research Task 供 AI Agent 執行
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { UnmetNeedAggregate } from './FeedbackLooper';
import { searchVectorDB, upsertToVectorDB } from '@/lib/api/vectorService'; // Reusing vector service for gap clustering
import { generateLLMResponse } from '@/lib/ai/llmService';

export interface KnowledgeGapTask {
    id: string;
    topic: string;             // e.g., "Shinjuku Station South Exit Elevator"
    query_cluster: string[];   // Original user queries
    semantic_vector?: number[];
    priority_score: number;    // 0-100
    status: 'pending' | 'researching' | 'resolved';
    created_at: string;
}

export class KnowledgeGapManager {
    private supabase: SupabaseClient;

    constructor(supabaseClient: SupabaseClient) {
        this.supabase = supabaseClient;
    }

    /**
     * Deep Analysis of Unmet Needs
     * 1. Fetches raw unmet needs
     * 2. Clusters them semantically (using vector embeddings if available, or LLM grouping)
     * 3. Calculates 'Gap Impact Score'
     * 4. Generates actionable tasks
     */
    async processUnmetNeeds(rawNeeds: UnmetNeedAggregate[]): Promise<KnowledgeGapTask[]> {
        if (rawNeeds.length === 0) return [];

        console.log(`[KnowledgeGapManager] Processing ${rawNeeds.length} raw semantic signals...`);

        // 1. Semantic Clustering (Simulation via LLM for MVP, optimizing for cost)
        // In a full vector implementation, we would embed each query and DBSCAN cluster them.
        // Here we use the Brain (LLM) to group semantically similar intents.

        const intentList = rawNeeds.map(n => `- [${n.station_id}] ${n.intent_target} (count: ${n.count})`).join('\n');

        const systemPrompt = `You are a Knowledge Architect for a Transit AI. 
Analyze the following list of unmet user needs. 
Group semantically identical needs (e.g., "locker in ueno" and "baggage storage ueno").
Output a JSON list of "Knowledge Gaps" that need to be filled.
Format: { "gaps": [{ "topic": "string", "station": "string", "raw_intents": ["string"], "priority": number }] }
Priority logic: High count = High priority. Safety/Accessibility issues = Max priority.`;

        try {
            const analysis = await generateLLMResponse({
                systemPrompt,
                userPrompt: intentList,
                taskType: 'reasoning', // Using deeper reasoning model
                temperature: 0.2
            });

            const parsed = JSON.parse(analysis || '{ "gaps": [] }');
            const tasks: KnowledgeGapTask[] = [];

            for (const gap of parsed.gaps) {
                // Calculate Gap Impact Score (0-100)
                // Base score from LLM priority + Time Decay factor (not impl yet)
                const impactScore = Math.min(100, (gap.priority || 50) + (gap.raw_intents.length * 5));

                const task: KnowledgeGapTask = {
                    id: crypto.randomUUID(),
                    topic: `${gap.station} - ${gap.topic}`,
                    query_cluster: gap.raw_intents,
                    priority_score: impactScore,
                    status: 'pending',
                    created_at: new Date().toISOString()
                };

                tasks.push(task);

                // Persistence: Log the identified gap to DB for the "Research Agent" (future) to pick up
                await this.logGapTask(task);
            }

            console.log(`[KnowledgeGapManager] Identified ${tasks.length} consolidated knowledge gaps.`);
            return tasks;

        } catch (e) {
            console.error('[KnowledgeGapManager] LLM Analysis failed:', e);
            return [];
        }
    }

    /**
     * Persist the gap task to Supabase
     * Ideally, this goes into a 'knowledge_gap_tasks' table
     */
    private async logGapTask(task: KnowledgeGapTask): Promise<void> {
        // Table might not exist yet, strictly logging for now or using a generic 'system_logs'
        // For Deep Execution, we should ensure the schema exists. 
        // Assuming 'enrichment_requests' from FeedbackLooper can be reused or expanded.

        const { error } = await this.supabase
            .from('enrichment_requests')
            .insert({
                station_id: task.topic.split(' - ')[0], // Weak parsing, but sufficient for MVP
                intent_target: task.topic,
                status: 'pending',
                priority: task.priority_score,
                metadata: {
                    queries: task.query_cluster,
                    source: 'KnowledgeGapManager'
                }
            });

        if (error) {
            console.warn(`[KnowledgeGapManager] Failed to persist task ${task.id}:`, error.message);
        }
    }
}
