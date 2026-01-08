'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';

import { getSupabase } from '@/lib/supabase';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useAppStore } from '@/stores/appStore';
import { DEMO_SCENARIOS } from '@/lib/l4/demoScenarios';
import { LoginChatPanel } from '@/components/chat/LoginChatPanel';

const SUPPORTED_LOCALES = ['zh', 'en', 'ja', 'zh-TW', 'ar'];

function normalizeNextPath(nextPath: string | null, locale: string) {
    if (!nextPath) return `/${locale}`;
    if (!nextPath.startsWith('/')) return `/${locale}`;
    if (nextPath.startsWith('//')) return `/${locale}`;
    if (nextPath.includes('://')) return `/${locale}`;
    if (nextPath.includes('\\')) return `/${locale}`;

    // Check if path is a login page in any locale - redirect to home instead
    const loginPathPattern = new RegExp(`^/(${SUPPORTED_LOCALES.join('|')})/login(?:\\?|$)`);
    if (loginPathPattern.test(nextPath)) return `/${locale}`;

    // Update locale prefix in the path to match current locale
    const localePattern = new RegExp(`^/(${SUPPORTED_LOCALES.join('|')})(/|$)`);
    const match = nextPath.match(localePattern);
    if (match) {
        // Replace old locale with current locale
        return nextPath.replace(localePattern, `/${locale}$2`);
    }

    // Path without locale prefix - add current locale
    return `/${locale}${nextPath}`;
}

