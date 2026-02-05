
import { NextRequest, NextResponse } from 'next/server';
import { searchL4Knowledge } from '@/lib/l4/searchService';

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
      threshold = 0.5,
      language_mode: _language_mode = 'en'
    } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Enforce stable language mode from server config to avoid client-side overrides.
    const enforcedLanguageMode =
      (process.env.L4_LANGUAGE_MODE as 'en' | 'original' | 'dual') || 'en';

    if (enforcedLanguageMode !== 'en') {
      console.warn(
        `[L4Search] WARNING: L4_LANGUAGE_MODE="${enforcedLanguageMode}". Expected "en" for stable bilingual retrieval.`
      );
    }

    const results = await searchL4Knowledge({
      query,
      stationId: station_id,
      knowledgeType: knowledge_type,
      userContext: user_context,
      timeContext: time_context,
      topK: top_k,
      threshold,
      languageMode: enforcedLanguageMode
    });

    // Step 3: Apply contextual scoring if user_context or time_context provided
    let scoredResults = results.map((item: any) => {
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
        relevance_score: item.relevance_score,
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
          time_context,
          language_mode: enforcedLanguageMode
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
