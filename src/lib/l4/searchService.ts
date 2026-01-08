
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

export async function searchL4Knowledge(params: {
  query: string;
  stationId?: string;
  knowledgeType?: string;
  userContext?: string[];
  timeContext?: string;
  topK?: number;
  threshold?: number;
}) {
  const {
    query,
    stationId,
    knowledgeType,
    userContext = [],
    timeContext,
    topK = 5,
    threshold = 0.5
  } = params;

  const embedding = await generateEmbedding(query);
  const supabase = getSupabaseClient();
  
  let results: any[] = [];

  try {
    const { data, error } = await supabase
      .rpc('match_l4_knowledge', {
        query_embedding: embedding,
        match_threshold: threshold,
        match_count: topK,
        filter_knowledge_type: knowledgeType || null,
        filter_entity_id: stationId || null,
        filter_category: null,
        filter_user_context: userContext.length > 0 ? userContext : null,
        filter_time_context: timeContext ? [timeContext] : null
      });
    
    if (error) {
      if (error.code === 'PGRST202' || error.message?.includes('not found')) {
        // Fallback
        let queryBuilder = supabase
          .from('l4_knowledge_embeddings')
          .select('*');
        
        if (knowledgeType) queryBuilder = queryBuilder.eq('knowledge_type', knowledgeType);
        if (stationId) queryBuilder = queryBuilder.eq('entity_id', stationId);
        
        const { data: fallbackData, error: fallbackError } = await queryBuilder.limit(topK * 2);
        if (fallbackError) throw fallbackError;
        
        results = (fallbackData || []).map(item => ({
          ...item,
          similarity: 0.8
        }));
      } else {
        throw error;
      }
    } else {
      results = data || [];
    }
  } catch (err) {
    console.error('searchL4Knowledge Error:', err);
    throw err;
  }

  return results;
}
