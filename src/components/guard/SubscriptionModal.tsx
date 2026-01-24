'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { useUIStore } from '@/stores/uiStore';
import { useUserStore } from '@/stores/userStore';
import { getSupabase } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { logger } from '@/lib/utils/logger';

const MAX_INPUT_LENGTH = 200;

function validateInput(text: string): { valid: boolean; message: string | null } {
    if (!text.trim()) {
        return { valid: false, message: null };
    }
    if (text.length > MAX_INPUT_LENGTH) {
        return { valid: false, message: `內容超過 ${MAX_INPUT_LENGTH} 字元限制` };
    }
    if (text.length < 5) {
        return { valid: false, message: '內容過短，請輸入至少 5 個字元' };
    }
    return { valid: true, message: null };
}

export function SubscriptionModal() {
    const locale = useLocale();
    const tTripGuard = useTranslations('tripGuard');
    const tCommon = useTranslations('common');
    const tValidation = useTranslations('validation');

    const isSubscriptionModalOpen = useUIStore(s => s.isSubscriptionModalOpen);
    const setSubscriptionModalOpen = useUIStore(s => s.setSubscriptionModalOpen);

    const isTripGuardActive = useUserStore(s => s.isTripGuardActive);
    const setTripGuardActive = useUserStore(s => s.setTripGuardActive);
    const setTripGuardSubscriptionId = useUserStore(s => s.setTripGuardSubscriptionId);
    const setTripGuardSummary = useUserStore(s => s.setTripGuardSummary);
    const router = useRouter();
    const [isLoading, setIsLoading] = React.useState(false);
    const [inputText, setInputText] = React.useState('');
    const [sessionToken, setSessionToken] = React.useState<string | null>(null);
    const [parsedPreview, setParsedPreview] = React.useState<any | null>(null);
    const [errorText, setErrorText] = React.useState<string | null>(null);
    const [activeSubscriptionId, setActiveSubscriptionId] = React.useState<string | null>(null);
    const [validationMessage, setValidationMessage] = React.useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    // 即時驗證
    React.useEffect(() => {
        const validation = validateInput(inputText);
        setValidationMessage(validation.message);
    }, [inputText]);

    const supabase = React.useMemo<SupabaseClient | null>(() => {
        try {
            return getSupabase();
        } catch {
            return null;
        }
    }, []);

    React.useEffect(() => {
        if (!supabase) return;
        const sb = supabase;
        let cancelled = false;

        async function load() {
            const { data } = await sb.auth.getSession();
            if (cancelled) return;
            setSessionToken(data.session?.access_token || null);
        }

        void load();

        const { data } = sb.auth.onAuthStateChange((_event, session) => {
            setSessionToken(session?.access_token || null);
        });

        return () => {
            cancelled = true;
            data.subscription.unsubscribe();
        };
    }, [supabase]);

    React.useEffect(() => {
        if (!isSubscriptionModalOpen) return;
        setIsLoading(false);
        setErrorText(null);
        setParsedPreview(null);
        setActiveSubscriptionId(null);
        setInputText((prev) => prev || tTripGuard('sampleSubscriptionLabel') + ' ' + tTripGuard('sampleSubscriptionWindow'));
    }, [isSubscriptionModalOpen, tTripGuard]);

    React.useEffect(() => {
        if (!isSubscriptionModalOpen) return;
        if (!sessionToken) return;

        let cancelled = false;
        async function loadActive() {
            try {
                const res = await fetch(`/api/trip-guard/subscriptions?activeOnly=1&locale=${encodeURIComponent(locale)}`, {
                    headers: { Authorization: `Bearer ${sessionToken}` }
                });
                if (!res.ok) return;
                const data = await res.json().catch(() => null);
                if (cancelled) return;

                const active = data?.active || null;
                if (active?.id) {
                    setActiveSubscriptionId(String(active.id));
                    setParsedPreview({ summary: active.summary });
                    setTripGuardActive(true);
                    setTripGuardSubscriptionId(String(active.id));
                    setTripGuardSummary(typeof active.summary === 'string' ? active.summary : null);
                } else {
                    setActiveSubscriptionId(null);
                    setParsedPreview(null);
                    setTripGuardActive(false);
                    setTripGuardSubscriptionId(null);
                    setTripGuardSummary(null);
                }
            } catch {
                return;
            }
        }

        void loadActive();
        return () => {
            cancelled = true;
        };
    }, [isSubscriptionModalOpen, locale, sessionToken, setTripGuardActive, setTripGuardSubscriptionId, setTripGuardSummary]);

    const handleActivate = async () => {
        setIsLoading(true);
        setErrorText(null);
        try {
            if (!sessionToken) {
                const next = `/${locale}/?tab=trips`;
                router.push(`/${locale}/login?next=${encodeURIComponent(next)}`);
                return;
            }

            const res = await fetch('/api/trip-guard/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${sessionToken}`
                },
                body: JSON.stringify({
                    inputText,
                    notificationMethod: 'line'
                })
            });

            const data = await res.json().catch(() => null);

            if (res.status === 401) {
                const next = `/${locale}/?tab=trips`;
                router.push(`/${locale}/login?next=${encodeURIComponent(next)}`);
                return;
            }

            if (!res.ok) {
                const data = await res.json().catch(() => null);
                setErrorText(typeof data?.error === 'string' ? data.error : tTripGuard('error') || '订阅失敗，請檢查輸入內容');
                setParsedPreview(data?.parsed || null);
                return;
            }

            if (!data?.success) {
                setErrorText(tTripGuard('error') || '订阅失败，请稍后重試');
                setParsedPreview(data?.parsed || null);
                return;
            }

            // Success
            setTripGuardActive(true);
            const nextParsed = data?.parsed || null;
            const nextSummary = typeof nextParsed?.summary === 'string' ? nextParsed.summary : null;
            const nextId = typeof data?.subscription?.id === 'string' ? data.subscription.id : null;
            setParsedPreview(nextParsed);
            setActiveSubscriptionId(nextId);
            setTripGuardSubscriptionId(nextId);
            setTripGuardSummary(nextSummary);
            setTimeout(() => setSubscriptionModalOpen(false), 800);
        } catch (error) {
            logger.error('Failed to activate trip guard subscription', error);
            setErrorText(tTripGuard('error') || '订阅失败，请稍后重試');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeactivate = async () => {
        setIsLoading(true);
        setErrorText(null);
        try {
            if (!sessionToken) {
                setTripGuardActive(false);
                setTripGuardSubscriptionId(null);
                setTripGuardSummary(null);
                setSubscriptionModalOpen(false);
                return;
            }

            if (!activeSubscriptionId) {
                setTripGuardActive(false);
                setTripGuardSubscriptionId(null);
                setTripGuardSummary(null);
                setSubscriptionModalOpen(false);
                return;
            }

            const res = await fetch('/api/trip-guard/subscriptions', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${sessionToken}`
                },
                body: JSON.stringify({ id: activeSubscriptionId, isActive: false })
            });

            if (!res.ok) {
                const data = await res.json().catch(() => null);
                setErrorText(typeof data?.error === 'string' ? data.error : tTripGuard('error') || '关闭失败，请稍后重試');
                return;
            }

            setTripGuardActive(false);
            setTripGuardSubscriptionId(null);
            setTripGuardSummary(null);
            setSubscriptionModalOpen(false);
        } catch {
            setErrorText(tTripGuard('error') || '关闭失败，请稍后重試');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isSubscriptionModalOpen || !mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl relative overflow-hidden">

                {/* Decorative Background */}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-indigo-500 to-purple-600 opacity-10" />

                <div className="relative z-10 text-center space-y-4">
                    <div className="w-16 h-16 bg-white rounded-full mx-auto flex items-center justify-center shadow-lg text-3xl">
                        🛡️
                    </div>

                    <h2 className="text-2xl font-bold text-gray-800">{tTripGuard('title')}</h2>
                    <p className="text-gray-500 text-sm">
                        {tTripGuard('subscriptionHint')}
                    </p>

                    <div className="bg-gray-50 p-4 rounded-xl text-left space-y-3">
                        <div className="text-xs font-bold text-gray-700">{tTripGuard('sampleSubscriptionLabel')}</div>
                        <div className="relative">
                            <textarea
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                maxLength={MAX_INPUT_LENGTH}
                                rows={4}
                                className={`w-full rounded-xl border bg-white px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 transition-colors
                                    ${validationMessage
                                        ? 'border-rose-200 focus:ring-rose-200'
                                        : 'border-gray-200 focus:ring-indigo-200'
                                    }
                                `}
                                placeholder={tTripGuard('sampleSubscriptionLabel') + ' ' + tTripGuard('sampleSubscriptionWindow')}
                                aria-describedby="input-hint"
                            />
                            <div
                                id="input-hint"
                                className={`absolute right-2 bottom-2 text-[10px] font-bold transition-colors
                                    ${inputText.length >= MAX_INPUT_LENGTH
                                        ? 'text-rose-500'
                                        : inputText.length >= MAX_INPUT_LENGTH * 0.9
                                            ? 'text-amber-500'
                                            : 'text-gray-300'
                                    }
                                `}
                                aria-live="polite"
                            >
                                {inputText.length}/{MAX_INPUT_LENGTH}
                            </div>
                        </div>
                        {validationMessage && (
                            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-bold text-rose-700">
                                {validationMessage}
                            </div>
                        )}
                        {errorText && (
                            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-bold text-rose-700">
                                {errorText}
                            </div>
                        )}
                        {parsedPreview && (
                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-medium text-slate-600">
                                {typeof parsedPreview?.summary === 'string' ? parsedPreview.summary : JSON.stringify(parsedPreview)}
                            </div>
                        )}
                    </div>

                    {!isTripGuardActive ? (
                        <button
                            onClick={handleActivate}
                            disabled={isLoading || !!validationMessage}
                            className={`w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all
                                ${isLoading || validationMessage ? 'opacity-70 cursor-wait' : ''}
                            `}
                        >
                            {isLoading ? tCommon('loading') : tTripGuard('activate')}
                        </button>
                    ) : (
                        <button
                            onClick={handleDeactivate}
                            className="w-full bg-gray-100 text-gray-600 font-bold py-3.5 rounded-xl hover:bg-gray-200 transition-all"
                        >
                            {tTripGuard('statusInactive')}
                        </button>
                    )}

                    <button
                        onClick={() => setSubscriptionModalOpen(false)}
                        className="text-xs text-gray-400 underline hover:text-gray-600"
                    >
                        {tCommon('skipLogin')}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
