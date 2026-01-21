
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
    knowledgeType,
    userContext = [],
    timeContext,
    topK = 5,
    threshold = 0.5
  } = params;

  const vectorServiceUrl = process.env.VECTOR_SEARCH_SERVICE_URL;

  if (!vectorServiceUrl) {
    console.warn('VECTOR_SEARCH_SERVICE_URL not set. Falling back to empty results.');
    return [];
  }

  // Construct search query
  // We can enhance the query with context if needed
  let finalQuery = query;
  if (stationId) {
    finalQuery += ` related to ${stationId}`;
  }

  try {
    const response = await fetch(`${vectorServiceUrl}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: finalQuery,
        limit: topK,
        threshold: threshold
      })
    });

    if (!response.ok) {
      throw new Error(`Vector Service Error: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    const results: VectorSearchResult[] = data.results || [];

    console.log(`[L4Search] Query: "${finalQuery}", Found: ${results.length} items`);

    // Client-side filtering if necessary (e.g. strict ID matching if vector search is too fuzzy)
    // The vector service returns 'content' and 'tags'.
    // We map it to the expected interface if easier, or just return as is.
    // The current consumers expect: { content, category, ... } 

    return results.map(r => ({
      content: r.content,
      similarity: r.score,
      category: r.tags.length > 0 ? r.tags[0] : 'general',
      entity_id: r.id
    }));

  } catch (err) {
    console.error('searchL4Knowledge Error:', err);
    // Fail gracefully or throw depending on requirements
    return [];
  }
}

