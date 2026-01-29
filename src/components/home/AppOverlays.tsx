'use client';

import dynamic from 'next/dynamic';
import { useNodeStore } from '@/stores/nodeStore';
import { useUIStore } from '@/stores/uiStore';
import { useUserStore } from '@/stores/userStore';
import { useMapStore } from '@/stores/mapStore';
import { useUIStateMachine } from '@/stores/uiStateMachine';
import { SubscriptionModal } from '@/components/guard/SubscriptionModal';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { X, Map } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { getLocaleString } from '@/lib/utils/localeUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { NodeSkeleton } from '@/components/node/NodeSkeleton';
import { ONBOARDING_VERSION } from '@/constants/onboarding';

const NodeTabs = dynamic(
    () => import('@/components/node/NodeTabs').then(m => ({ default: m.NodeTabs })),
    { ssr: false, loading: () => <NodeSkeleton /> }
);

interface AppOverlaysProps {
    nodeData: any;
    profile: any;
}

export function AppOverlays({ nodeData, profile }: AppOverlaysProps) {
    const tCommon = useTranslations('common');
    const tNode = useTranslations('node');
    const tOnboarding = useTranslations('onboarding');
    const locale = useLocale();

    const currentNodeId = useNodeStore(s => s.currentNodeId);
    const setCurrentNode = useNodeStore(s => s.setCurrentNode);

    const isBottomSheetOpen = useUIStore(s => s.isBottomSheetOpen);
    const setBottomSheetOpen = useUIStore(s => s.setBottomSheetOpen);
    const isOnboardingOpen = useUIStore(s => s.isOnboardingOpen);
    const setIsOnboardingOpen = useUIStore(s => s.setIsOnboardingOpen);
    const setNodeActiveTab = useUIStore(s => s.setNodeActiveTab);
    const setDemoMode = useUIStore(s => s.setDemoMode);

    const setOnboardingSeenVersion = useUserStore(s => s.setOnboardingSeenVersion);
    const onboardingSeenVersion = useUserStore(s => s.onboardingSeenVersion);
    const setMapCenter = useMapStore(s => s.setMapCenter);

    console.log(`[AppOverlays] Render: isOpen=${isOnboardingOpen}, seenVersion=${onboardingSeenVersion}`);

    const { transitionTo } = useUIStateMachine();
    const [showSkipConfirm, setShowSkipConfirm] = useState(false);

    return (
        <>
            {/* Node Details Overlay */}
            {isBottomSheetOpen && (
                <section className="fixed inset-0 z-40 bg-white flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300" aria-label={tNode('details')} role="dialog" aria-modal="true">
                    <header className="w-full h-16 flex items-center justify-between px-6 border-b border-gray-100 bg-white/80 backdrop-blur-xl sticky top-0 z-10">
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
                                className="p-3.5 min-w-[48px] min-h-[48px] bg-gray-100 rounded-2xl text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-all active:scale-90 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                                aria-label={tCommon('close')}
                            >
                                <X size={24} aria-hidden="true" />
                            </button>
                        </div>
                    </header>
                    <div className="flex-1 overflow-hidden">
                        {nodeData ? <NodeTabs nodeData={nodeData} profile={profile} /> : <NodeSkeleton />}
                    </div>
                    <footer className="p-4 border-t border-gray-100 bg-white/95 backdrop-blur-xl safe-area-bottom">
                        <button
                            onClick={() => { setBottomSheetOpen(false); setCurrentNode(null); }}
                            className="w-full h-12 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold text-sm transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
                            aria-label={tCommon('backToMap')}
                        >
                            <Map size={18} aria-hidden="true" />
                            <span>{tCommon('backToMap')}</span>
                        </button>
                    </footer>
                </section>
            )}

            {/* Onboarding Modal */}
            {isOnboardingOpen && (
                <section className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300" aria-labelledby="onboarding-title" role="dialog" aria-modal="true">
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
                                    onClick={() => {
                                        console.log('[Onboarding] X clicked, showing confirm');
                                        setShowSkipConfirm(true);
                                    }}
                                    className="min-w-[44px] min-h-[44px] p-2.5 hover:bg-slate-50 rounded-full transition-colors text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
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
                                        { id: 'overtourism' },
                                        { id: 'disruption' },
                                        { id: 'handsfree' },
                                        { id: 'accessibility' }
                                    ].map((tip) => (
                                        <button
                                            key={`onboarding-tip-${tip.id}`}
                                            data-testid={`onboarding-tip-${tip.id}`}
                                            onClick={() => {
                                                console.log(`[Onboarding] Triggering demo: ${tip.id}`);
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
                                            <div className="text-xs font-bold text-slate-800 leading-snug group-hover:text-indigo-600 transition-colors">{tOnboarding(`tips.${tip.id}`)}</div>
                                            <div className="mt-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">{tOnboarding('askSubtitle')}</div>
                                        </button>
                                    ))}
                                </div>
                            </section>

                            <section className="mt-6 mb-8" aria-labelledby="onboarding-hubs-title">
                                <h3 id="onboarding-hubs-title" className="text-[11px] font-black text-slate-400 mb-3 uppercase tracking-wider">{tOnboarding('hubTitle')}</h3>
                                <div className="grid grid-cols-4 gap-2">
                                    {[
                                        { id: 'ueno', label: tOnboarding('hubs.ueno'), center: { lat: 35.7141, lon: 139.7774 }, node: 'odpt.Station:TokyoMetro.Ginza.Ueno' },
                                        { id: 'asakusa', label: tOnboarding('hubs.asakusa'), center: { lat: 35.7119, lon: 139.7976 }, node: 'odpt.Station:TokyoMetro.Ginza.Asakusa' },
                                        { id: 'akihabara', label: tOnboarding('hubs.akihabara'), center: { lat: 35.6984, lon: 139.7753 }, node: 'odpt.Station:TokyoMetro.Hibiya.Akihabara' },
                                        { id: 'tokyo', label: tOnboarding('hubs.tokyo'), center: { lat: 35.6812, lon: 139.7671 }, node: 'odpt.Station:TokyoMetro.Marunouchi.Tokyo' }
                                    ].map((hub) => (
                                        <button
                                            key={`onboarding-hub-${hub.id}`}
                                            data-testid={`onboarding-hub-${hub.id}`}
                                            onClick={() => {
                                                console.log(`[Onboarding] Hub clicked: ${hub.id}`);
                                                setMapCenter(hub.center);
                                                setCurrentNode(hub.node);
                                                setBottomSheetOpen(true);
                                                setOnboardingSeenVersion(ONBOARDING_VERSION);
                                                setIsOnboardingOpen(false);
                                            }}
                                            className="px-4 py-3 bg-white border border-slate-100/50 rounded-2xl text-[13px] font-black text-slate-600 hover:border-indigo-100 hover:bg-indigo-50/30 hover:text-indigo-600 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95"
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
                                            try {
                                                const res = await fetch(`/api/nodes/nearest?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
                                                if (res.ok) {
                                                    const data = await res.json();
                                                    if (data.node?.id) {
                                                        setMapCenter({ lat: pos.coords.latitude, lon: pos.coords.longitude });
                                                        setCurrentNode(data.node.id);
                                                    } else {
                                                        setMapCenter(defaultCenter);
                                                        setCurrentNode(defaultNode);
                                                    }
                                                    setBottomSheetOpen(true);
                                                    setNodeActiveTab('lutagu');
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
                                    console.log('[Onboarding] Browse First clicked');
                                    const ueno = { lat: 35.7141, lon: 139.7774 };
                                    if (!navigator.geolocation) {
                                        console.log('[Onboarding] No geolocation support, skipping');
                                        setMapCenter(ueno);
                                        setOnboardingSeenVersion(ONBOARDING_VERSION);
                                        setIsOnboardingOpen(false);
                                        return;
                                    }
                                    console.log('[Onboarding] Requesting geolocation...');
                                    navigator.geolocation.getCurrentPosition(
                                        (pos) => {
                                            console.log('[Onboarding] Geolocation success');
                                            setMapCenter({ lat: pos.coords.latitude, lon: pos.coords.longitude });
                                            setOnboardingSeenVersion(ONBOARDING_VERSION);
                                            setIsOnboardingOpen(false);
                                        },
                                        (err) => {
                                            console.log('[Onboarding] Geolocation error:', err.message);
                                            setMapCenter(ueno);
                                            setOnboardingSeenVersion(ONBOARDING_VERSION);
                                            setIsOnboardingOpen(false);
                                        }
                                    );
                                }}
                                data-testid="onboarding-browse-btn"
                                className="py-4 bg-slate-50 text-slate-600 rounded-2xl text-sm font-black hover:bg-slate-100 transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-slate-300"
                            >
                                {tOnboarding('browseFirst')}
                            </button>
                        </footer>

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
        </>
    );
}
