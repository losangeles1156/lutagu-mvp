-- Persisted feedback loop for Go ADK intent routing.
-- Stores raw feedback events and learned tag weights.

CREATE TABLE IF NOT EXISTS public.agent_feedback_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id TEXT,
  user_id TEXT,
  session_id TEXT,
  locale TEXT,
  query TEXT,
  response TEXT,
  helpful BOOLEAN NOT NULL DEFAULT false,
  intent_tags TEXT[] NOT NULL DEFAULT '{}',
  node_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_feedback_events_created_at
  ON public.agent_feedback_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_feedback_events_user_id
  ON public.agent_feedback_events (user_id);

CREATE TABLE IF NOT EXISTS public.agent_feedback_weights (
  tag TEXT PRIMARY KEY,
  weight DOUBLE PRECISION NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_feedback_weights_updated_at
  ON public.agent_feedback_weights (updated_at DESC);
