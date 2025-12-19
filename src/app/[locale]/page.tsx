'use client';

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useZoneAwareness } from '@/hooks/useZoneAwareness';
import { useAppStore } from '@/stores/appStore';
import { FacilityProfile } from '@/components/ui/FacilityProfile';
import { NodeTabs } from '@/components/node/NodeTabs';
import { ChatOverlay } from '@/components/chat/ChatOverlay';
import { TripGuardStatus } from '@/components/guard/TripGuardStatus';
import { SubscriptionModal } from '@/components/guard/SubscriptionModal';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useEffect, useState } from 'react';
import { fetchNodeConfig, FacilityProfile as IFacilityProfile } from '@/lib/api/nodes';
import { Cloud, Settings, Heart, Calendar, ArrowRight, MessageSquare, Map as MapIcon, ShieldCheck, User, LocateFixed, Layers, Plus, Minus } from 'lucide-react';

// Leaflet must be dynamic import with no SSR
const MapContainer = dynamic(
    () => import('@/components/map/MapContainer'),
    { ssr: false, loading: () => <div className="w-full h-screen bg-gray-100 animate-pulse" /> }
);

export default function Home() {
    const t = useTranslations('Home');
    const { zone, userLocation, isTooFar, centerFallback } = useZoneAwareness();
    const { currentNodeId, isBottomSheetOpen, activeTab, setActiveTab, setMapCenter } = useAppStore();

    const [nodeData, setNodeData] = useState<any>(null);
    const [profile, setProfile] = useState<IFacilityProfile | null>(null);

    // Fetch node details when ID changes
    useEffect(() => {
        if (currentNodeId) {
            fetchNodeConfig(currentNodeId).then(({ node, profile }) => {
                setNodeData(node);
                setProfile(profile);
            });
        }
    }, [currentNodeId]);

    // Zone specific UI Logic
    const isCore = zone === 'core';
    const isBuffer = zone === 'buffer';

    return (
        <main className="flex min-h-screen flex-col items-center justify-between relative overflow-hidden">

            {/* 1. Map Layer */}
            <div className={`absolute inset-0 z-0 transition-opacity duration-500 ${activeTab === 'explore' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <MapContainer />
            </div>

            {/* 1.1 Other Tab Views */}
            {activeTab === 'trips' && (
                <div className="absolute inset-0 z-5 bg-gray-50 p-6 pt-24 overflow-y-auto pb-32">
                    <h1 className="text-3xl font-black mb-6">行程守護</h1>
                    <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 mb-4">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
                                <ShieldCheck size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">尚未訂閱任何行程</h3>
                                <p className="text-sm text-gray-500">訂閱後，Bambi 會在異常發生時自動提醒你。</p>
                            </div>
                        </div>
                        <button className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl">開始探索景點</button>
                    </div>
                </div>
            )}

            {activeTab === 'me' && (
                <div className="absolute inset-0 z-5 bg-gray-50 p-6 pt-24 overflow-y-auto">
                    <h1 className="text-3xl font-black mb-6">個人設定</h1>
                    <div className="space-y-4">
                        <div className="bg-white p-4 rounded-3xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center text-rose-600">
                                    <User size={20} />
                                </div>
                                <span className="font-bold text-gray-700">訪客模式</span>
                            </div>
                            <button className="text-indigo-600 font-bold text-sm">登入 / 註冊</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. Top Bar (Status) */}
            <div className="absolute top-0 left-0 right-0 z-10 p-5 pointer-events-none">
                <div className="flex justify-between items-start pointer-events-auto">
                    {/* Weather / Status Pill */}
                    <div className="glass-effect rounded-full px-4 py-2 flex gap-3 items-center animate-in slide-in-from-top duration-500 shadow-xl shadow-black/5">
                        <div className="flex items-center gap-1.5 text-indigo-600 font-bold">
                            <Cloud size={18} className="animate-slow-pulse" />
                            <span>24°C</span>
                        </div>
                        <div className="w-px h-4 bg-gray-200" />
                        {isCore ? (
                            <div className="flex items-center gap-1.5 text-red-500 text-sm font-black animate-pulse">
                                <span className="w-2.5 h-2.5 bg-red-500 rounded-full" />
                                <span>銀座線延誤</span>
                            </div>
                        ) : (
                            <span className="text-gray-500 text-sm font-bold opacity-60 px-1">READY</span>
                        )}
                    </div>

                    {/* Settings / Locale */}
                    <div className="flex gap-3">
                        <TripGuardStatus />
                        <button className="glass-effect rounded-full p-3 hover:bg-white transition-all active:scale-90 shadow-xl shadow-black/5">
                            <Settings size={22} className="text-gray-600" />
                        </button>
                        <LanguageSwitcher />
                    </div>
                </div>
            </div>

            {/* 2.1 Map Floating Action Buttons (FABs) */}
            {
                activeTab === 'explore' && !isBottomSheetOpen && (
                    <div className="absolute right-5 bottom-32 z-10 flex flex-col gap-3 animate-in fade-in slide-in-from-right duration-500">
                        <button
                            onClick={() => {
                                if (isTooFar) {
                                    // Explicitly center on fallback if too far
                                    setMapCenter(centerFallback);
                                    useAppStore.getState().addMessage({
                                        role: 'assistant',
                                        content: '📍 您目前距離感性導航區域較遠，地圖已自動回正至上野車站中心點。'
                                    });
                                } else if (userLocation) {
                                    setMapCenter(userLocation);
                                }
                            }}
                            className="glass-effect rounded-2xl p-4 shadow-2xl shadow-indigo-200 text-indigo-600 active:scale-90 transition-all"
                        >
                            <LocateFixed size={24} />
                        </button>
                        <div className="flex flex-col glass-effect rounded-2xl shadow-2xl shadow-black/5">
                            <button className="p-4 border-b border-gray-100/50 text-gray-600 active:scale-90 transition-all">
                                <Plus size={22} />
                            </button>
                            <button className="p-4 text-gray-600 active:scale-90 transition-all">
                                <Minus size={22} />
                            </button>
                        </div>
                        <button className="glass-effect rounded-2xl p-4 shadow-2xl shadow-black/5 text-gray-600 active:scale-90 transition-all">
                            <Layers size={22} />
                        </button>
                    </div>
                )
            }

            {/* 3. Bottom Sheet */}
            {isBottomSheetOpen && (
                <div className="absolute bottom-0 left-0 right-0 z-20 bg-white rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.1)] transition-transform duration-300 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
                    {/* Handle */}
                    <div className="w-full flex justify-center pt-3 pb-1">
                        <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
                    </div>

                    {!nodeData ? (
                        // Skeleton Loader
                        <div className="p-6 space-y-6">
                            <div className="space-y-3">
                                <div className="h-8 w-1/3 bg-gray-100 rounded-lg animate-pulse" />
                                <div className="flex gap-2">
                                    <div className="h-4 w-16 bg-gray-100 rounded-md animate-pulse" />
                                    <div className="h-4 w-20 bg-gray-100 rounded-md animate-pulse" />
                                </div>
                            </div>
                            <div className="grid grid-cols-4 gap-4 pt-4 border-b border-gray-50 pb-4">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="h-8 bg-gray-100 rounded-lg animate-pulse" />
                                ))}
                            </div>
                            <div className="h-40 bg-gray-50 rounded-3xl animate-pulse" />
                        </div>
                    ) : (
                        // Real Content
                        <div className="p-6 space-y-6">
                            {/* Header */}
                            <div className="relative">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h2 className="text-3xl font-black text-gray-900 tracking-tight">
                                            {nodeData.name?.['zh-TW'] || nodeData.name?.['en'] || 'Unknown'}
                                        </h2>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-sm font-medium text-gray-400">{nodeData.type}</span>
                                            {nodeData.vibe && (
                                                <>
                                                    <div className="w-1 h-1 bg-gray-300 rounded-full" />
                                                    <span className="text-xs font-bold bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full uppercase tracking-wider">
                                                        {nodeData.vibe}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute top-0 right-0 flex items-center">
                                    <button className="p-3 bg-gray-100 rounded-full text-gray-500 hover:bg-rose-50 hover:text-rose-500 transition-colors">
                                        <Heart size={24} />
                                    </button>
                                    <button
                                        onClick={() => useAppStore.getState().setChatOpen(true)}
                                        className="p-3 bg-indigo-50 rounded-full text-indigo-600 hover:bg-indigo-100 transition-colors ml-2"
                                    >
                                        <MessageSquare size={24} />
                                    </button>
                                    <button
                                        onClick={() => {
                                            useAppStore.getState().setBottomSheetOpen(false);
                                            useAppStore.getState().setCurrentNode(null);
                                        }}
                                        className="p-3 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition-colors ml-2"
                                    >
                                        <Minus size={24} className="rotate-45" /> {/* Close Icon */}
                                    </button>
                                </div>
                            </div>

                            {/* Node Content Tabs (L1/L2/L3) */}
                            <div className="mt-2 bg-gray-50/50 p-1 rounded-2xl">
                                <NodeTabs
                                    nodeData={nodeData}
                                    profile={profile}
                                />
                            </div>

                            {/* Buffer Zone Message */}
                            {!isCore && (
                                <div className="flex items-center gap-3 p-4 bg-orange-50/50 border border-orange-100 rounded-2xl text-orange-800 text-sm">
                                    <div className="p-2 bg-white rounded-xl shadow-sm">ℹ️</div>
                                    <span>此區域目前僅提供基礎資訊，Bambi AI 的感性導航功能正在擴張中。</span>
                                </div>
                            )}

                            {/* Actions (Plan a Trip) */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => {
                                        useAppStore.getState().addMessage({
                                            role: 'assistant',
                                            content: `已將「${nodeData.name?.['zh-TW'] || nodeData.name?.['en']}」加入您的行程草稿！`
                                        });
                                        useAppStore.getState().setChatOpen(true);
                                    }}
                                    className="flex-[2] bg-indigo-600 text-white font-bold py-4 rounded-3xl hover:bg-indigo-700 transition active:scale-95 shadow-xl shadow-indigo-200 flex items-center justify-center gap-2"
                                >
                                    <Calendar size={20} />
                                    <span>加入我的行程</span>
                                    <ArrowRight size={18} className="opacity-50" />
                                </button>
                            </div>


                        </div>
                        </div>
            )}
        </div>
    )
}

{/* 4. Bottom Navigation Bar */ }
<div className="absolute bottom-6 left-6 right-6 z-30">
    <div className="glass-effect rounded-[32px] p-2 flex justify-between items-center shadow-[0_15px_40px_rgba(0,0,0,0.15)] bg-white/80 border border-white/50">
        <button
            onClick={() => setActiveTab('explore')}
            className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-2xl transition-all ${activeTab === 'explore' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 rotate-1' : 'text-gray-400 hover:text-gray-600'}`}
        >
            <MapIcon size={20} fill={activeTab === 'explore' ? "white" : "none"} />
            <span className="text-[10px] font-black uppercase tracking-tighter">探索</span>
        </button>
        <button
            onClick={() => setActiveTab('trips')}
            className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-2xl transition-all ${activeTab === 'trips' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 -rotate-1' : 'text-gray-400 hover:text-gray-600'}`}
        >
            <ShieldCheck size={20} fill={activeTab === 'trips' ? "white" : "none"} />
            <span className="text-[10px] font-black uppercase tracking-tighter">守護</span>
        </button>
        <button
            onClick={() => setActiveTab('me')}
            className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-2xl transition-all ${activeTab === 'me' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 rotate-1' : 'text-gray-400 hover:text-gray-600'}`}
        >
            <User size={20} fill={activeTab === 'me' ? "white" : "none"} />
            <span className="text-[10px] font-black uppercase tracking-tighter">我的</span>
        </button>
    </div>
</div>

{/* Chat Interface */ }
<ChatOverlay />

{/* Guard Modal */ }
<SubscriptionModal />
        </main >
    );
}

