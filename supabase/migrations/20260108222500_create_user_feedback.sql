-- User Feedback Hub: Create user_feedback table
-- Supports: general, bug, spot, tip feedback types

CREATE TABLE IF NOT EXISTS user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  node_id TEXT, -- Optional: associated station node
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('general', 'bug', 'spot', 'tip')),
  category TEXT, -- Sub-category (e.g., 'accessibility', 'navigation', 'food')
  title TEXT,
  content TEXT NOT NULL,
  rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  media_urls JSONB DEFAULT '[]'::jsonb, -- Array of image/video URLs
  metadata JSONB DEFAULT '{}'::jsonb, -- Device info, app version, etc.
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'published')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_user_feedback_type ON user_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_user_feedback_node ON user_feedback(node_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_status ON user_feedback(status);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created ON user_feedback(created_at DESC);

-- Enable RLS
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own feedback (or anonymous)
CREATE POLICY "Anyone can submit feedback" ON user_feedback
  FOR INSERT
  WITH CHECK (true);

-- Policy: Users can view their own feedback
CREATE POLICY "Users can view own feedback" ON user_feedback
  FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL);

-- Grant permissions
GRANT SELECT, INSERT ON user_feedback TO authenticated, anon;
