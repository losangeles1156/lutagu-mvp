import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy Singleton Pattern to prevent Build-Time Crashes
let supabaseInstance: SupabaseClient | null = null;
let supabaseAdminInstance: SupabaseClient | null = null;

// Helper to get keys safely
function getEnvConfig() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Standard client MUST use Anon Key for RAG/Static data access and standard auth
    const supabaseKey = supabaseAnonKey;
    return { supabaseUrl, supabaseKey, supabaseServiceKey };
}

// Lazy Getter for Default Client
export function getSupabase(): SupabaseClient {
    if (supabaseInstance) return supabaseInstance;

    const { supabaseUrl, supabaseKey } = getEnvConfig();

    if (!supabaseUrl || !supabaseKey) {
        // [Safety] If specific keys are missing during runtime, throw descriptive error
        if (typeof window !== 'undefined') {
            console.error('[Supabase] Missing Credentials. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.');
        }
        throw new Error('Supabase URL or Key is missing. Check environment variables.');
    }

    supabaseInstance = createClient(supabaseUrl, supabaseKey);
    return supabaseInstance;
}

// Lazy Getter for Admin Client
export function getSupabaseAdmin(): SupabaseClient {
    if (supabaseAdminInstance) return supabaseAdminInstance;

    const { supabaseUrl, supabaseServiceKey } = getEnvConfig();

    if (!supabaseUrl || !supabaseServiceKey) {
        // Fallback to standard (might fail if standard is also missing)
        return getSupabase();
    }

    supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceKey);
    return supabaseAdminInstance;
}

// [BACKWARDS COMPATIBILITY PROXY]
// This allows imports like `import { supabase } from '@/lib/supabase'` to keep working
// without rewriting the entire codebase immediately.
// It proxies property access to the lazy instance.
export const supabase = new Proxy({} as SupabaseClient, {
    get: (_target, prop) => {
        try {
            const client = getSupabase();
            // @ts-ignore
            return client[prop];
        } catch (e) {
            console.error(`[Supabase Proxy] Error accessing "${String(prop)}":`, e);
            return () => { throw new Error(`Supabase client not initialized: ${String(prop)}`); };
        }
    }
});

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
    get: (_target, prop) => {
        try {
            const client = getSupabaseAdmin();
            // @ts-ignore
            return client[prop];
        } catch (e) {
            console.error(`[Supabase Proxy] Error accessing "${String(prop)}":`, e);
            return () => { throw new Error(`Supabase Admin client not initialized: ${String(prop)}`); };
        }
    }
});
