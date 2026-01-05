import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Lazy initialization to avoid build-time errors
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseKey);
}

/**
 * L4 Semantic Search API
 * 
 * Enables AI Agent to efficiently retrieve relevant knowledge without
 * returning all knowledge for a station.
 * 
 * Query Parameters:
 * - query: The user's question or context (will be embedded)
 * - station_id: Filter by specific station (optional)
 * - knowledge_type: Filter by type (railway, hub_station, accessibility, etc.)
 * - user_context: JSON array of user contexts (wheelchair, stroller, largeLuggage, etc.)
 * - time_context: Current time context (weekday-morning, weekday-evening, weekend, holiday)
 * - top_k: Number of results to return (default: 5)
 * - threshold: Similarity threshold (default: 0.5)
 * 
 * Response:
 * {
 *   success: true,
 *   results: [
 *     {
 *       content: "Relevant knowledge text",
 *       icon: "💡",
 *       category: "tip",
 *       relevance_score: 0.85,
 *       knowledge_type: "hub_station"
 *     }
 *   ],
 *   metadata: {
 *     query: "User's question",
 *     total_results: 5,
 *     generation_time_ms: 150
 *   }
 * }
 */

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const {
      query,
      station_id,
      knowledge_type,
      user_context = [],
      time_context,
      top_k = 5,
      threshold = 0.5
    } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Step 1: Generate embedding for the query
    // Note: In production, this should use a proper embedding API
    // For now, we'll use the RPC function with a placeholder approach
    // or implement a simple embedding generation

    const embedding = await generateQueryEmbedding(query);

    if (!embedding || embedding.length === 0) {
      return NextResponse.json(
        { error: 'Failed to generate query embedding' },
        { status: 500 }
      );
    }

    // Step 2: Build the database query with filters
    const supabase = getSupabaseClient();
    let dbQuery = supabase
      .rpc('match_l4_knowledge', {
        query_embedding: embedding,
        match_threshold: threshold,
        match_count: top_k,
        filter_knowledge_type: knowledge_type || null,
        filter_entity_id: station_id || null,
        filter_category: null,
        filter_user_context: user_context.length > 0 ? user_context : null,
        filter_time_context: time_context ? [time_context] : null
      });

    const { data: results, error } = await dbQuery;

    if (error) {
      console.error('L4 Semantic Search Error:', error);
      return NextResponse.json(
        { error: 'Search failed', details: error },
        { status: 500 }
      );
    }

    // Step 3: Apply contextual scoring if user_context or time_context provided
    let scoredResults = results || [];

    if (user_context.length > 0 || time_context) {
      scoredResults = scoredResults.map((item: any) => {
        let relevanceScore = item.similarity || 0;

        // Boost for matching user context
        if (user_context.length > 0) {
          const userContextMatch = item.user_context?.some((ctx: string) =>
            user_context.includes(ctx)
          );
          if (userContextMatch) {
            relevanceScore += 0.15;
          }
        }

        // Boost for matching time context
        if (time_context && item.time_context?.includes(time_context)) {
          relevanceScore += 0.1;
        }

        return {
          ...item,
          relevance_score: Math.min(relevanceScore, 1.0)
        };
      });

      // Re-sort by relevance score
      scoredResults.sort((a: any, b: any) =>
        (b.relevance_score || 0) - (a.relevance_score || 0)
      );
    }

    const generationTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      results: scoredResults.map((item: any) => ({
        id: item.id,
        content: item.content,
        icon: item.icon,
        category: item.category,
        subcategory: item.subcategory,
        knowledge_type: item.knowledge_type,
        entity_id: item.entity_id,
        relevance_score: item.similarity || item.relevance_score,
        entity_name: item.entity_name
      })),
      metadata: {
        query,
        total_results: scoredResults.length,
        generation_time_ms: generationTime,
        filters_applied: {
          station_id,
          knowledge_type,
          user_context,
          time_context
        }
      }
    });

  } catch (error) {
    console.error('L4 Semantic Search Exception:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Generate embedding for the query
 * In production, this should call an embedding API like Google Gemini or OpenAI
 */
async function generateQueryEmbedding(query: string): Promise<number[]> {
  // Try GOOGLE_API_KEY first (for Gemini embedding), fallback to any available key
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.MISTRAL_API_KEY;

  if (!apiKey) {
    console.warn('No embedding API key found (GOOGLE_API_KEY, GEMINI_API_KEY, MISTRAL_API_KEY), using fallback');
    return fallbackEmbedding(query);
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: { parts: [{ text: query }] }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Embedding API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.embedding?.values || fallbackEmbedding(query);
  } catch (error) {
    console.error('Error generating embedding:', error);
    return fallbackEmbedding(query);
  }
}

/**
 * Fallback embedding function using simple keyword matching
 * This is a placeholder - real implementations should use proper embeddings
 */
function fallbackEmbedding(query: string): number[] {
  const embedding = new Array(768).fill(0);

  // Simple keyword-based scoring (for demo purposes)
  const keywords: Record<string, number[]> = {
    '電梯': Array(768).fill(0).map((_, i) => (i % 10 === 0 ? 0.5 : 0)),
    '輪椅': Array(768).fill(0).map((_, i) => (i % 20 === 0 ? 0.6 : 0)),
    '行李': Array(768).fill(0).map((_, i) => (i % 30 === 0 ? 0.4 : 0)),
    '轉乘': Array(768).fill(0).map((_, i) => (i % 40 === 0 ? 0.5 : 0)),
    '尖峰': Array(768).fill(0).map((_, i) => (i % 50 === 0 ? 0.7 : 0)),
    '電扶梯': Array(768).fill(0).map((_, i) => (i % 60 === 0 ? 0.5 : 0)),
    '廁所': Array(768).fill(0).map((_, i) => (i % 70 === 0 ? 0.6 : 0)),
    '無障礙': Array(768).fill(0).map((_, i) => (i % 80 === 0 ? 0.7 : 0)),
  };

  for (const [keyword, weights] of Object.entries(keywords)) {
    if (query.includes(keyword)) {
      weights.forEach((weight, idx) => {
        embedding[idx] += weight;
      });
    }
  }

  // Normalize
  const max = Math.max(...embedding);
  if (max > 0) {
    embedding.forEach((_, idx) => {
      embedding[idx] /= max;
    });
  }

  return embedding;
}

/**
 * GET endpoint for simple queries
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const query = searchParams.get('q');
  const station_id = searchParams.get('station_id');
  const knowledge_type = searchParams.get('type');
  const user_context = searchParams.get('user_context')?.split(',') || [];
  const time_context = searchParams.get('time_context');
  const top_k = parseInt(searchParams.get('top_k') || '5');

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter "q" is required' },
      { status: 400 }
    );
  }

  // Call POST internally
  return POST(new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify({
      query,
      station_id,
      knowledge_type,
      user_context,
      time_context,
      top_k
    })
  }));
}
