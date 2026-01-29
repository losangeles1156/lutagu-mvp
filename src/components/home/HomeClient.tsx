'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { MainLayout } from '@/components/layout/MainLayout';
import { HomeLogic } from './HomeLogic';
import { BottomNavBar } from './BottomNavBar';
import { NodeProfile } from '@/lib/api/nodes';
import { NodeDisplayProvider } from '@/providers/NodeDisplayProvider';
import { GlobalAlertList } from '@/components/common/GlobalAlertList';

// Lazy load heavy overlay components to reduce TBT
const AppOverlays = dynamic(
    () => import('./AppOverlays').then(m => ({ default: m.AppOverlays })),
    { ssr: false }
);

interface HomeClientProps {
    header: React.ReactNode;
    mapPanel: React.ReactNode;
    chatPanel: React.ReactNode;
}

export function HomeClient({ header, mapPanel, chatPanel }: HomeClientProps) {
    const [nodeData, setNodeData] = useState<any>(null);
    const [profile, setProfile] = useState<NodeProfile | null>(null);

    return (
        <div className="relative min-h-screen bg-white">
            <HomeLogic setNodeData={setNodeData} setProfile={setProfile} />
            <GlobalAlertList />

            <NodeDisplayProvider>
                <MainLayout
                    header={header}
                    mapPanel={mapPanel}
                    chatPanel={chatPanel}
                    bottomBar={<BottomNavBar nodeData={nodeData} />}
                />
            </NodeDisplayProvider>

            <AppOverlays nodeData={nodeData} profile={profile} />
        </div>
    );
}
