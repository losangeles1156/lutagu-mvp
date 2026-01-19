-- Migration: Create AI Chat Feedback Table
-- Purpose: Store user feedback (thumbs up/down) for AI Agent responses to improve model quality.

-- 1. Create Table
CREATE TABLE IF NOT EXISTS public.ai_chat_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id TEXT,             -- Optional: Link to a specific chat session
    message_id TEXT,             -- Optional: Link to a specific message (if client generates IDs)
    score INTEGER NOT NULL CHECK (score IN (-1, 1)), -- 1 = Thumbs Up, -1 = Thumbs Down
    reason TEXT,                 -- Optional: "Inaccurate", "Too slow", "Helpful", etc.
    details JSONB DEFAULT '{}',  -- Optional: Context, raw prompt, or specific error details
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.ai_chat_feedback ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies

-- Policy: Allow authenticated users to insert their own feedback
CREATE POLICY "Users can insert their own feedback"
ON public.ai_chat_feedback
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Allow anonymous users to insert feedback (optional, depending on app logic)
-- If your app allows guest chat, uncomment the following:
CREATE POLICY "Anon can insert feedback"
ON public.ai_chat_feedback
FOR INSERT
TO anon
WITH CHECK (true);

-- Policy: Users can view their own feedback
CREATE POLICY "Users can view their own feedback"
ON public.ai_chat_feedback
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Admins/Service Role can view all (implicitly allowed for service_role, but explicit for admin users if needed)
-- Assuming you have an 'admin' role or check specific email
-- CREATE POLICY "Admins can view all feedback" ...

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_ai_feedback_user_id ON public.ai_chat_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_created_at ON public.ai_chat_feedback(created_at);
