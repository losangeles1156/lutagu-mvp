
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

    console.log(`[L4Search] Query: "${query}", Station: "${stationId}", Found: ${data?.length || 0} items`);
    if (data && data.length > 0) {
      console.log(`[L4Search] Top similarity: ${data[0].similarity}`);
    }

    if (error) {
      if (error.code === 'PGRST202' || error.message?.includes('not found')) {
        // Fallback
        let queryBuilder = supabase
          .from('l4_knowledge_embeddings')
          .select('*');

        if (knowledgeType) queryBuilder = queryBuilder.eq('knowledge_type', knowledgeType);
        // Use ilike for more robust ID matching (e.g., handling prefixes)
        if (stationId) {
          queryBuilder = queryBuilder.ilike('entity_id', `%${stationId}%`);
        } else {
          // CRITICAL FIX: If stationId is missing, do NOT return random data from the top of the table.
          // Return empty unless we are sure what to search for.
          return [];
        }

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

    // STRICT FILTERING: Ensure results strictly match the requested stationId
    // This guards against RPC ignoring filters or semantic bleed-over
    if (stationId && results.length > 0) {
      results = results.filter(r => {
        if (!r.entity_id) return false;
        // Allow if ID implies containment either way (e.g., simple ID vs full URN)
        return r.entity_id.includes(stationId) || stationId.includes(r.entity_id);
      });
    }
  } catch (err) {
    console.error('searchL4Knowledge Error:', err);
    throw err;
  }

  return results;
}
