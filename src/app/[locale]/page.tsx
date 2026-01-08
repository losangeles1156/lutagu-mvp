'use client';

import dynamic from 'next/dynamic';
import { useAppStore } from '@/stores/appStore';
import { NodeTabs } from '@/components/node/NodeTabs';
import { SubscriptionModal } from '@/components/guard/SubscriptionModal';
import { SystemMenu } from '@/components/ui/SystemMenu';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { OfflineIndicator } from '@/components/ui/OfflineIndicator';
import { MainLayout } from '@/components/layout/MainLayout';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useUIStateMachine } from '@/stores/uiStateMachine';
import { fetchNodeConfig, NodeProfile } from '@/lib/api/nodes';
import { X, MessageSquare, Compass, CalendarDays, User2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { getLocaleString } from '@/lib/utils/localeUtils';
import { getSupabase } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

const MapContainer = dynamic(
    () => import('@/components/map/MapContainer'),
    { ssr: false, loading: () => <div className="w-full h-screen bg-gray-100 animate-pulse" /> }
);

export default function Home() {
    const [hydrated, setHydrated] = useState(false);
    useEffect(() => { setHydrated(true); }, []);

    const locale = useLocale();
    const router = useRouter();
    const searchParams = useSearchParams();
    const tNav = useTranslations('nav');
    const tOnboarding = useTranslations('onboarding');
    const tCommon = useTranslations('common');
    const tNode = useTranslations('node');

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
        setNodeActiveTab,
        setDemoMode
    } = useAppStore();

    const { transitionTo, isMobile: isMobileState } = useUIStateMachine();

    const [nodeData, setNodeData] = useState<any>(null);
    const [profile, setProfile] = useState<NodeProfile | null>(null);
    const [showSkipConfirm, setShowSkipConfirm] = useState(false); // L1: Skip confirmation dialog

    const supabase = useMemo<SupabaseClient | null>(() => {
        try { return getSupabase(); } catch { return null; }
    }, []);
    const [sessionEmail] = useState<string | null>(null);

    const ONBOARDING_VERSION = 1;

    // URL params handling
    useEffect(() => {
        const tab = searchParams.get('tab');
        const node = searchParams.get('node');
        const sheet = searchParams.get('sheet');
        const q = searchParams.get('q');
        // L2: Support L1-L4 tab switching via URL parameter
        const nodeTab = searchParams.get('nodeTab');
        // Demo mode parameter - enters fullscreen AI chat with demo script
        const demo = searchParams.get('demo');

        let changed = false;

        // Demo mode: enter fullscreen AI chat directly (highest priority)
        if (demo && ['overtourism', 'disruption', 'handsfree', 'accessibility'].includes(demo)) {
            setDemoMode(true, demo);
            transitionTo('fullscreen');
            changed = true;
        } else if (q) {
            // Regular query: enter fullscreen with pending chat
            transitionTo('fullscreen');
            setPendingChat({ input: q, autoSend: true });
            changed = true;
        }

        if (tab === 'explore' || tab === 'trips' || tab === 'me') { setActiveTab(tab); changed = true; }
        if (typeof node === 'string' && node.length > 0) { setCurrentNode(node); if (sheet === '1') setBottomSheetOpen(true); changed = true; }
        if (sheet === '1' && !node) { setBottomSheetOpen(true); changed = true; }
        // L2: Set node tab if provided (lutagu, dna, live, facility, transit)
        if (nodeTab && ['lutagu', 'dna', 'live', 'facility', 'transit'].includes(nodeTab)) {
            setNodeActiveTab(nodeTab);
            changed = true;
        }
        if (changed) router.replace(window.location.pathname);
    }, [router, searchParams, setActiveTab, setBottomSheetOpen, setCurrentNode, setChatOpen, setPendingChat, setNodeActiveTab, setDemoMode, transitionTo]);

    // Onboarding check
    useEffect(() => {
        if (isBottomSheetOpen) return;
        if (onboardingSeenVersion >= ONBOARDING_VERSION) return;
        setIsOnboardingOpen(true);
    }, [isBottomSheetOpen, onboardingSeenVersion]);

    // Session handling
    useEffect(() => {
        if (!supabase) return;
        const client = supabase;
        const { data } = client.auth.onAuthStateChange((_event, session) => {
            // Session state handled elsewhere
        });
        return () => { if (data?.subscription) data.subscription.unsubscribe(); };
    }, [supabase]);

    // Node data
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

    if (!hydrated) { return <div className="min-h-screen bg-white" />; }

    // Header
    const header = (
        <header className="px-4 py-3 flex items-center justify-between bg-white/95 backdrop-blur-sm" role="banner">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg shadow-indigo-200" aria-hidden="true">🦌</div>
                <div className="hidden sm:block">
                    <h1 className="text-lg font-black text-slate-900 tracking-tight">LUTAGU</h1>
                    <p className="text-[10px] font-bold text-slate-400">東京交通 AI 助手</p>
                </div>
            </div>
            <SystemMenu />
        </header>
    );

    // Map panel
    const mapPanel = <MapContainer />;

    // Chat panel
    const chatPanel = <ChatPanel />;

    // Bottom bar
    const bottomBar = (
        <nav className="mx-auto max-w-md px-4 pb-[env(safe-area-inset-bottom)]" aria-label={tNav('navigation')}>
            <div className="h-[76px] bg-white/95 backdrop-blur-xl border border-black/[0.05] shadow-[0_18px_60px_rgba(0,0,0,0.10)] rounded-[28px] flex items-center justify-between px-4" role="tablist">
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
                                if (id !== 'explore') { setBottomSheetOpen(false); setCurrentNode(null); }
                                setActiveTab(id);
                            }}
                            role="tab"
                            aria-selected={isActive}
                            aria-controls={`${id}-panel`}
                            className={`flex-1 h-full flex flex-col items-center justify-center gap-1.5 rounded-[22px] transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isActive ? 'text-indigo-700' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${isActive ? 'bg-indigo-50' : 'bg-transparent'}`}>
                                <Icon size={20} aria-hidden="true" />
                            </div>
                            <div className={`text-[10px] font-black tracking-wider ${isActive ? 'text-indigo-700' : 'text-slate-400'}`}>{label}</div>
                        </button>
                    );
                })}
                <button
                    onClick={() => transitionTo('fullscreen')}
                    className="ml-2 w-14 h-14 rounded-[22px] bg-gradient-to-br from-indigo-600 to-indigo-800 text-white flex items-center justify-center shadow-[0_12px_30px_rgba(79,70,229,0.35)] active:scale-95 transition-transform focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    aria-label={tCommon('openChat')}
                >
                    <MessageSquare size={22} aria-hidden="true" />
                </button>
            </div>
        </nav>
    );

    return (
        <div className="relative min-h-screen bg-white">
            <OfflineIndicator />
            <MainLayout header={header} mapPanel={mapPanel} chatPanel={chatPanel} bottomBar={bottomBar} />

            {/* Node Details Overlay */}
            {isBottomSheetOpen && (
                <section className="fixed inset-0 z-[100] bg-white flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300" aria-label={tNode('details')} role="dialog" aria-modal="true">
                    <header className="w-full h-16 flex items-center justify-between px-6 border-b border-gray-100 bg-white/80 backdrop-blur-xl sticky top-0 z-[60]">
                        <div className="flex flex-col">
                            <h2 className="text-xl font-black text-gray-900 leading-none">
                                {getLocaleString(nodeData?.name, locale) || nodeData?.title || (currentNodeId?.split('.').pop()) || tCommon('station')}
                            </h2>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{tNode('details')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <LanguageSwitcher className="p-2 shadow-none glass-effect-none bg-transparent hover:bg-gray-100 rounded-2xl" />
                            <button
                                onClick={() => { setBottomSheetOpen(false); setCurrentNode(null); }}
                                className="p-3 bg-gray-100 rounded-2xl text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-all active:scale-90 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                                aria-label={tCommon('close')}
                            >
                                <X size={24} aria-hidden="true" />
                            </button>
                        </div>
                    </header>
                    <div className="flex-1 overflow-hidden">
                        <NodeTabs nodeData={nodeData} profile={profile} />
                    </div>
                </section>
            )}

            {/* Onboarding Modal */}
            {isOnboardingOpen && (
                <section className="fixed inset-0 z-[150] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300" aria-labelledby="onboarding-title" role="dialog" aria-modal="true">
                    <div className="w-full max-w-[480px] bg-white rounded-[48px] shadow-2xl shadow-indigo-100/50 overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
                        <header className="p-8 pb-4 border-b border-gray-50 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200" aria-hidden="true">
                                    <span className="text-2xl text-white">🦌</span>
                                </div>
                                <div>
                                    <h2 id="onboarding-title" className="text-xl font-black text-slate-900 tracking-tight leading-none">LUTAGU</h2>
                                    <p className="text-xs font-bold text-slate-400 mt-1">{tOnboarding('tagline')}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <LanguageSwitcher className="p-2 shadow-none glass-effect-none bg-transparent hover:bg-slate-50 rounded-full" />
                                <button
                                    onClick={() => setShowSkipConfirm(true)}
                                    className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                    aria-label={tOnboarding('skip')}
                                >
                                    <X className="w-5 h-5" aria-hidden="true" />
                                </button>
                            </div>
                        </header>

                        <div className="flex-1 overflow-y-auto px-8 py-2 custom-scrollbar">
                            <section className="space-y-3 mt-4" aria-labelledby="onboarding-tips-title">
                                <h3 id="onboarding-tips-title" className="text-[11px] font-black text-indigo-600 mb-2 uppercase tracking-wider flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" aria-hidden="true" />
                                    {tOnboarding('askTitle')}
                                </h3>
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
                                                setOnboardingSeenVersion(ONBOARDING_VERSION);
                                                setIsOnboardingOpen(false);
                                                setDemoMode(true, tip.id);
                                                transitionTo('fullscreen');
                                            }}
                                            className="w-full text-left p-4 bg-slate-50 rounded-[24px] border border-transparent hover:border-indigo-100 hover:bg-white hover:shadow-lg hover:shadow-indigo-50 transition-all group active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                        >
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white border border-slate-100 text-indigo-500 font-black uppercase tracking-wider shadow-sm">
                                                    {tOnboarding(`issues.${tip.id}`)}
                                                </span>
                                            </div>
                                            <div className="text-xs font-bold text-slate-800 leading-snug group-hover:text-indigo-600 transition-colors">{tip.text}</div>
                                            <div className="mt-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">{tOnboarding('askSubtitle')}</div>
                                        </button>
                                    ))}
                                </div>
                            </section>

                            <section className="mt-6 mb-8" aria-labelledby="onboarding-hubs-title">
                                <h3 id="onboarding-hubs-title" className="text-[11px] font-black text-slate-400 mb-3 uppercase tracking-wider">{tOnboarding('hubTitle')}</h3>
                                <div className="grid grid-cols-4 gap-2">
                                    {[
                                        { label: tOnboarding('hubs.ueno'), center: { lat: 35.7141, lon: 139.7774 } },
                                        { label: tOnboarding('hubs.asakusa'), center: { lat: 35.7119, lon: 139.7976 } },
                                        { label: tOnboarding('hubs.akihabara'), center: { lat: 35.6984, lon: 139.7753 } },
                                        { label: tOnboarding('hubs.tokyo'), center: { lat: 35.6812, lon: 139.7671 } }
                                    ].map((hub) => (
                                        <button
                                            key={hub.label}
                                            onClick={() => {
                                                setMapCenter(hub.center);
                                                setCurrentNode('odpt.Station:TokyoMetro.Ginza.Ueno');
                                                setBottomSheetOpen(true);
                                                setOnboardingSeenVersion(ONBOARDING_VERSION);
                                                setIsOnboardingOpen(false);
                                            }}
                                            className="py-2.5 bg-slate-50 rounded-xl text-[11px] font-black text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-transparent hover:border-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            {hub.label}
                                        </button>
                                    ))}
                                </div>
                            </section>
                        </div>

                        <footer className="p-8 pt-4 pb-6 grid grid-cols-2 gap-4 bg-white border-t border-slate-50">
                            <button
                                onClick={() => {
                                    const defaultNode = 'odpt.Station:TokyoMetro.Ginza.Ueno';
                                    const defaultCenter = { lat: 35.7141, lon: 139.7774 };

                                    if (!navigator.geolocation) {
                                        // No geolocation support, use default
                                        setMapCenter(defaultCenter);
                                        setCurrentNode(defaultNode);
                                        setBottomSheetOpen(true);
                                        setNodeActiveTab('lutagu');
                                        setOnboardingSeenVersion(ONBOARDING_VERSION);
                                        setIsOnboardingOpen(false);
                                        return;
                                    }

                                    navigator.geolocation.getCurrentPosition(
                                        async (pos) => {
                                            // Success: find nearest node
                                            try {
                                                const res = await fetch(`/api/nodes/nearest?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
                                                if (res.ok) {
                                                    const data = await res.json();
                                                    if (data.node?.id) {
                                                        setMapCenter({ lat: pos.coords.latitude, lon: pos.coords.longitude });
                                                        setCurrentNode(data.node.id);
                                                        setBottomSheetOpen(true);
                                                        setNodeActiveTab('lutagu');
                                                    } else {
                                                        setMapCenter(defaultCenter);
                                                        setCurrentNode(defaultNode);
                                                        setBottomSheetOpen(true);
                                                        setNodeActiveTab('lutagu');
                                                    }
                                                } else {
                                                    setMapCenter({ lat: pos.coords.latitude, lon: pos.coords.longitude });
                                                    setCurrentNode(defaultNode);
                                                    setBottomSheetOpen(true);
                                                    setNodeActiveTab('lutagu');
                                                }
                                            } catch {
                                                setMapCenter({ lat: pos.coords.latitude, lon: pos.coords.longitude });
                                                setCurrentNode(defaultNode);
                                                setBottomSheetOpen(true);
                                                setNodeActiveTab('lutagu');
                                            }
                                            setOnboardingSeenVersion(ONBOARDING_VERSION);
                                            setIsOnboardingOpen(false);
                                        },
                                        () => {
                                            // Error or denied: use default
                                            setMapCenter(defaultCenter);
                                            setCurrentNode(defaultNode);
                                            setBottomSheetOpen(true);
                                            setNodeActiveTab('lutagu');
                                            setOnboardingSeenVersion(ONBOARDING_VERSION);
                                            setIsOnboardingOpen(false);
                                        }
                                    );
                                }}
                                className="py-4 bg-slate-900 text-white rounded-2xl text-sm font-black hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                            >
                                {tOnboarding('nearbyNode')}
                            </button>
                            <button
                                onClick={() => {
                                    if (!navigator.geolocation) {
                                        // No geolocation, default to Ueno
                                        setMapCenter({ lat: 35.7141, lon: 139.7774 });
                                        setOnboardingSeenVersion(ONBOARDING_VERSION);
                                        setIsOnboardingOpen(false);
                                        return;
                                    }
                                    navigator.geolocation.getCurrentPosition(
                                        (pos) => {
                                            setMapCenter({ lat: pos.coords.latitude, lon: pos.coords.longitude });
                                            setOnboardingSeenVersion(ONBOARDING_VERSION);
                                            setIsOnboardingOpen(false);
                                        },
                                        () => {
                                            // Denied: default to Ueno
                                            setMapCenter({ lat: 35.7141, lon: 139.7774 });
                                            setOnboardingSeenVersion(ONBOARDING_VERSION);
                                            setIsOnboardingOpen(false);
                                        }
                                    );
                                }}
                                className="py-4 bg-slate-50 text-slate-600 rounded-2xl text-sm font-black hover:bg-slate-100 transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-slate-300"
                            >
                                {tOnboarding('browseFirst')}
                            </button>
                        </footer>

                        {/* L1: Skip Confirmation Dialog */}
                        <AnimatePresence>
                            {showSkipConfirm && (
                                <>
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute inset-0 bg-black/40 backdrop-blur-sm z-10"
                                        onClick={() => setShowSkipConfirm(false)}
                                    />
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                        className="absolute bottom-0 left-0 right-0 z-20 bg-white rounded-t-[32px] p-6 pb-8 shadow-2xl"
                                    >
                                        <div className="text-center mb-6">
                                            <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <X className="w-7 h-7 text-amber-500" />
                                            </div>
                                            <h3 className="text-lg font-black text-slate-900 mb-2">{tCommon('skipOnboardingTitle')}</h3>
                                            <p className="text-sm text-slate-500 font-medium">{tCommon('skipOnboardingDesc')}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => setShowSkipConfirm(false)}
                                                className="py-3.5 bg-slate-100 text-slate-600 rounded-2xl text-sm font-black hover:bg-slate-200 transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-slate-300"
                                            >
                                                {tCommon('cancel')}
                                            </button>
                                            <button
                                                onClick={() => { setOnboardingSeenVersion(ONBOARDING_VERSION); setIsOnboardingOpen(false); setShowSkipConfirm(false); }}
                                                className="py-3.5 bg-slate-900 text-white rounded-2xl text-sm font-black hover:bg-slate-800 transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                                            >
                                                {tCommon('confirm')}
                                            </button>
                                        </div>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>
                </section>
            )}

            <SubscriptionModal />
        </div>
    );
}
