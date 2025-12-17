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
import { useEffect, useState } from 'react';
import { fetchNodeConfig, FacilityProfile as IFacilityProfile } from '@/lib/api/nodes';

// Leaflet must be dynamic import with no SSR
const MapContainer = dynamic(
    () => import('@/components/map/MapContainer'),
    { ssr: false, loading: () => <div className="w-full h-screen bg-gray-100 animate-pulse" /> }
);

export default function Home() {
    const t = useTranslations('Home');
    const { zone } = useZoneAwareness();
    const { currentNodeId, isBottomSheetOpen } = useAppStore();

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
            <div className="absolute inset-0 z-0">
                <MapContainer />
            </div>

            {/* 2. Top Bar (Status) */}
            <div className="absolute top-0 left-0 right-0 z-10 p-4 pointer-events-none">
                <div className="flex justify-between items-start pointer-events-auto">
                    {/* Weather / Status Pill Placeholder */}
                    <div className="bg-white/90 backdrop-blur rounded-full px-3 py-1 shadow-sm text-sm font-medium flex gap-2 items-center">
                        <span>🌧️ 24°C</span>
                        {isCore && <span className="text-red-500">⚡ 銀座線延誤</span>}
                    </div>

                    {/* Settings / Locale */}
                    <div className="flex gap-3">
                        <TripGuardStatus />
                        <div className="bg-white/90 backdrop-blur rounded-full p-2 shadow-sm">
                            ⚙️
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Bottom Sheet */}
            {isBottomSheetOpen && nodeData && (
                <div className="absolute bottom-0 left-0 right-0 z-20 bg-white rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.1)] transition-transform duration-300 max-h-[85vh] overflow-y-auto">
                    {/* Handle */}
                    <div className="w-full flex justify-center pt-3 pb-1">
                        <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
                    </div>

                    <div className="p-4 space-y-4">
                        {/* Header */}
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">
                                {nodeData.name?.['zh-TW'] || nodeData.name?.['en'] || 'Unknown'}
                            </h2>
                            <p className="text-sm text-gray-500">{nodeData.type}</p>
                            {nodeData.vibe && (
                                <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full uppercase tracking-wide">
                                    {nodeData.vibe}
                                </span>
                            )}
                        </div>

                        {/* Node Content Tabs (L1/L2/L3) */}
                        <div className="mt-4">
                            <NodeTabs
                                nodeData={nodeData}
                                profile={isCore ? profile : null}
                            />
                        </div>

                        {/* Buffer Zone Message (Handled optionally inside tabs or here) */}
                        {!isCore && (
                            <div className="mt-2 p-3 bg-yellow-50 text-yellow-800 rounded-lg text-xs">
                                ℹ️ 此區域僅提供基本導航 (This zone has limited AI features)
                            </div>
                        )}

                        {/* Actions (Plan a Trip) */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    useAppStore.getState().addMessage({
                                        role: 'assistant',
                                        content: `已將「${nodeData.name?.['zh-TW'] || nodeData.name?.['en']}」加入您的行程草稿！`
                                    });
                                    // Close sheet optional, or show success UI
                                    useAppStore.getState().setChatOpen(true); // Helper: Open chat to show confirmation
                                }}
                                className="flex-1 bg-indigo-600 text-white font-medium py-3 rounded-full hover:bg-indigo-700 transition active:scale-95 shadow-lg shadow-indigo-200"
                            >
                                📅 加入行程
                            </button>
                            <button className="p-3 bg-gray-100 rounded-full text-gray-600 hover:bg-gray-200">
                                ❤️
                            </button>
                        </div>

                        {/* AI Input Placeholder */}
                        <div className="mt-4">
                            <input
                                type="text"
                                readOnly
                                onClick={() => useAppStore.getState().setChatOpen(true)}
                                placeholder={isCore ? t('aiPlaceholder') : "輸入目的地..."}
                                className="w-full bg-gray-100 rounded-full px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer text-gray-600"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Nav Placeholder (optional) */}

            {/* Bottom Floating Chat Trigger (Visible when sheet is closed) */}
            {!isBottomSheetOpen && (
                <div className="absolute bottom-6 left-4 right-4 z-10 flex justify-center">
                    <button
                        onClick={() => useAppStore.getState().setChatOpen(true)}
                        className="w-full max-w-md bg-white/90 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.1)] rounded-full px-6 py-4 flex items-center gap-3 text-left transition-transform active:scale-95 border border-indigo-50"
                    >
                        <span className="text-xl">✨</span>
                        <span className="text-gray-500 font-medium">問 BambiGO... (帶我去上野)</span>
                    </button>
                </div>
            )}

            {/* Chat Interface */}
            <ChatOverlay />

            {/* Guard Modal */}
            <SubscriptionModal />
        </main>
    );
}
