import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { rateLimit } from '@/lib/security/rateLimit';

const VISITOR_COOKIE_NAME = 'bg_vid';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function getClientIp(req: NextRequest) {
    const forwardedFor = req.headers.get('x-forwarded-for');
    if (forwardedFor) return forwardedFor.split(',')[0]?.trim() || null;
    return req.headers.get('x-real-ip');
}

function normalizeOrigin(origin: string) {
    return origin.trim().replace(/\/+$/, '');
}

function addAllowedOrigin(set: Set<string>, value: string | null | undefined) {
    if (!value) return;
    const trimmed = value.trim();
    if (!trimmed) return;
    try {
        const url = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
        set.add(url.origin);
    } catch {
        return;
    }
}

function getAllowedOrigins(req: NextRequest) {
    const allowed = new Set<string>();
    addAllowedOrigin(allowed, req.nextUrl.origin);
    addAllowedOrigin(allowed, process.env.NEXT_PUBLIC_SITE_URL);
    addAllowedOrigin(allowed, process.env.SITE_URL);
    addAllowedOrigin(allowed, process.env.VERCEL_URL);
    if (process.env.NODE_ENV !== 'production') {
        addAllowedOrigin(allowed, 'http://localhost:3000');
        addAllowedOrigin(allowed, 'http://127.0.0.1:3000');
        addAllowedOrigin(allowed, 'http://localhost:3001');
        addAllowedOrigin(allowed, 'http://127.0.0.1:3001');
    }
    return allowed;
}

function getRequestOrigin(req: NextRequest) {
    const origin = req.headers.get('origin');
    if (origin) return normalizeOrigin(origin);
    const referer = req.headers.get('referer');
    if (!referer) return null;
    try {
        return new URL(referer).origin;
    } catch {
        return null;
    }
}

function enforceSameOriginApi(req: NextRequest) {
    const method = req.method.toUpperCase();
    const isSafe = SAFE_METHODS.has(method);
    const origin = getRequestOrigin(req);
    const allowed = getAllowedOrigins(req);
    const hasAuthorization = Boolean(req.headers.get('authorization'));

    if (origin) {
        if (allowed.has(origin)) return { ok: true as const };
        return { ok: false as const, status: 403 as const };
    }

    if (isSafe) return { ok: true as const };
    if (hasAuthorization) return { ok: true as const };
    return { ok: false as const, status: 403 as const };
}

function enforceEdgeRateLimitApi(req: NextRequest) {
    const pathname = req.nextUrl.pathname;
    const method = req.method.toUpperCase();
    const ip = getClientIp(req) || 'unknown';

    const isSafe = SAFE_METHODS.has(method);
    const perMinute = Number(process.env.EDGE_RATE_LIMIT_PER_MINUTE || (isSafe ? '300' : '120'));
    const capacity = Number.isFinite(perMinute) && perMinute > 0 ? perMinute : (isSafe ? 300 : 120);
    const refillPerSecond = capacity / 60;

    const key = `edge:${method}:${pathname}:${ip}`;
    const rl = rateLimit({ key, capacity, refillPerSecond });
    if (!rl.allowed) {
        return {
            ok: false as const,
            status: 429 as const,
            retryAfterSec: rl.retryAfterSec,
            limit: capacity
        };
    }

    return { ok: true as const, remaining: rl.remaining, limit: capacity };
}

function ensureVisitorId(req: NextRequest, res: NextResponse) {
    const existing = req.cookies.get(VISITOR_COOKIE_NAME)?.value;
    if (existing) return;

    const value = crypto.randomUUID();
    res.cookies.set({
        name: VISITOR_COOKIE_NAME,
        value,
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 180
    });
}

const intlMiddleware = createMiddleware({
    locales: ['zh', 'en', 'ja', 'zh-TW', 'ar'],
    defaultLocale: 'zh-TW',
    localePrefix: 'as-needed'
});

export default async function middleware(req: NextRequest) {
    const pathname = req.nextUrl.pathname;

    const isApi = pathname.startsWith('/api');
    if (isApi) {
        // Exempt AI chat endpoints from same-origin check
        // These endpoints use AI SDK TextStreamChatTransport which may not send Origin header correctly
        const isExemptedChatEndpoint = pathname.startsWith('/api/agent/chat') ||
            pathname.startsWith('/api/agent/v2') ||
            pathname.startsWith('/api/chat') ||
            pathname.startsWith('/api/agent/hybrid') ||
            pathname.startsWith('/api/agent/adk') ||
            pathname.startsWith('/api/agent/e2e');

        if (!isExemptedChatEndpoint) {
            const sameOrigin = enforceSameOriginApi(req);
            if (!sameOrigin.ok) return NextResponse.json({ error: 'Forbidden' }, { status: sameOrigin.status });
        }

        const edgeRl = enforceEdgeRateLimitApi(req);
        if (!edgeRl.ok) {
            return NextResponse.json(
                { error: 'Too Many Requests' },
                {
                    status: edgeRl.status,
                    headers: {
                        'Retry-After': String(edgeRl.retryAfterSec),
                        'X-RateLimit-Limit': String(edgeRl.limit)
                    } as any
                }
            );
        }

        const res = NextResponse.next();
        res.headers.set('X-RateLimit-Limit', String(edgeRl.limit));
        res.headers.set('X-RateLimit-Remaining', String(edgeRl.remaining));
        ensureVisitorId(req, res);
        return res;
    }

    const res = intlMiddleware(req);

    // Supabase Auth Integration
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseAnonKey) {
        const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
            cookies: {
                getAll() {
                    return req.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        req.cookies.set(name, value);
                        res.cookies.set(name, value, options);
                    });
                },
            },
        });
        await supabase.auth.getUser();
    }

    ensureVisitorId(req, res);
    return res;
}

export const config = {
    matcher: ['/((?!_next|.*\\..*).*)']
};
