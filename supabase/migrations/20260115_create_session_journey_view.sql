-- Migration: Create Session Journey View
-- Purpose: Provide a unified view of user journey across funnel, feedback, and conversions.
-- This enables answering: "Did this session lead to satisfaction AND conversion?"

-- 1. Core Session Journey View
-- Aggregates session-level data from multiple tables
CREATE OR REPLACE VIEW view_session_journey AS
SELECT
    fe.session_id,
    fe.visitor_id,
    MIN(fe.created_at) AS session_start,
    MAX(fe.created_at) AS session_end,
    COUNT(DISTINCT fe.step_name) AS funnel_steps_completed,
    MAX(fe.step_number) AS max_step_reached,

    -- Did they reach the final step? (external_link_click)
    BOOL_OR(fe.step_name = 'external_link_click') AS reached_conversion_step,

    -- Feedback aggregation (from ai_chat_feedback)
    (
        SELECT COALESCE(SUM(f.score), 0)
        FROM ai_chat_feedback f
        WHERE f.session_id = fe.session_id
    ) AS feedback_score_sum,
    (
        SELECT COUNT(*)
        FROM ai_chat_feedback f
        WHERE f.session_id = fe.session_id
    ) AS feedback_count,

    -- Conversion aggregation (from nudge_logs)
    (
        SELECT COUNT(*)
        FROM nudge_logs n
        WHERE n.visitor_id = fe.visitor_id
        AND n.conversion_status = 'clicked'
        AND n.clicked_at BETWEEN fe.created_at - INTERVAL '1 hour' AND fe.created_at + INTERVAL '1 hour'
    ) AS partner_clicks,

    -- Extract step progression as array
    ARRAY_AGG(DISTINCT fe.step_name ORDER BY fe.step_name) AS steps_completed

FROM funnel_events fe
GROUP BY fe.session_id, fe.visitor_id;

-- 2. Daily Session Quality Summary
-- Aggregates view_session_journey by day for dashboard
CREATE OR REPLACE VIEW view_daily_session_quality_v2 AS
SELECT
    DATE_TRUNC('day', session_start) AS date,
    COUNT(*) AS total_sessions,
    COUNT(*) FILTER (WHERE max_step_reached >= 3) AS engaged_sessions,
    COUNT(*) FILTER (WHERE reached_conversion_step) AS conversion_sessions,
    COUNT(*) FILTER (WHERE feedback_score_sum > 0) AS positive_feedback_sessions,
    COUNT(*) FILTER (WHERE feedback_score_sum < 0) AS negative_feedback_sessions,
    ROUND(100.0 * COUNT(*) FILTER (WHERE reached_conversion_step) / NULLIF(COUNT(*), 0), 2) AS conversion_rate_pct,
    ROUND(100.0 * COUNT(*) FILTER (WHERE max_step_reached >= 3) / NULLIF(COUNT(*), 0), 2) AS problem_solution_rate_pct
FROM view_session_journey
GROUP BY DATE_TRUNC('day', session_start)
ORDER BY date DESC;

-- 3. Indexes for performance (on source tables, already exist but noting for clarity)
-- CREATE INDEX IF NOT EXISTS idx_funnel_events_session ON funnel_events(session_id);
-- CREATE INDEX IF NOT EXISTS idx_ai_feedback_session ON ai_chat_feedback(session_id);
-- CREATE INDEX IF NOT EXISTS idx_nudge_logs_visitor ON nudge_logs(visitor_id);

-- 4. Grant access to views (service role only)
-- Views inherit RLS from underlying tables, but explicit grants ensure service role access

COMMENT ON VIEW view_session_journey IS 'Unified session-level view linking funnel progression, AI feedback, and partner conversions.';
COMMENT ON VIEW view_daily_session_quality_v2 IS 'Daily aggregation of session quality metrics including conversion and feedback rates.';
