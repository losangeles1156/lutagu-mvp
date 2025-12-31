'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Session, SupabaseClient } from '@supabase/supabase-js';

import { getSupabase } from '@/lib/supabase';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

function normalizeNextPath(nextPath: string | null, locale: string) {
    if (!nextPath) return `/${locale}`;
    if (!nextPath.startsWith('/')) return `/${locale}`;
    if (nextPath.startsWith('//')) return `/${locale}`;
    if (nextPath.includes('://')) return `/${locale}`;
    if (nextPath.includes('\\')) return `/${locale}`;
    if (nextPath === `/${locale}/login` || nextPath.startsWith(`/${locale}/login?`)) return `/${locale}`;
    return nextPath;
}

export default function LoginPage() {
    const locale = useLocale();
    const router = useRouter();
    const searchParams = useSearchParams();

    const nextPathRaw = searchParams.get('next');
    const nextPath = normalizeNextPath(nextPathRaw, locale);

    const supabase = useMemo<SupabaseClient | null>(() => {
        try {
            return getSupabase();
        } catch {
            return null;
        }
    }, []);

    const [email, setEmail] = useState('');
    const [busy, setBusy] = useState(false);
    const [session, setSession] = useState<Session | null>(null);
    const [sentMagicLink, setSentMagicLink] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [readyToContinue, setReadyToContinue] = useState(false);

    const ensuredProfileUserIdRef = useRef<string | null>(null);

    useEffect(() => {
        if (!supabase) return;
        const client = supabase;
        let cancelled = false;

        async function load() {
            const { data } = await client.auth.getSession();
            if (cancelled) return;
            setSession(data.session || null);
        }

        void load();

        const { data } = client.auth.onAuthStateChange((_event, session) => {
            setSession(session || null);
        });

        return () => {
            cancelled = true;
            data.subscription.unsubscribe();
        };
    }, [supabase]);

    useEffect(() => {
        if (session) return;
        ensuredProfileUserIdRef.current = null;
        setReadyToContinue(false);
    }, [session]);

    useEffect(() => {
        if (!session) return;
        if (!supabase) return;
        if (!session.access_token) return;

        const userId = session.user.id;
        const accessToken = session.access_token;
        if (ensuredProfileUserIdRef.current === userId) return;

        ensuredProfileUserIdRef.current = userId;
        let cancelled = false;

        async function ensureProfile() {
            setBusy(true);
            setError(null);
            setReadyToContinue(false);
            try {
                const res = await fetch('/api/me', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                });

                if (!res.ok) {
                    let details = '';
                    try {
                        details = await res.text();
                    } catch {
                        details = '';
                    }
                    throw new Error(`登入後初始化失敗（${res.status}）${details ? `：${details}` : ''}`);
                }

                if (cancelled) return;
                setReadyToContinue(true);
            } catch (e: any) {
                if (cancelled) return;
                ensuredProfileUserIdRef.current = null;
                setError(e?.message || '登入後初始化失敗');
            } finally {
                if (cancelled) return;
                setBusy(false);
            }
        }

        void ensureProfile();
        return () => {
            cancelled = true;
        };
    }, [nextPath, router, session, supabase]);

    async function signInWithGoogle() {
        setError(null);
        setSentMagicLink(false);
        if (!supabase) {
            setError('Supabase 環境變數未設定');
            return;
        }

        setBusy(true);
        try {
            const origin = window.location.origin;
            const redirectTo = `${origin}/${locale}/login?next=${encodeURIComponent(nextPath)}`;
            const { error: authError } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo }
            });
            if (authError) {
                setError(authError.message);
                return;
            }
        } finally {
            setBusy(false);
        }
    }

    async function sendMagicLink() {
        setError(null);
        setSentMagicLink(false);

        if (!supabase) {
            setError('Supabase 環境變數未設定');
            return;
        }
        if (!email.trim()) {
            setError('請輸入 Email');
            return;
        }

        setBusy(true);
        try {
            const origin = window.location.origin;
            const emailRedirectTo = `${origin}/${locale}/login?next=${encodeURIComponent(nextPath)}`;
            const { error: authError } = await supabase.auth.signInWithOtp({
                email: email.trim(),
                options: { emailRedirectTo }
            });
            if (authError) {
                setError(authError.message);
                return;
            }
            setSentMagicLink(true);
        } finally {
            setBusy(false);
        }
    }

    async function signOut() {
        setError(null);
        if (!supabase) {
            setError('Supabase 環境變數未設定');
            return;
        }
        setBusy(true);
        try {
            const res = await supabase.auth.signOut();
            if (res.error) {
                setError(res.error.message);
                return;
            }
            setSession(null);
        } finally {
            setBusy(false);
        }
    }



    return (
        <main className="min-h-screen bg-slate-50 relative">
            <div className="absolute top-4 right-4 z-10">
                <LanguageSwitcher />
            </div>
            <div className="max-w-md mx-auto px-6 py-10">
                <div className="text-xl font-black tracking-tight text-slate-900">會員登入</div>
                <div className="mt-1 text-xs font-bold text-slate-500">
                    {session?.user?.email ? `目前登入：${session.user.email}` : '匿名使用中（可先試用地圖）'}
                </div>

                {session?.access_token && (
                    <div className="mt-4 grid gap-2">
                        <button
                            type="button"
                            onClick={() => router.replace(nextPath)}
                            disabled={busy || !readyToContinue}
                            className="w-full py-3 rounded-2xl bg-slate-900 text-white font-black text-sm hover:bg-slate-800 disabled:opacity-60"
                        >
                            繼續
                        </button>
                    </div>
                )}

                <div className="mt-6 bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
                    <div className="grid gap-3">
                        <button
                            onClick={signInWithGoogle}
                            disabled={busy}
                            className="w-full py-3 rounded-2xl bg-slate-900 text-white font-black text-sm hover:bg-slate-800 disabled:opacity-60"
                        >
                            使用 Google 登入 / 註冊
                        </button>

                        <div className="pt-2">
                            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">或</div>
                        </div>

                        <label className="grid gap-2">
                            <div className="text-xs font-black text-slate-700">Email（Magic Link）</div>
                            <input
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                type="email"
                                className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-200"
                                placeholder="you@example.com"
                                autoComplete="email"
                            />
                        </label>

                        <button
                            onClick={sendMagicLink}
                            disabled={busy}
                            className="w-full py-3 rounded-2xl bg-indigo-600 text-white font-black text-sm hover:bg-indigo-700 disabled:opacity-60"
                        >
                            寄送登入連結
                        </button>

                        {sentMagicLink && (
                            <div className="px-4 py-3 rounded-2xl bg-emerald-50 text-emerald-800 text-sm font-bold border border-emerald-100">
                                已寄出登入連結，請到信箱點擊完成登入。
                            </div>
                        )}

                        {error && (
                            <div className="px-4 py-3 rounded-2xl bg-rose-50 text-rose-800 text-sm font-bold border border-rose-100">
                                {error}
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => router.replace(nextPath)}
                                disabled={busy}
                                className="flex-1 py-3 rounded-2xl bg-white border border-slate-200 text-slate-700 font-black text-sm hover:bg-slate-50 disabled:opacity-60"
                            >
                                先不登入
                            </button>
                            <button
                                onClick={signOut}
                                disabled={busy || !session}
                                className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-800 font-black text-sm hover:bg-slate-200 disabled:opacity-60"
                            >
                                登出
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
