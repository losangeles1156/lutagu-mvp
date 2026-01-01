-- Migration: Create AI Tool Feedback Table
-- Description: Stores user feedback on AI responses, specifically for tool usage effectiveness.

CREATE TABLE IF NOT EXISTS ai_tool_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT,                 -- Optional: to track conversation context
    query_text TEXT,                 -- The user's question
    tool_used TEXT,                  -- e.g., 'get_nearby_accessibility_graph'
    tool_output_summary TEXT,        -- Brief summary of what the tool returned (e.g., "3 nodes, 5 links")
    user_rating BOOLEAN,             -- true = Helpful, false = Not Helpful
    feedback_category TEXT,          -- e.g., 'missing_path', 'wrong_info'
    feedback_text TEXT,              -- User's written comment
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster analysis queries
CREATE INDEX IF NOT EXISTS idx_ai_tool_feedback_tool ON ai_tool_feedback (tool_used);
CREATE INDEX IF NOT EXISTS idx_ai_tool_feedback_rating ON ai_tool_feedback (user_rating);

-- RLS Policies (Optional: Adjust based on your auth needs)
ALTER TABLE ai_tool_feedback ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (if your app allows public feedback)
CREATE POLICY "Allow public insert to feedback"
ON ai_tool_feedback FOR INSERT
TO anon
WITH CHECK (true);

-- Allow authenticated inserts
CREATE POLICY "Allow authenticated insert to feedback"
ON ai_tool_feedback FOR INSERT
TO authenticated
WITH CHECK (true);

-- Only service role can read (for analysis)
CREATE POLICY "Service role can read feedback"
ON ai_tool_feedback FOR SELECT
TO service_role
USING (true);
