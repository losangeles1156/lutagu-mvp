'use client';

import dynamic from 'next/dynamic';
import { useAppStore } from '@/stores/appStore';
import { NodeTabs } from '@/components/node/NodeTabs';
import { TripGuardStatus } from '@/components/guard/TripGuardStatus';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
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
        setPendingChat,
        isTripGuardActive,
        isLineBound,
        setTripGuardActive
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
    const [profileSyncMessage, setProfileSyncMessage] = useState<string | null>(null);

    const ensuredProfileUserIdRef = useRef<string | null>(null);

    const ONBOARDING_VERSION = 1;
    const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

    useEffect(() => {
        if (isBottomSheetOpen) return;
        if (onboardingSeenVersion >= ONBOARDING_VERSION) return;
        setIsOnboardingOpen(true);
    }, [isBottomSheetOpen, onboardingSeenVersion]);

    useEffect(() => {
        const tab = searchParams.get('tab');
        const node = searchParams.get('node');
        const sheet = searchParams.get('sheet');

        let changed = false;

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

    async function syncProfileNow() {
        setProfileSyncMessage(null);
        if (!sessionToken) {
            setProfileSyncMessage('尚未取得登入憑證，請重新登入後再試一次');
            return;
        }

        try {
            const res = await fetch('/api/me', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${sessionToken}`
                }
            });

            if (!res.ok) {
                const text = await res.text().catch(() => '');
                setProfileSyncMessage(`同步失敗（${res.status}）${text ? `：${text}` : ''}`);
                return;
            }

            setProfileSyncMessage('同步成功：member_profiles 已嘗試建立/讀取');
        } catch (e: any) {
            setProfileSyncMessage(e?.message || '同步失敗');
        }
    }

    async function handleLogout() {
        setProfileSyncMessage(null);
        setOnboardingSeenVersion(ONBOARDING_VERSION);
        setIsOnboardingOpen(false);
        setChatOpen(false);
        setPendingChat({ input: null });
        setBottomSheetOpen(false);
        setCurrentNode(null);
        setActiveTab('explore');
        ensuredProfileUserIdRef.current = null;
        setFavoriteNodeIds(new Set());

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
                                                    {tTripGuard('sampleSubscriptionWindow')}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setChatOpen(true);
                                                        setPendingChat({ input: tViews('trips.seed'), autoSend: false });
                                                    }}
                                                    className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-xs font-black tracking-wide text-white hover:bg-slate-800 active:scale-[0.99]"
                                                >
                                                    {tViews('trips.cta')}
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                <div className="text-xs font-bold text-slate-600">
                                                    {tTripGuard('noSubscription')}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setTripGuardActive(true)}
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

                                        <div className="mt-3 grid gap-2">
                                            <button
                                                type="button"
                                                onClick={syncProfileNow}
                                                className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-200 text-slate-700 font-black text-xs hover:bg-slate-50 disabled:opacity-60"
                                                disabled={!sessionToken}
                                            >
                                                同步會員資料（建立 member_profiles）
                                            </button>
                                            {profileSyncMessage && (
                                                <div className="px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-[11px] font-bold text-slate-600 break-words">
                                                    {profileSyncMessage}
                                                </div>
                                            )}
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
                    <div className="flex gap-3 ml-auto">
                        <TripGuardStatus />
                        <button
                            className="glass-effect rounded-2xl p-3.5 hover:bg-white transition-all text-gray-500"
                            aria-label={tProfile('title')}
                        >
                            <Settings size={22} aria-hidden="true" />
                        </button>
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
                <div className="absolute inset-0 z-[70] bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="w-full max-w-md bg-white rounded-[32px] shadow-2xl">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-xl font-black">🦌</div>
                                <div className="min-w-0">
                                    <div className="text-lg font-black text-gray-900 tracking-tight leading-none">LUTAGU</div>
                                    <div className="text-[11px] font-bold text-gray-400 mt-1">{tOnboarding('tagline')}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <LanguageSwitcher className="w-10 h-10 rounded-2xl bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-all active:scale-95 shadow-none p-0 flex items-center justify-center border-none" />
                                <button
                                    onClick={() => {
                                        setOnboardingSeenVersion(ONBOARDING_VERSION);
                                        setIsOnboardingOpen(false);
                                    }}
                                    className="w-10 h-10 rounded-2xl bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-all active:scale-95 flex items-center justify-center"
                                    aria-label={tOnboarding('skip')}
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-5">
                            <div className="space-y-2">
                                <div className="text-sm font-black text-gray-900">{tOnboarding('askTitle')}</div>
                                <div className="grid grid-cols-1 gap-3">
                                    {[
                                        { id: 'airport', text: tOnboarding('tips.airport') },
                                        { id: 'locker', text: tOnboarding('tips.locker') },
                                        { id: 'crowd', text: tOnboarding('tips.crowd') }
                                    ].map((tip) => (
                                        <button
                                            key={tip.id}
                                            onClick={() => {
                                                setChatOpen(true);
                                                setPendingChat({ input: tip.text, autoSend: true });
                                                setOnboardingSeenVersion(ONBOARDING_VERSION);
                                                setIsOnboardingOpen(false);
                                            }}
                                            className="w-full px-5 py-4 rounded-3xl bg-slate-50 hover:bg-white border border-slate-100 hover:border-indigo-100 text-left transition-all shadow-sm hover:shadow-lg active:scale-[0.99]"
                                        >
                                            <div className="text-sm font-black text-gray-800 leading-snug">{tip.text}</div>
                                            <div className="text-[11px] font-bold text-gray-400 mt-1">{tOnboarding('askSubtitle')}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="text-sm font-black text-gray-900">{tOnboarding('hubTitle')}</div>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { label: tOnboarding('hubs.ueno'), id: 'odpt:Station:TokyoMetro.Ueno', center: { lat: 35.7141, lon: 139.7774 } },
                                        { label: tOnboarding('hubs.asakusa'), id: 'odpt:Station:TokyoMetro.Asakusa', center: { lat: 35.7119, lon: 139.7976 } },
                                        { label: tOnboarding('hubs.akihabara'), id: 'odpt:Station:JR-East.Akihabara', center: { lat: 35.6984, lon: 139.7753 } },
                                        { label: tOnboarding('hubs.tokyo'), id: 'odpt:Station:JR-East.Tokyo', center: { lat: 35.6812, lon: 139.7671 } }
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
                                            className="py-3.5 rounded-2xl bg-indigo-50/60 hover:bg-indigo-600 text-indigo-700 hover:text-white font-black text-sm transition-all shadow-sm hover:shadow-lg active:scale-95"
                                        >
                                            {hub.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3">
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
                                    className="flex-1 py-4 rounded-2xl bg-gray-900 text-white font-black text-sm tracking-wide hover:bg-gray-800 transition-colors active:scale-95"
                                >
                                    {tOnboarding('enableLocation')}
                                </button>
                                <button
                                    onClick={() => {
                                        setOnboardingSeenVersion(ONBOARDING_VERSION);
                                        setIsOnboardingOpen(false);
                                    }}
                                    className="flex-1 py-4 rounded-2xl bg-white border border-gray-200 text-gray-700 font-black text-sm hover:bg-gray-50 transition-colors active:scale-95"
                                >
                                    {tOnboarding('browseFirst')}
                                </button>
                            </div>
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
        </main>
    );
}
