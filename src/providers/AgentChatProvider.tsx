'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useAgentChat } from '@/hooks/useAgentChat';
import { useNodeStore } from '@/stores/nodeStore';
import { useZoneAwareness } from '@/hooks/useZoneAwareness';

type AgentChatContextType = ReturnType<typeof useAgentChat>;

const AgentChatContext = createContext<AgentChatContextType | null>(null);

export function AgentChatProvider({ children }: { children: ReactNode }) {
    const currentNodeId = useNodeStore(s => s.currentNodeId);
    const { userLocation } = useZoneAwareness();

    const chat = useAgentChat({
        stationId: currentNodeId || '',
        userLocation: userLocation ? { lat: userLocation.lat, lng: userLocation.lon } : undefined,
        syncToUIStateMachine: true,
    });

    return (
        <AgentChatContext.Provider value={chat}>
            {children}
        </AgentChatContext.Provider>
    );
}

export function useAgentChatContext() {
    const context = useContext(AgentChatContext);
    if (!context) {
        throw new Error('useAgentChatContext must be used within an AgentChatProvider');
    }
    return context;
}
