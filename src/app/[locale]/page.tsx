'use client';

import dynamic from 'next/dynamic';
import { useAppStore } from '@/stores/appStore';
import { NodeTabs } from '@/components/node/NodeTabs';
// import { TripGuardStatus } from '@/components/guard/TripGuardStatus';
import { SubscriptionModal } from '@/components/guard/SubscriptionModal';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { JapanTimeClock } from '@/components/ui/JapanTimeClock';
import { ProfileSwitcher } from '@/components/ui/ProfileSwitcher';
import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchNodeConfig, NodeProfile } from '@/lib/api/nodes';
import { ChatOverlay } from '@/components/chat/ChatOverlay';
import { Settings, X, MessageSquare, Compass, CalendarDays, User2, Star } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { getLocaleString } from '@/lib/utils/localeUtils';
import { getSupabase } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useRouter, useSearchParams } from 'next/navigation';

const MapContainer = dynamic(
    () => import('@/components/map/MapContainer'),
    { ssr: false, loading: () => <div className="w-full h-screen bg-gray-100 animate-pulse" /> }
);

export default function Home() {
    const [hydrated, setHydrated] = useState(false);
    useEffect(() => {
        console.log('[Home] Hydration effect running');
        setHydrated(true);
    }, []);

    console.log('[Home] Rendering, hydrated:', hydrated);
    const locale = useLocale();
    const router = useRouter();
    const searchParams = useSearchParams();
    const tNav = useTranslations('nav');
    const tViews = useTranslations('views');
    const tOnboarding = useTranslations('onboarding');
    const tCommon = useTranslations('common');
    const tNode = useTranslations('node');
    const tProfile = useTranslations('profile');
    const tTripGuard = useTranslations('tripGuard');

    const {
        currentNodeId,
        isBottomSheetOpen,
        setMapCenter,
        setBottomSheetOpen,
        setCurrentNode,
        activeTab,
        setActiveTab,
        onboardingSeenVersion,
        setOnboardingSeenVersion,
        setChatOpen,
        isOnboardingOpen,
        setIsOnboardingOpen,
        setPendingChat,
        isTripGuardActive,
        tripGuardSummary,
        isLineBound,
        setTripGuardActive,
        setTripGuardSummary,
        setTripGuardSubscriptionId,
        setSubscriptionModalOpen
    } = useAppStore();

    console.log('[Home] State:', { activeTab, isBottomSheetOpen, currentNodeId });

    const [nodeData, setNodeData] = useState<any>(null);
    const [profile, setProfile] = useState<NodeProfile | null>(null);

    const supabase = useMemo<SupabaseClient | null>(() => {
        try {
            return getSupabase();
        } catch {
            return null;
        }
    }, []);
    const [sessionEmail, setSessionEmail] = useState<string | null>(null);
    const [sessionToken, setSessionToken] = useState<string | null>(null);
    const [sessionUserId, setSessionUserId] = useState<string | null>(null);
    const [favoriteNodeIds, setFavoriteNodeIds] = useState<Set<string>>(() => new Set());

    const ensuredProfileUserIdRef = useRef<string | null>(null);

    const ONBOARDING_VERSION = 1;

    useEffect(() => {
        if (isBottomSheetOpen) return;
        if (onboardingSeenVersion >= ONBOARDING_VERSION) return;
        setIsOnboardingOpen(true);
    }, [isBottomSheetOpen, onboardingSeenVersion]);

    useEffect(() => {
        const tab = searchParams.get('tab');
        const node = searchParams.get('node');
        const sheet = searchParams.get('sheet');
        const q = searchParams.get('q');

        let changed = false;

        if (q) {
            setChatOpen(true);
            setPendingChat({ input: q, autoSend: true });
            changed = true;
        }

        if (tab === 'explore' || tab === 'trips' || tab === 'me') {
            setActiveTab(tab);
            changed = true;
        }

        if (typeof node === 'string' && node.length > 0) {
            setCurrentNode(node);
            if (sheet === '1') setBottomSheetOpen(true);
            changed = true;
        }

        if (sheet === '1' && !node) {
            setBottomSheetOpen(true);
            changed = true;
        }

        if (changed) router.replace(window.location.pathname);
    }, [router, searchParams, setActiveTab, setBottomSheetOpen, setCurrentNode]);

    useEffect(() => {
        if (!supabase) return;

        const client = supabase;

        let cancelled = false;
        async function load() {
            const { data } = await client.auth.getSession();
            if (cancelled) return;
            setSessionEmail(data.session?.user?.email || null);
            setSessionToken(data.session?.access_token || null);
            setSessionUserId(data.session?.user?.id || null);
        }

        void load();
        const { data } = client.auth.onAuthStateChange((_event, session) => {
            setSessionEmail(session?.user?.email || null);
            setSessionToken(session?.access_token || null);
            setSessionUserId(session?.user?.id || null);
        });

        return () => {
            cancelled = true;
            if (data?.subscription) {
                data.subscription.unsubscribe();
            }
        };
    }, [supabase]);

    useEffect(() => {
        if (!sessionToken) return;
        if (!sessionUserId) return;
        if (ensuredProfileUserIdRef.current === sessionUserId) return;

        ensuredProfileUserIdRef.current = sessionUserId;
        let cancelled = false;

        async function ensureProfile() {
            try {
                const res = await fetch('/api/me', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${sessionToken}`
                    }
                });
                if (!res.ok) throw new Error('ensure_profile_failed');
            } catch {
                if (cancelled) return;
                ensuredProfileUserIdRef.current = null;
            }
        }

        void ensureProfile();
        return () => {
            cancelled = true;
        };
    }, [sessionToken, sessionUserId]);

    useEffect(() => {
        if (!sessionToken) {
            setTripGuardSummary(null);
            setTripGuardSubscriptionId(null);
            setTripGuardActive(false);
            return;
        }

        let cancelled = false;
        async function loadTripGuard() {
            try {
                const res = await fetch(`/api/trip-guard/subscriptions?activeOnly=1&locale=${encodeURIComponent(locale)}`,
                    {
                        headers: { Authorization: `Bearer ${sessionToken}` },
                        cache: 'no-store'
                    }
                );
                if (!res.ok) return;
                const data = await res.json().catch(() => null);
                if (cancelled) return;

                const active = data?.active || null;
                if (active?.id) {
                    setTripGuardActive(true);
                    setTripGuardSubscriptionId(String(active.id));
                    setTripGuardSummary(typeof active.summary === 'string' ? active.summary : null);
                } else {
                    setTripGuardActive(false);
                    setTripGuardSubscriptionId(null);
                    setTripGuardSummary(null);
                }
            } catch {
                return;
            }
        }

        void loadTripGuard();
        return () => {
            cancelled = true;
        };
    }, [locale, sessionToken, setTripGuardActive, setTripGuardSubscriptionId, setTripGuardSummary]);



    async function handleLogout() {
        setOnboardingSeenVersion(ONBOARDING_VERSION);
        setIsOnboardingOpen(false);
        setChatOpen(false);
        setPendingChat({ input: null });
        setBottomSheetOpen(false);
        setCurrentNode(null);
        setActiveTab('explore');
        ensuredProfileUserIdRef.current = null;
        setFavoriteNodeIds(new Set());
        setTripGuardActive(false);
        setTripGuardSummary(null);
        setTripGuardSubscriptionId(null);
        setSubscriptionModalOpen(false);

        if (!supabase) return;
        await supabase.auth.signOut();
    }

    useEffect(() => {
        if (!sessionToken) {
            setFavoriteNodeIds(new Set());
            return;
        }

        let cancelled = false;
        async function loadFavorites() {
            const res = await fetch('/api/favorites', {
                headers: {
                    Authorization: `Bearer ${sessionToken}`
                }
            });
            if (!res.ok) return;
            const data = await res.json();
            if (cancelled) return;
            const items = Array.isArray(data?.items) ? data.items : [];
            setFavoriteNodeIds(new Set(items));
        }

        void loadFavorites();
        return () => {
            cancelled = true;
        };
    }, [sessionToken]);

    const isFavorited = Boolean(currentNodeId && favoriteNodeIds.has(currentNodeId));

    async function toggleFavorite() {
        if (!currentNodeId) return;

        if (!sessionToken) {
            const next = `/${locale}/?node=${encodeURIComponent(currentNodeId)}&sheet=1`;
            router.push(`/${locale}/login?next=${encodeURIComponent(next)}`);
            return;
        }

        if (isFavorited) {
            const res = await fetch(`/api/favorites/${encodeURIComponent(currentNodeId)}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${sessionToken}`
                }
            });
            if (!res.ok) return;
            setFavoriteNodeIds((prev) => {
                const next = new Set(prev);
                next.delete(currentNodeId);
                return next;
            });
            return;
        }

        const res = await fetch('/api/favorites', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${sessionToken}`
            },
            body: JSON.stringify({ nodeId: currentNodeId })
        });
        if (!res.ok) return;
        setFavoriteNodeIds((prev) => {
            const next = new Set(prev);
            next.add(currentNodeId);
            return next;
        });
    }

    useEffect(() => {
        if (currentNodeId) {
            fetchNodeConfig(currentNodeId).then(({ node, profile }) => {
                setNodeData(node);
                setProfile(profile);
            });
        } else {
            setNodeData(null);
            setProfile(null);
        }
    }, [currentNodeId]);

    if (!hydrated) {
        return <div className="min-h-screen bg-white" />;
    }

    return (
        <main className="flex min-h-screen flex-col items-center relative overflow-hidden bg-white">

            {/* 1. Map Layer (Visible only when sidebar/panel is thin or closed, but here we cover it) */}
            <div
                className={`absolute inset-0 z-0 transition-opacity duration-300 ${activeTab === 'explore' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            >
                <MapContainer />
            </div>

            {/* 1b. Non-map Views */}
            {activeTab !== 'explore' && (
                <div className="absolute inset-0 z-[5] bg-slate-50">
                    <div className="pt-28 px-6 pb-28 max-w-md mx-auto">
                        {activeTab === 'trips' && (
                            <div className="space-y-4">
                                <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm p-6">
                                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{tViews('trips.kicker')}</div>
                                    <div className="mt-2 text-xl font-black text-slate-900 tracking-tight">{tViews('trips.title')}</div>
                                    <div className="mt-2 text-sm font-bold text-slate-500 leading-relaxed">{tViews('trips.description')}</div>
                                    <button
                                        onClick={() => {
                                            setChatOpen(true);
                                            setPendingChat({ input: tViews('trips.seed'), autoSend: false });
                                        }}
                                        className="mt-6 w-full py-4 rounded-2xl bg-indigo-600 text-white font-black text-sm tracking-wide hover:bg-indigo-700 transition-colors active:scale-[0.99]"
                                    >
                                        {tViews('trips.cta')}
                                    </button>
                                </div>

                                <section
                                    className="bg-white rounded-[28px] border border-slate-100 shadow-sm p-6"
                                    aria-label={tTripGuard('title')}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                                {tTripGuard('title')}
                                            </div>
                                            <div className="mt-2 text-sm font-bold text-slate-500 leading-relaxed">
                                                {tTripGuard('subscriptionHint')}
                                            </div>
                                        </div>
                                        <span
                                            className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black tracking-wide ${isTripGuardActive
                                                ? 'bg-emerald-50 text-emerald-700'
                                                : 'bg-slate-100 text-slate-500'
                                                }`}
                                        >
                                            {isTripGuardActive
                                                ? isLineBound
                                                    ? tTripGuard('statusActiveBound')
                                                    : tTripGuard('statusActiveUnbound')
                                                : tTripGuard('statusInactive')}
                                        </span>
                                    </div>

                                    <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-3">
                                        {isTripGuardActive ? (
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="text-xs font-black text-slate-800">
                                                        {tTripGuard('sampleSubscriptionLabel')}
                                                    </div>
                                                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black tracking-wide text-emerald-700">
                                                        {tTripGuard('sampleSubscriptionStatus')}
                                                    </span>
                                                </div>
                                                <div className="text-[11px] font-medium text-slate-500">
                                                    {tripGuardSummary || tTripGuard('sampleSubscriptionWindow')}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSubscriptionModalOpen(true);
                                                    }}
                                                    className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-xs font-black tracking-wide text-white hover:bg-slate-800 active:scale-[0.99]"
                                                >
                                                    管理訂閱
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                <div className="text-xs font-bold text-slate-600">
                                                    {tTripGuard('noSubscription')}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setSubscriptionModalOpen(true)}
                                                    className="mt-2 inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-4 py-2 text-xs font-black tracking-wide text-white hover:bg-indigo-700 active:scale-[0.99] sm:mt-0"
                                                >
                                                    {tTripGuard('activate')}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            </div>
                        )}

                        {activeTab === 'me' && (
                            <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm p-6">
                                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{tViews('me.kicker')}</div>
                                <div className="mt-2 text-xl font-black text-slate-900 tracking-tight">{tViews('me.title')}</div>
                                <div className="mt-2 text-sm font-bold text-slate-500 leading-relaxed">{tViews('me.description')}</div>
                                {sessionEmail ? (
                                    <>
                                        <div className="mt-4 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs font-bold text-slate-600">
                                            已登入：{sessionEmail}
                                        </div>

                                        <div className="mt-3 px-4 py-3 rounded-2xl bg-white border border-slate-200">
                                            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">收藏站點</div>
                                            <div className="mt-2 text-sm font-black text-slate-900">{favoriteNodeIds.size}</div>
                                            {favoriteNodeIds.size > 0 && (
                                                <div className="mt-3 grid gap-2">
                                                    {Array.from(favoriteNodeIds).slice(0, 8).map((id) => (
                                                        <button
                                                            key={id}
                                                            onClick={() => {
                                                                setActiveTab('explore');
                                                                setCurrentNode(id);
                                                                setBottomSheetOpen(true);
                                                            }}
                                                            className="w-full px-4 py-3 rounded-2xl bg-slate-50 hover:bg-slate-100 text-left transition-colors"
                                                        >
                                                            <div className="text-xs font-black text-slate-800">{id}</div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-4 grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => setChatOpen(true)}
                                                className="py-4 rounded-2xl bg-slate-900 text-white font-black text-sm tracking-wide hover:bg-slate-800 transition-colors active:scale-[0.99]"
                                            >
                                                {tViews('me.cta')}
                                            </button>
                                            <button
                                                onClick={handleLogout}
                                                className="py-4 rounded-2xl bg-white border border-slate-200 text-slate-700 font-black text-sm hover:bg-slate-50 transition-colors active:scale-[0.99]"
                                            >
                                                {tProfile('logout')}
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => {
                                            const next = `/${locale}/?tab=me`;
                                            router.push(`/${locale}/login?next=${encodeURIComponent(next)}`);
                                        }}
                                        className="mt-6 w-full py-4 rounded-2xl bg-slate-900 text-white font-black text-sm tracking-wide hover:bg-slate-800 transition-colors active:scale-[0.99]"
                                    >
                                        {tProfile('loginWithGoogle')}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 2. Top Bar (System UI) */}
            <div className="absolute top-0 left-0 right-0 z-10 p-6 pt-16 pointer-events-none">
                <div className="flex justify-between items-start pointer-events-auto">
                    <div className="flex gap-3 ml-auto items-start">
                        <JapanTimeClock />
                        <ProfileSwitcher />
                        <LanguageSwitcher />
                    </div>
                </div>
            </div>

            {/* 3. FULL SCREEN NODE DETAILS (Overlay Layer) */}
            {isBottomSheetOpen && (
                <div className="absolute inset-0 z-50 bg-white flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">

                    {/* Fixed Top Close Area */}
                    <div className="w-full h-16 flex items-center justify-between px-6 border-b border-gray-100 bg-white/80 backdrop-blur-xl sticky top-0 z-[60]">
                        <div className="flex flex-col">
                            <h2 className="text-xl font-black text-gray-900 leading-none">
                                {getLocaleString(nodeData?.name, locale) || nodeData?.title || (currentNodeId?.split('.').pop()) || tCommon('station')}
                            </h2>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                                {tNode('details')}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={toggleFavorite}
                                className={`p-3 rounded-2xl transition-all active:scale-90 ${isFavorited
                                    ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                                    }`}
                                aria-label={isFavorited ? tNode('unfavorite') : tNode('favorite')}
                            >
                                <Star size={22} fill={isFavorited ? 'currentColor' : 'none'} aria-hidden="true" />
                            </button>

                            <button
                                onClick={() => {
                                    setBottomSheetOpen(false);
                                    setCurrentNode(null);
                                }}
                                className="p-3 bg-gray-100 rounded-2xl text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-all active:scale-90"
                                aria-label={tCommon('close')}
                            >
                                <X size={24} aria-hidden="true" />
                            </button>
                        </div>
                    </div>

                    {/* Content Component Area (Fills remaining space) */}
                    <div className="flex-1 overflow-hidden">
                        <NodeTabs nodeData={nodeData} profile={profile} />
                    </div>
                </div>
            )}

            {isOnboardingOpen && (
                <div className="absolute inset-0 z-[70] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="w-full max-w-[480px] bg-white rounded-[48px] shadow-2xl shadow-indigo-100/50 overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
                        <div className="p-8 pb-4 border-b border-gray-50 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                                    <span className="text-2xl text-white">🦌</span>
                                </div>
                                <div>
                                    <div className="text-xl font-black text-slate-900 tracking-tight leading-none">LUTAGU</div>
                                    <div className="text-xs font-bold text-slate-400 mt-1">{tOnboarding('tagline')}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <LanguageSwitcher />
                                <button
                                    onClick={() => {
                                        setOnboardingSeenVersion(ONBOARDING_VERSION);
                                        setIsOnboardingOpen(false);
                                    }}
                                    className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400"
                                    aria-label={tOnboarding('skip')}
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-8 py-2 custom-scrollbar">
                            <div className="space-y-3 mt-4">
                                <div className="text-[11px] font-black text-indigo-600 mb-2 uppercase tracking-wider flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                                    {tOnboarding('askTitle')}
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                    {[
                                        { id: 'overtourism', text: tOnboarding('tips.overtourism'), node: 'odpt.Station:TokyoMetro.Ginza.Asakusa' },
                                        { id: 'disruption', text: tOnboarding('tips.disruption'), node: 'odpt.Station:TokyoMetro.Marunouchi.Tokyo' },
                                        { id: 'handsfree', text: tOnboarding('tips.handsfree'), node: 'odpt.Station:TokyoMetro.Ginza.Asakusa' },
                                        { id: 'accessibility', text: tOnboarding('tips.accessibility'), node: 'odpt.Station:JR-East.Yamanote.Ueno' }
                                    ].map((tip) => (
                                        <button
                                            key={tip.id}
                                            onClick={() => {
                                                router.push(`/${locale}/?node=${tip.node}&sheet=1&tab=lutagu&q=${encodeURIComponent(tip.text)}`);
                                                setOnboardingSeenVersion(ONBOARDING_VERSION);
                                                setIsOnboardingOpen(false);
                                            }}
                                            className="w-full text-left p-4 bg-slate-50 rounded-[24px] border border-transparent hover:border-indigo-100 hover:bg-white hover:shadow-lg hover:shadow-indigo-50 transition-all group active:scale-[0.98]"
                                        >
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white border border-slate-100 text-indigo-500 font-black uppercase tracking-wider shadow-sm">
                                                    {tOnboarding(`issues.${tip.id}`)}
                                                </span>
                                            </div>
                                            <div className="text-xs font-bold text-slate-800 leading-snug group-hover:text-indigo-600 transition-colors">{tip.text}</div>
                                            <div className="mt-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                {tOnboarding('askSubtitle')}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-6 mb-8">
                                <div className="text-[11px] font-black text-slate-400 mb-3 uppercase tracking-wider">{tOnboarding('hubTitle')}</div>
                                <div className="grid grid-cols-4 gap-2">
                                    {[
                                        { label: tOnboarding('hubs.ueno'), id: 'odpt.Station:TokyoMetro.Ginza.Ueno', center: { lat: 35.7141, lon: 139.7774 } },
                                        { label: tOnboarding('hubs.asakusa'), id: 'odpt.Station:TokyoMetro.Ginza.Asakusa', center: { lat: 35.7119, lon: 139.7976 } },
                                        { label: tOnboarding('hubs.akihabara'), id: 'odpt.Station:TokyoMetro.Hibiya.Akihabara', center: { lat: 35.6984, lon: 139.7753 } },
                                        { label: tOnboarding('hubs.tokyo'), id: 'odpt.Station:TokyoMetro.Marunouchi.Tokyo', center: { lat: 35.6812, lon: 139.7671 } }
                                    ].map((hub) => (
                                        <button
                                            key={hub.id}
                                            onClick={() => {
                                                setMapCenter(hub.center);
                                                setCurrentNode(hub.id);
                                                setBottomSheetOpen(true);
                                                setOnboardingSeenVersion(ONBOARDING_VERSION);
                                                setIsOnboardingOpen(false);
                                            }}
                                            className="py-2.5 bg-slate-50 rounded-xl text-[11px] font-black text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-transparent hover:border-indigo-100"
                                        >
                                            {hub.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-8 pt-4 pb-6 grid grid-cols-2 gap-4 bg-white border-t border-slate-50">
                            <button
                                onClick={() => {
                                    if (!navigator.geolocation) return;
                                    navigator.geolocation.getCurrentPosition(
                                        (pos) => {
                                            setMapCenter({ lat: pos.coords.latitude, lon: pos.coords.longitude });
                                            setOnboardingSeenVersion(ONBOARDING_VERSION);
                                            setIsOnboardingOpen(false);
                                        },
                                        () => {
                                            setOnboardingSeenVersion(ONBOARDING_VERSION);
                                            setIsOnboardingOpen(false);
                                        }
                                    );
                                }}
                                className="py-4 bg-slate-900 text-white rounded-2xl text-sm font-black hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-[0.98]"
                            >
                                {tOnboarding('enableLocation')}
                            </button>
                            <button
                                onClick={() => {
                                    setOnboardingSeenVersion(ONBOARDING_VERSION);
                                    setIsOnboardingOpen(false);
                                }}
                                className="py-4 bg-slate-50 text-slate-600 rounded-2xl text-sm font-black hover:bg-slate-100 transition-all active:scale-[0.98]"
                            >
                                {tOnboarding('browseFirst')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ChatOverlay />

            {/* 4. Bottom Tab Bar */}
            {!isBottomSheetOpen && !isOnboardingOpen && (
                <div className="fixed bottom-0 left-0 right-0 z-40">
                    <div className="mx-auto max-w-md px-4 pb-[env(safe-area-inset-bottom)]">
                        <div className="h-[76px] bg-white/85 backdrop-blur-xl border border-black/[0.05] shadow-[0_18px_60px_rgba(0,0,0,0.10)] rounded-[28px] flex items-center justify-between px-4">
                            {[
                                { id: 'explore' as const, label: tNav('explore'), Icon: Compass },
                                { id: 'trips' as const, label: tNav('trips'), Icon: CalendarDays },
                                { id: 'me' as const, label: tNav('me'), Icon: User2 }
                            ].map(({ id, label, Icon }) => {
                                const isActive = activeTab === id;
                                return (
                                    <button
                                        key={id}
                                        onClick={() => {
                                            if (id !== 'explore') {
                                                setBottomSheetOpen(false);
                                                setCurrentNode(null);
                                            }
                                            setActiveTab(id);
                                        }}
                                        className={`flex-1 h-full flex flex-col items-center justify-center gap-1.5 rounded-[22px] transition-colors ${isActive ? 'text-indigo-700' : 'text-slate-400 hover:text-slate-600'}`}
                                        aria-current={isActive ? 'page' : undefined}
                                    >
                                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${isActive ? 'bg-indigo-50' : 'bg-transparent'}`}>
                                            <Icon size={20} aria-hidden="true" />
                                        </div>
                                        <div className={`text-[10px] font-black tracking-wider ${isActive ? 'text-indigo-700' : 'text-slate-400'}`}>{label}</div>
                                    </button>
                                );
                            })}

                            <button
                                onClick={() => setChatOpen(true)}
                                className="ml-2 w-14 h-14 rounded-[22px] bg-gradient-to-br from-indigo-600 to-indigo-800 text-white flex items-center justify-center shadow-[0_12px_30px_rgba(79,70,229,0.35)] active:scale-95 transition-transform"
                                aria-label={tCommon('openChat')}
                            >
                                <MessageSquare size={22} aria-hidden="true" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <SubscriptionModal />
        </main>
    );
}
