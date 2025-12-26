'use client';

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useZoneAwareness } from '@/hooks/useZoneAwareness';
import { useAppStore } from '@/stores/appStore';
import { NodeTabs } from '@/components/node/NodeTabs';
import { TripGuardStatus } from '@/components/guard/TripGuardStatus';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useEffect, useState } from 'react';
import { fetchNodeConfig, NodeProfile } from '@/lib/api/nodes';
import { Settings, X, Plus, Minus, LocateFixed, Layers, MessageSquare, Heart } from 'lucide-react';

const MapContainer = dynamic(
    () => import('@/components/map/MapContainer'),
    { ssr: false, loading: () => <div className="w-full h-screen bg-gray-100 animate-pulse" /> }
);

export default function Home() {
    const tNode = useTranslations('node');
    const { userLocation, isTooFar, centerFallback } = useZoneAwareness();
    const { currentNodeId, isBottomSheetOpen, setMapCenter, setBottomSheetOpen, setCurrentNode, activeTab } = useAppStore();

    const [nodeData, setNodeData] = useState<any>(null);
    const [profile, setProfile] = useState<NodeProfile | null>(null);

    useEffect(() => {
        if (currentNodeId) {
            console.log('[Page] Fetching Node Config for:', currentNodeId);
            fetchNodeConfig(currentNodeId).then(({ node, profile }) => {
                setNodeData(node);
                setProfile(profile);
            });
        } else {
            setNodeData(null);
            setProfile(null);
        }
    }, [currentNodeId]);

    return (
        <main className="flex min-h-screen flex-col items-center relative overflow-hidden bg-white">

            {/* 1. Map Layer (Visible only when sidebar/panel is thin or closed, but here we cover it) */}
            <div className={`absolute inset-0 z-0 transition-opacity duration-300 ${activeTab === 'explore' ? 'opacity-100' : 'opacity-0'}`}>
                <MapContainer />
            </div>

            {/* 2. Top Bar (System UI) */}
            <div className="absolute top-0 left-0 right-0 z-10 p-6 pt-16 pointer-events-none">
                <div className="flex justify-between items-start pointer-events-auto">
                    <div className="flex gap-3 ml-auto">
                        <TripGuardStatus />
                        <button className="glass-effect rounded-2xl p-3.5 hover:bg-white transition-all text-gray-500">
                            <Settings size={22} />
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
                                {nodeData?.name?.zh || nodeData?.name?.['zh-TW'] || nodeData?.title || (currentNodeId?.split('.').pop()) || 'Station'}
                            </h2>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                                {nodeData?.type || 'Node'} Details
                            </span>
                        </div>
                        <button
                            onClick={() => {
                                setBottomSheetOpen(false);
                                setCurrentNode(null);
                            }}
                            className="p-3 bg-gray-100 rounded-2xl text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-all active:scale-90"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Content Component Area (Fills remaining space) */}
                    <div className="flex-1 overflow-hidden">
                        <NodeTabs nodeData={nodeData} profile={profile} />
                    </div>
                </div>
            )}

            {/* 4. Other App Navigation or Overlays hidden for now if panel is open */}
        </main>
    );
}
