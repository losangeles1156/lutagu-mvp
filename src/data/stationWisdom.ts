import { ExpertKnowledge } from '../types/lutagu_l4';

/**
 * @deprecated
 * LUTAGU V3.0 Expert Knowledge Base - DEPRECATED
 * 
 * This file is deprecated in favor of the SSOT Markdown file:
 * src/data/tokyo_transit_knowledge_base.md
 * 
 * The knowledge is now loaded via `knowledgeService.ts` (knowledge_base.json)
 * and served dynamically via the AI Fallback (generateL4Advice).
 * 
 * Do not add new rules here. Add them to the Markdown file and run `npm run sync:knowledge`.
 */
export const KNOWLEDGE_BASE: ExpertKnowledge[] = [];
