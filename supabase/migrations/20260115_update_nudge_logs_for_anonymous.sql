-- Allow anonymous tracking in nudge_logs
ALTER TABLE nudge_logs ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE nudge_logs ADD COLUMN IF NOT EXISTS visitor_id text;

-- Index for visitor lookup
CREATE INDEX IF NOT EXISTS idx_nudge_logs_visitor ON nudge_logs(visitor_id);
