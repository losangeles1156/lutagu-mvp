import { createClient, SupabaseClient } from '@supabase/supabase-js';

function getSupabaseUrl() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is missing');
    return url;
}

function getSupabaseAnonKey() {
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!key) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is missing');
    return key;
}

export function getBearerToken(request: Request) {
    const auth = request.headers.get('authorization');
    if (!auth) return null;
    const m = auth.match(/^Bearer\s+(.+)$/i);
    return m?.[1] || null;
}

export function createRlsClient(accessToken: string): SupabaseClient {
    return createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
        global: {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        },
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        }
    });
}

export function createAnonClient(): SupabaseClient {
    return createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        }
    });
}

export async function requireUser(request: Request) {
    const token = getBearerToken(request);
    if (!token) return { ok: false as const, status: 401 as const };

    const supabase = createAnonClient();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return { ok: false as const, status: 401 as const };

    return {
        ok: true as const,
        token,
        user: data.user,
        rls: createRlsClient(token)
    };
}

export async function requireAdmin(request: Request) {
    const auth = await requireUser(request);
    if (!auth.ok) return auth;

    // Use admin client to bypass RLS for role check if needed,
    // or just use RPC if we have the is_admin() function.
    const { data: isAdmin, error } = await auth.rls.rpc('is_admin');

    if (error || !isAdmin) {
        return { ok: false as const, status: 403 as const };
    }

    return auth;
}
