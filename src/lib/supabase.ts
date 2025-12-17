import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Admin client for server-side operations (bypasses RLS)
// Only create if service key is available (server-side)
export const supabaseAdmin = supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : supabase; // Fallback to anon (shouldn't happen in admin scripts if configured right)
