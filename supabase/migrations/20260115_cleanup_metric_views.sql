-- Cleanup old metric views and canonicalize v2
-- Fixed aggregation logic for compatibility

CREATE OR REPLACE VIEW view_session_journey AS
SELECT 
    fe.session_id,
    fe.visitor_id,
    MIN(fe.created_at) AS session_start,
    MAX(fe.created_at) AS session_end,
    COUNT(DISTINCT fe.step_name) AS funnel_steps_completed,
    MAX(fe.step_number) AS max_step_reached,
    
    BOOL_OR(fe.step_name = 'external_link_click') AS reached_conversion_step,
    
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
    
    (
        SELECT COUNT(*) 
        FROM nudge_logs n 
        WHERE n.visitor_id = fe.visitor_id 
        AND n.conversion_status = 'clicked'
        AND n.clicked_at >= MIN(fe.created_at) - INTERVAL '1 hour' 
        AND n.clicked_at <= MAX(fe.created_at) + INTERVAL '1 hour'
    ) AS partner_clicks,
    
    ARRAY_AGG(DISTINCT fe.step_name ORDER BY fe.step_name) AS steps_completed

FROM funnel_events fe
GROUP BY fe.session_id, fe.visitor_id;

DROP VIEW IF EXISTS view_daily_session_quality;

CREATE OR REPLACE VIEW view_daily_session_quality AS
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
