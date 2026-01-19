-- 1. Funnel Definitions Table
CREATE TABLE IF NOT EXISTS funnels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  steps jsonb NOT NULL, -- Array of step names/ids
  created_at timestamptz DEFAULT now()
);

-- 2. Funnel Events Table (High volume)
CREATE TABLE IF NOT EXISTS funnel_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id uuid REFERENCES funnels(id),
  user_id text, -- Optional: authenticated user id
  visitor_id text NOT NULL, -- Anonymous ID from cookie/fingerprint
  session_id text NOT NULL, -- Session ID
  step_number int NOT NULL,
  step_name text NOT NULL,
  metadata jsonb, -- Extra data (e.g. decision duration)
  created_at timestamptz DEFAULT now()
);

-- Indices for analytics
CREATE INDEX IF NOT EXISTS idx_funnel_events_session ON funnel_events(session_id);
CREATE INDEX IF NOT EXISTS idx_funnel_events_funnel_step ON funnel_events(funnel_id, step_number);
CREATE INDEX IF NOT EXISTS idx_funnel_events_created_at ON funnel_events(created_at);

-- RLS
ALTER TABLE funnel_events ENABLE ROW LEVEL SECURITY;

-- Allow public to insert events (tracking)
CREATE POLICY "Allow public insert to funnel_events"
ON funnel_events FOR INSERT
WITH CHECK (true);

-- Only service role (admin) can select/analyze
CREATE POLICY "Allow service role read funnel_events"
ON funnel_events FOR SELECT
USING (auth.role() = 'service_role');

-- 3. Extend Nudge Logs for Partner Tracking
-- We add columns to the existing nudge_logs table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='nudge_logs' AND column_name='clicked_at') THEN
        ALTER TABLE nudge_logs ADD COLUMN clicked_at timestamptz;
        ALTER TABLE nudge_logs ADD COLUMN conversion_status text DEFAULT 'pending'; -- pending, clicked
        ALTER TABLE nudge_logs ADD COLUMN referral_url text;
    END IF;
END $$;

-- 4. Partner Performance View
CREATE MATERIALIZED VIEW IF NOT EXISTS partner_performance AS
SELECT
  partner_id,
  COUNT(*) as total_suggestions,
  COUNT(clicked_at) as total_clicks,
  ROUND(100.0 * COUNT(clicked_at) / NULLIF(COUNT(*), 0), 2) as click_rate,
  DATE_TRUNC('day', created_at) as date
FROM nudge_logs
GROUP BY partner_id, DATE_TRUNC('day', created_at);

CREATE INDEX IF NOT EXISTS idx_partner_performance_date ON partner_performance(date);

-- Insert Default Funnels
INSERT INTO funnels (name, description, steps) VALUES
('ai_chat_to_decision', 'Main User Journey from Chat to Decision',
 '[{"step": 1, "name": "query_input"}, {"step": 2, "name": "ai_response_received"}, {"step": 3, "name": "location_selected"}, {"step": 4, "name": "facility_viewed"}, {"step": 5, "name": "external_link_click"}]'::jsonb)
ON CONFLICT (name) DO NOTHING;