export default function LoginPage() {
    const locale = useLocale();
    const storeLocale = useAppStore(s => s.locale);
    const router = useRouter();
    const t = useTranslations('login');
    const tOnboarding = useTranslations('onboarding');
    const searchParams = useSearchParams();

    const nextPathRaw = searchParams.get('next');
    const nextPath = normalizeNextPath(nextPathRaw, locale);

    const getDemoQuestion = (key: string) => {
        const scenario = DEMO_SCENARIOS.find(s => s.id.includes(key));
        if (!scenario) return t(`tips.${key}`);

        const firstStep = scenario.steps[0];
        if (storeLocale === 'ja' && firstStep.user_ja) return firstStep.user_ja;
        if (storeLocale === 'en' && firstStep.user_en) return firstStep.user_en;
        return firstStep.user;
    };

    const getIssueLabel = (key: string) => {
        return t(`issues.${key}`);
    };

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
                    throw new Error(t('initFailedWithCode', { code: res.status + (details ? ` : ${details}` : '') }));
                }

                if (cancelled) return;
                setReadyToContinue(true);
            } catch (e: any) {
                if (cancelled) return;
                ensuredProfileUserIdRef.current = null;
                setError(e?.message || t('initFailed'));
            } finally {
                if (cancelled) return;
                setBusy(false);
            }
        }

        void ensureProfile();
        return () => {
            cancelled = true;
        };
    }, [nextPath, router, session, supabase, t]);

    async function signInWithWithLine() {
        setError(null);
        setSentMagicLink(false);
        if (!supabase) {
            setError(t('supabaseNotConfigured'));
            return;
        }

        setBusy(true);
        try {
            const origin = window.location.origin;
            const redirectTo = `${origin}/${locale}/login?next=${encodeURIComponent(nextPath)}`;
            const { error: authError } = await supabase.auth.signInWithOAuth({
                provider: 'line' as any,
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

    async function signInWithGoogle() {
        setError(null);
        setSentMagicLink(false);
        if (!supabase) {
            setError(t('supabaseNotConfigured'));
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
            setError(t('supabaseNotConfigured'));
            return;
        }
        if (!email.trim()) {
            setError(t('enterEmail'));
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
            setError(t('supabaseNotConfigured'));
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
        <main className="min-h-screen bg-slate-50 p-4 pb-0 pt-[env(safe-area-inset-top,0px)]" role="main">
            {/* Main Content Card */}
            <div className="w-full max-w-[480px] mx-auto bg-white rounded-[48px] shadow-2xl shadow-indigo-100/50 overflow-hidden border border-slate-100 flex flex-col max-h-[calc(100dvh-180px)] lg:max-h-[calc(100dvh-240px)] sm:max-h-[calc(100dvh-160px)]">
                <header className="p-8 pb-4 border-b border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200" aria-hidden="true">
                            <span className="text-2xl text-white">🦌</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">LUTAGU</h1>
                            <p className="text-xs font-bold text-slate-400 mt-1">{tOnboarding('tagline')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <LanguageSwitcher />
                        <button
                            onClick={() => router.replace(nextPath)}
                            className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                            aria-label={tOnboarding('skip')}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </header>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto px-8 py-2 custom-scrollbar">
                    {/* Login Section */}
                    <section className="mt-4 mb-8 space-y-4" aria-labelledby="login-title">
                        <h2 id="login-title" className="text-[11px] font-black text-slate-400 mb-3 uppercase tracking-wider">{t('title')}</h2>

                        {session ? (
                            <div className="space-y-3">
                                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <div className="text-xs font-bold text-emerald-700">
                                        {t('currentUser', { email: session.user.email })}
                                    </div>
                                </div>
                                <button
                                    onClick={() => router.replace(nextPath)}
                                    disabled={busy || !readyToContinue}
                                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-sm font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                >
                                    {busy ? '...' : t('continue')}
                                </button>
                                <button
                                    onClick={signOut}
                                    disabled={busy}
                                    className="w-full py-4 bg-slate-50 text-slate-400 rounded-2xl text-xs font-bold hover:bg-slate-100 transition-all focus:outline-none focus:ring-2 focus:ring-slate-300"
                                >
                                    {t('logout')}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <button
                                    onClick={signInWithGoogle}
                                    disabled={busy}
                                    aria-label={t('googleLogin')}
                                    className="w-full py-4 bg-white border border-slate-200 text-slate-700 rounded-2xl text-sm font-black hover:bg-slate-50 hover:border-indigo-200 transition-all shadow-sm flex items-center justify-center gap-3 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                    </svg>
                                    {t('googleLogin')}
                                </button>

                                <button
                                    onClick={signInWithWithLine}
                                    disabled={busy}
                                    aria-label={t('lineLogin')}
                                    className="w-full py-4 bg-[#06C755] text-white rounded-2xl text-sm font-black hover:bg-[#05b34d] transition-all shadow-lg shadow-green-100 flex items-center justify-center gap-3 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#06C755] focus:ring-offset-2"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 1C5.9 1 1 5.4 1 10.8C1 15.6 5.1 19.6 10.5 20.3L10.9 22.8C11.1 23.8 12.4 23.9 12.8 23L16.3 19.8C19.7 18.2 23 14.8 23 10.8C23 5.4 18.1 1 12 1Z" />
                                    </svg>
                                    {t('lineLogin')}
                                </button>

                                <div className="flex items-center gap-4 py-2">
                                    <div className="h-px flex-1 bg-slate-100" />
                                    <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{t('or')}</div>
                                    <div className="h-px flex-1 bg-slate-100" />
                                </div>

                                <div className="space-y-3">
                                    <label htmlFor="email-input" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">
                                        {t('emailLabel')}
                                    </label>
                                    <input
                                        id="email-input"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder={t('emailPlaceholder')}
                                        autoComplete="email"
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100 rounded-2xl text-sm font-bold transition-all outline-none"
                                    />
                                </div>
                                <button
                                    onClick={sendMagicLink}
                                    disabled={busy || !email.trim()}
                                    className="w-full py-4 bg-slate-900 text-white rounded-2xl text-sm font-black hover:bg-slate-800 transition-all disabled:opacity-50 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                                >
                                    {busy ? '...' : t('sendMagicLink')}
                                </button>
                                {sentMagicLink && (
                                    <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 text-xs font-bold text-indigo-600 animate-in fade-in slide-in-from-top-2" role="status">
                                        {t('magicLinkSent')}
                                    </div>
                                )}
                            </div>
                        )}

                        {error && (
                            <div role="alert" aria-live="polite" className="p-4 bg-rose-50 rounded-2xl border border-rose-100 text-xs font-bold text-rose-600 animate-in shake-1">
                                {error}
                            </div>
                        )}
                    </section>

                    {/* Questions */}
                    <section className="space-y-3 mt-4" aria-labelledby="questions-title">
                        <h2 id="questions-title" className="text-[11px] font-black text-indigo-600 mb-2 uppercase tracking-wider flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" aria-hidden="true" />
                            {t('tryAsking')}
                        </h2>
                        {[
                            { key: 'overtourism', node: 'odpt.Station:TokyoMetro.Ginza.Asakusa' },
                            { key: 'disruption', node: 'odpt.Station:TokyoMetro.Marunouchi.Tokyo' },
                            { key: 'handsfree', node: 'odpt.Station:TokyoMetro.Ginza.Asakusa' },
                            { key: 'accessibility', node: 'odpt.Station:JR-East.Yamanote.Ueno' }
                        ].map((item) => {
                            const questionText = getDemoQuestion(item.key);
                            const issueLabel = getIssueLabel(item.key);
                            return (
                                <button
                                    key={item.key}
                                    onClick={() => {
                                        router.push(`/${locale}/?node=${item.node}&sheet=1&tab=lutagu&q=${encodeURIComponent(questionText)}`);
                                    }}
                                    className="w-full text-left p-4 bg-slate-50 rounded-[24px] border border-transparent hover:border-indigo-100 hover:bg-white hover:shadow-lg hover:shadow-indigo-50 transition-all group active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                >
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white border border-slate-100 text-indigo-500 font-black uppercase tracking-wider shadow-sm">
                                            {issueLabel}
                                        </span>
                                    </div>
                                    <div className="text-xs font-bold text-slate-800 leading-snug group-hover:text-indigo-600 transition-colors">
                                        {questionText}
                                    </div>
                                    <div className="mt-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                        {tOnboarding('askSubtitle')}
                                    </div>
                                </button>
                            );
                        })}
                    </section>

                    {/* Hubs */}
                    <section className="mt-6 mb-8" aria-labelledby="hubs-title">
                        <h2 id="hubs-title" className="text-[11px] font-black text-slate-400 mb-3 uppercase tracking-wider">{tOnboarding('hubTitle')}</h2>
                        <div className="grid grid-cols-4 gap-2">
                            {[
                                { key: 'ueno', node: 'odpt.Station:TokyoMetro.Ginza.Ueno' },
                                { key: 'asakusa', node: 'odpt.Station:TokyoMetro.Ginza.Asakusa' },
                                { key: 'akihabara', node: 'odpt.Station:TokyoMetro.Hibiya.Akihabara' },
                                { key: 'tokyo', node: 'odpt.Station:TokyoMetro.Marunouchi.Tokyo' }
                            ].map((hub) => (
                                <button
                                    key={hub.key}
                                    onClick={() => router.push(`/${locale}/?node=${hub.node}&sheet=1`)}
                                    className="py-2.5 bg-slate-50 rounded-xl text-[11px] font-black text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-transparent hover:border-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    {tOnboarding(`hubs.${hub.key}`)}
                                </button>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Footer Actions */}
                <footer className="p-8 pt-4 pb-6 grid grid-cols-2 gap-4 bg-white border-t border-slate-50">
                    <button
                        onClick={() => router.replace(nextPath)}
                        className="py-4 bg-slate-900 text-white rounded-2xl text-sm font-black hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                    >
                        {tOnboarding('enableLocation')}
                    </button>
                    <button
                        onClick={() => router.replace(nextPath)}
                        className="py-4 bg-slate-50 text-slate-600 rounded-2xl text-sm font-black hover:bg-slate-100 transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-slate-300"
                    >
                        {tOnboarding('browseFirst')}
                    </button>
                </footer>
            </div>

            {/* AI Chat Panel at Bottom */}
            <LoginChatPanel />
        </main>
    );
}
