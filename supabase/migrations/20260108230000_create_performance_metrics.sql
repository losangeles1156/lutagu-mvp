-- =====================================================
-- Performance Metrics Table
-- Tracks API response times and request patterns
-- =====================================================

CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL DEFAULT 'GET',
    response_time_ms INTEGER NOT NULL,
    status_code INTEGER NOT NULL DEFAULT 200,
    user_agent TEXT,
    locale TEXT DEFAULT 'zh-TW',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_performance_metrics_created_at 
ON performance_metrics(created_at DESC);

-- Index for endpoint analysis
CREATE INDEX IF NOT EXISTS idx_performance_metrics_endpoint 
ON performance_metrics(endpoint);

-- Index for request correlation
CREATE INDEX IF NOT EXISTS idx_performance_metrics_request_id 
ON performance_metrics(request_id);

-- =====================================================
-- AI Chat Metrics Table
-- Tracks AI-specific quality metrics
-- =====================================================

CREATE TABLE IF NOT EXISTS ai_chat_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id TEXT NOT NULL,
    session_id TEXT,
    node_id TEXT,
    locale TEXT DEFAULT 'zh-TW',
    response_time_ms INTEGER NOT NULL,
    tools_called TEXT[] DEFAULT '{}',
    tool_count INTEGER DEFAULT 0,
    input_length INTEGER DEFAULT 0,
    output_length INTEGER DEFAULT 0,
    had_error BOOLEAN DEFAULT false,
    error_message TEXT,
    user_feedback_score INTEGER, -- Links to user feedback if given
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_ai_chat_metrics_created_at 
ON ai_chat_metrics(created_at DESC);

-- Index for node analysis
CREATE INDEX IF NOT EXISTS idx_ai_chat_metrics_node_id 
ON ai_chat_metrics(node_id);

-- =====================================================
-- Views for Quick Analytics
-- =====================================================

-- API Performance Summary (last 24h)
CREATE OR REPLACE VIEW v_api_performance_24h AS
SELECT 
    endpoint,
    COUNT(*) as request_count,
    AVG(response_time_ms)::INTEGER as avg_ms,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_time_ms)::INTEGER as p50_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms)::INTEGER as p95_ms,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time_ms)::INTEGER as p99_ms,
    COUNT(*) FILTER (WHERE status_code >= 500) as error_count
FROM performance_metrics
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY endpoint
ORDER BY request_count DESC;

-- AI Quality Summary (last 24h)
CREATE OR REPLACE VIEW v_ai_quality_24h AS
SELECT 
    locale,
    COUNT(*) as total_requests,
    AVG(response_time_ms)::INTEGER as avg_response_ms,
    AVG(tool_count)::NUMERIC(3,1) as avg_tools_per_request,
    COUNT(*) FILTER (WHERE had_error) as error_count,
    AVG(output_length)::INTEGER as avg_output_length
FROM ai_chat_metrics
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY locale;

-- Hourly request volume
CREATE OR REPLACE VIEW v_hourly_volume AS
SELECT 
    DATE_TRUNC('hour', created_at) as hour,
    COUNT(*) as request_count,
    AVG(response_time_ms)::INTEGER as avg_ms
FROM performance_metrics
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;

-- Grant access (adjust based on your RLS setup)
-- ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE ai_chat_metrics ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE performance_metrics IS 'Tracks API response times for monitoring and optimization';
COMMENT ON TABLE ai_chat_metrics IS 'Tracks AI chat quality metrics for analysis';
