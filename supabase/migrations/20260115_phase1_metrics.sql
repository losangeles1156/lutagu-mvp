-- Phase 1 Metrics & Dashboard Views

-- 1. North Star Metric: Problem Solution Rate (Daily)
-- Definition: Sessions that reached "facility_viewed" (Step 4) or "external_link_click" (Step 5)
-- divided by Total Sessions that started "query_input" (Step 1).

CREATE OR REPLACE VIEW view_daily_session_quality AS
SELECT
    DATE_TRUNC('day', created_at) as day,
    COUNT(DISTINCT session_id) as total_sessions,
    COUNT(DISTINCT CASE WHEN step_number >= 3 THEN session_id END) as engaged_sessions, -- Location Selected
    COUNT(DISTINCT CASE WHEN step_number >= 4 THEN session_id END) as solved_sessions, -- Facility View or External Click
    ROUND(100.0 * COUNT(DISTINCT CASE WHEN step_number >= 4 THEN session_id END) / NULLIF(COUNT(DISTINCT session_id), 0), 2) as solution_rate
FROM funnel_events
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY day DESC;

-- 2. Funnel Dropout Analysis
-- Aggregates counts per step name to see where users drop off.
CREATE OR REPLACE VIEW view_funnel_dropout AS
SELECT
    name as funnel_name,
    fe.step_number,
    fe.step_name,
    COUNT(DISTINCT fe.session_id) as unique_sessions,
    COUNT(*) as total_events
FROM funnels f
JOIN funnel_events fe ON f.id = fe.funnel_id
GROUP BY name, fe.step_number, fe.step_name
ORDER BY name, fe.step_number;

-- 3. Consolidated Partner Metrics (Enhancing existing materialized view if needed)
-- We'll just ensure the index exists for performance query on nudge_logs from route.ts
CREATE INDEX IF NOT EXISTS idx_nudge_logs_conversion ON nudge_logs(conversion_status);
