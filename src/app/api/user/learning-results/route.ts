import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  FacilityPreferenceWeight,
  DecisionLog,
  LearningResultsResponse,
  DEFAULT_SCORING_CONFIG
} from '@/lib/types/userLearning';
import { calculateWeightedScore } from '@/lib/types/userLearning';

// Initialize Supabase client - Use server-side environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

// Get Supabase client instance
const getSupabaseClient = () => {
  if (!supabaseUrl || !supabaseKey) {
    console.warn('[Learning Results API] Supabase credentials not configured');
    return null;
  }
  return createClient(supabaseUrl, supabaseKey);
};

// GET /api/user/learning-results - Get user's learning results (memory scoring status)
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'user_id is required'
      }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    if (!supabase) {
      const duration = Date.now() - startTime;
      console.log(`[Learning Results API] Demo: ${duration}ms - User ${userId}`);

      return NextResponse.json({
        success: true,
        user_id: userId,
        facility_weights: [],
        recent_decisions: [],
        total_decisions: 0,
        average_decision_time_ms: null,
        mode: 'demo',
        response_time_ms: duration
      } as LearningResultsResponse & { mode: string; response_time_ms: number });
    }

    // 1. Fetch facility preference weights
    const { data: weights, error: weightsError } = await supabase
      .from('facility_preference_weights')
      .select('*')
      .eq('user_id', userId)
      .order('combined_score', { ascending: false });

    if (weightsError) throw weightsError;

    // 2. Fetch recent decisions
    const { data: decisions, error: decisionsError } = await supabase
      .from('decision_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (decisionsError) throw decisionsError;

    // 3. Calculate aggregate statistics
    const { data: stats } = await supabase
      .from('decision_logs')
      .select('decision_duration_ms')
      .eq('user_id', userId);

    const avgDecisionTime = stats && stats.length > 0
      ? stats.reduce((sum: number, d: any) => sum + (d.decision_duration_ms || 0), 0) / stats.length
      : null;

    const facilityWeights: FacilityPreferenceWeight[] = (weights || []).map(w => ({
      ...w,
      last_selected_at: w.last_selected_at ? new Date(w.last_selected_at).getTime() : null,
      updated_at: new Date(w.updated_at).getTime()
    }));

    const recentDecisions: DecisionLog[] = (decisions || []).map(d => ({
      ...d,
      created_at: new Date(d.created_at).getTime()
    }));

    const { count: totalDecisions } = await supabase
      .from('decision_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const duration = Date.now() - startTime;
    console.log(`[Learning Results API] ${duration}ms - User ${userId}: ${facilityWeights.length} weights`);

    return NextResponse.json({
      success: true,
      user_id: userId,
      facility_weights: facilityWeights,
      recent_decisions: recentDecisions,
      total_decisions: totalDecisions || 0,
      average_decision_time_ms: avgDecisionTime,
      response_time_ms: duration
    } as LearningResultsResponse & { response_time_ms: number });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Learning Results API] Error (${duration}ms):`, error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch learning results',
      response_time_ms: duration
    }, { status: 500 });
  }
}

// POST /api/user/learning-results - Trigger learning recalculation
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await request.json();
    const { user_id, facility_types } = body;

    if (!user_id) {
      return NextResponse.json({
        success: false,
        error: 'user_id is required'
      }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    if (!supabase) {
      const duration = Date.now() - startTime;
      return NextResponse.json({
        success: true,
        message: `Demo: Recalculated scores for ${facility_types?.length > 0 ? facility_types.join(', ') : 'all'} facility types`,
        mode: 'demo',
        response_time_ms: duration
      });
    }

    const typesToRecalculate = facility_types || [];

    if (typesToRecalculate.length > 0) {
      for (const facilityType of typesToRecalculate) {
        const { data: weights } = await supabase
          .from('facility_preference_weights')
          .select('*')
          .eq('user_id', user_id)
          .eq('facility_type', facilityType)
          .single();

        if (weights) {
          const newScore = calculateWeightedScore(
            weights.selection_count,
            weights.last_selected_at ? new Date(weights.last_selected_at).getTime() : null,
            Math.round(weights.positive_feedback_score * 20),
            Math.round((1 - weights.negative_feedback_score) * 10),
            DEFAULT_SCORING_CONFIG
          );

          await supabase
            .from('facility_preference_weights')
            .update({
              combined_score: newScore,
              version: weights.version + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', weights.id);
        }
      }
    } else {
      const { data: allWeights } = await supabase
        .from('facility_preference_weights')
        .select('*')
        .eq('user_id', user_id);

      if (allWeights) {
        for (const weights of allWeights) {
          const newScore = calculateWeightedScore(
            weights.selection_count,
            weights.last_selected_at ? new Date(weights.last_selected_at).getTime() : null,
            Math.round(weights.positive_feedback_score * 20),
            Math.round((1 - weights.negative_feedback_score) * 10),
            DEFAULT_SCORING_CONFIG
          );

          await supabase
            .from('facility_preference_weights')
            .update({
              combined_score: newScore,
              version: weights.version + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', weights.id);
        }
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[Learning Results API] Recalculation: ${duration}ms - User ${user_id}`);

    return NextResponse.json({
      success: true,
      message: `Recalculated scores for ${typesToRecalculate.length > 0 ? typesToRecalculate.join(', ') : 'all'} facility types`,
      response_time_ms: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Learning Results API] Recalculation error (${duration}ms):`, error);
    return NextResponse.json({
      success: false,
      error: 'Failed to recalculate scores',
      response_time_ms: duration
    }, { status: 500 });
  }
}
