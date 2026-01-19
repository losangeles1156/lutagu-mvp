'use client';

import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';

function getSupabaseClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return null;
    return createClient(url, anonKey);
}

export default function AdminLoginPage() {
    const locale = useLocale();
    const router = useRouter();
    const supabase = useMemo(() => getSupabaseClient(), []);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [sessionEmail, setSessionEmail] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            if (!supabase) return;
            const { data } = await supabase.auth.getSession();
            if (cancelled) return;
            setSessionEmail(data.session?.user?.email || null);
        }
        void load();
        return () => {
            cancelled = true;
        };
    }, [supabase]);

    async function signIn() {
        setError(null);
        if (!supabase) {
            setError('Supabase 環境變數未設定');
            return;
        }
        setBusy(true);
        try {
            const res = await supabase.auth.signInWithPassword({ email, password });
            if (res.error) {
                setError(res.error.message);
                return;
            }
            setSessionEmail(res.data.user?.email || null);
            router.push(`/${locale}/admin/health`);
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
            setSessionEmail(null);
        } finally {
            setBusy(false);
        }
    }

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="max-w-xl mx-auto px-6 py-10">
                <div className="flex items-center justify-between">
                    <div className="text-xl font-black tracking-tight text-slate-900">Admin</div>
                    <Link
                        href={`/${locale}/admin/health`}
                        className="text-sm font-bold text-indigo-700 hover:text-indigo-800"
                    >
                        健康儀表板
                    </Link>
                </div>

                <div className="mt-6 bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
                    <div className="text-sm font-black text-slate-900">登入</div>
                    <div className="mt-1 text-xs font-bold text-slate-500">
                        {sessionEmail ? `目前登入：${sessionEmail}` : '尚未登入'}
                    </div>

                    <div className="mt-5 grid gap-3">
                        <label className="grid gap-2">
                            <div className="text-xs font-black text-slate-700">Email</div>
                            <input
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                type="email"
                                className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-200"
                                placeholder="admin@yourdomain.com"
                                autoComplete="email"
                            />
                        </label>

                        <label className="grid gap-2">
                            <div className="text-xs font-black text-slate-700">Password</div>
                            <input
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                type="password"
                                className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-200"
                                placeholder="••••••••"
                                autoComplete="current-password"
                            />
                        </label>

                        {error && (
                            <div className="px-4 py-3 rounded-2xl bg-rose-50 text-rose-800 text-sm font-bold border border-rose-100">
                                {error}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={signIn}
                                disabled={busy}
                                className="flex-1 py-3 rounded-2xl bg-indigo-600 text-white font-black text-sm hover:bg-indigo-700 disabled:opacity-60"
                            >
                                登入
                            </button>
                            <button
                                onClick={signOut}
                                disabled={busy}
                                className="flex-1 py-3 rounded-2xl bg-slate-900 text-white font-black text-sm hover:bg-slate-800 disabled:opacity-60"
                            >
                                登出
                            </button>
                        </div>

                        <div className="text-xs font-bold text-slate-500 leading-relaxed">
                            需要使用 Supabase Auth 取得的 access token 才能呼叫後台 API。
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
