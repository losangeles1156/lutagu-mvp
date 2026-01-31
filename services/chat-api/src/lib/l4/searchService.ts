
import { createClient } from '@supabase/supabase-js';
import { generateEmbedding } from '@/lib/ai/embedding';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseKey);
}


interface VectorSearchResult {
  id: string;
  score: number;
  content: string;
  tags: string[];
}

export async function searchL4Knowledge(params: {
  query: string;
  stationId?: string;
  knowledgeType?: string; // Kept for compatibility, but vector search tags should overlap
  userContext?: string[];
  timeContext?: string;
  topK?: number;
  threshold?: number;
}) {
  const {
    query,
    stationId,
    topK = 5,
    threshold = 0.5
  } = params;

  try {
    const { vectorStore } = await import('@/lib/ai/vectorStore');

    // Perform semantic search
    const results = await vectorStore.search(query, {
      limit: topK,
      threshold: threshold
    });

    console.log(`[L4Search] Query: "${query}", Found: ${results.length} items`);

    return results.map(r => ({
      id: r.id,
      content: r.content,
      similarity: r.similarity || 0,
      category: r.metadata?.tags?.[0] || 'general',
      knowledge_type: r.metadata?.type || 'general',
      tags: r.metadata?.tags || [],
      entity_id: r.id
    }));

  } catch (err) {
    console.error('searchL4Knowledge Error:', err);
    // Fail gracefully or throw depending on requirements
    return [];
  }
}

