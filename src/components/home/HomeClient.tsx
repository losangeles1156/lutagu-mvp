'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { MainLayout } from '@/components/layout/MainLayout';
import { OfflineIndicator } from '@/components/ui/OfflineIndicator';
import { HomeLogic } from './HomeLogic';
import { BottomNavBar } from './BottomNavBar';
import { NodeProfile } from '@/lib/api/nodes';

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

    // Quick hydration fix removed to allow SSR content (Header) to show immediately

    return (
        <div className="relative min-h-screen bg-white">
            <OfflineIndicator />
            <HomeLogic setNodeData={setNodeData} setProfile={setProfile} />

            <MainLayout
                header={header} // Server Component slot
                mapPanel={mapPanel} // Client Component slot (Dynamic)
                chatPanel={chatPanel} // Client Component slot (Dynamic)
                bottomBar={<BottomNavBar nodeData={nodeData} />} // Client Component with local state
            />

            <AppOverlays nodeData={nodeData} profile={profile} />
        </div>
    );
}
