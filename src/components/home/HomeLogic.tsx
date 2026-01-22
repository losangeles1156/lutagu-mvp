'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { useNodeStore } from '@/stores/nodeStore';
import { useUIStore } from '@/stores/uiStore';
import { useUserStore } from '@/stores/userStore';
import { useUIStateMachine } from '@/stores/uiStateMachine';
import { fetchNodeConfig } from '@/lib/api/nodes';
import { getSupabase } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

export function HomeLogic({
    setNodeData,
    setProfile
}: {
    setNodeData: (data: any) => void,
    setProfile: (profile: any) => void
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const nodeRequestSeqRef = useRef(0);
    const ONBOARDING_VERSION = 1;

    // Migrated Store Hooks
    const currentNodeId = useNodeStore(s => s.currentNodeId);
    const setCurrentNode = useNodeStore(s => s.setCurrentNode);

    const isBottomSheetOpen = useUIStore(s => s.isBottomSheetOpen);
    const setBottomSheetOpen = useUIStore(s => s.setBottomSheetOpen);
    const activeTab = useUIStore(s => s.activeTab);
    const setActiveTab = useUIStore(s => s.setActiveTab);
    const setChatOpen = useUIStore(s => s.setChatOpen);
    const setIsOnboardingOpen = useUIStore(s => s.setIsOnboardingOpen);
    const setPendingChat = useUIStore(s => s.setPendingChat);
    const setNodeActiveTab = useUIStore(s => s.setNodeActiveTab);
    const setDemoMode = useUIStore(s => s.setDemoMode);

    const onboardingSeenVersion = useUserStore(s => s.onboardingSeenVersion);

    const { transitionTo } = useUIStateMachine();

    // Initialize Supabase client once
    const supabase = useMemo<SupabaseClient | null>(() => {
        try { return getSupabase(); } catch { return null; }
    }, []);

    // 1. URL params handling
    useEffect(() => {
        const tab = searchParams.get('tab');
        const node = searchParams.get('node');
        const sheet = searchParams.get('sheet');
        const q = searchParams.get('q');
        const nodeTab = searchParams.get('nodeTab');
        const demo = searchParams.get('demo');

        let changed = false;

        // Demo mode
        if (demo && ['overtourism', 'disruption', 'handsfree', 'accessibility'].includes(demo)) {
            setDemoMode(true, demo);
            transitionTo('fullscreen');
            changed = true;
        } else if (q) {
            transitionTo('fullscreen');
            setPendingChat({ input: q, autoSend: true });
            changed = true;
        }

        if (tab === 'explore' || tab === 'trips' || tab === 'me') { setActiveTab(tab); changed = true; }
        if (typeof node === 'string' && node.length > 0) { setCurrentNode(node); if (sheet === '1') setBottomSheetOpen(true); changed = true; }
        if (sheet === '1' && !node) { setBottomSheetOpen(true); changed = true; }
        if (nodeTab && ['lutagu', 'dna', 'live', 'facility', 'transit'].includes(nodeTab)) {
            setNodeActiveTab(nodeTab);
            changed = true;
        }
        if (changed) router.replace(window.location.pathname);
    }, [router, searchParams, setActiveTab, setBottomSheetOpen, setCurrentNode, setChatOpen, setPendingChat, setNodeActiveTab, setDemoMode, transitionTo]);

    // 2. Onboarding check
    useEffect(() => {
        if (isBottomSheetOpen) return;
        if (onboardingSeenVersion >= ONBOARDING_VERSION) return;
        setIsOnboardingOpen(true);
    }, [isBottomSheetOpen, onboardingSeenVersion, setIsOnboardingOpen, ONBOARDING_VERSION]);

    // 3. Session handling
    useEffect(() => {
        if (!supabase) return;
        const client = supabase;
        const { data } = client.auth.onAuthStateChange((_event, session) => {
            // Session state handled globally or in specific stores
        });
        return () => { if (data?.subscription) data.subscription.unsubscribe(); };
    }, [supabase]);

    // 4. Node data fetching
    useEffect(() => {
        if (currentNodeId) {
            const seq = ++nodeRequestSeqRef.current;
            fetchNodeConfig(currentNodeId)
                .then(({ node, profile }) => {
                    if (seq !== nodeRequestSeqRef.current) return;
                    setNodeData(node);
                    setProfile(profile);
                })
                .catch(() => {
                    if (seq !== nodeRequestSeqRef.current) return;
                    setNodeData(null);
                    setProfile(null);
                });
        } else {
            nodeRequestSeqRef.current += 1;
            setNodeData(null);
            setProfile(null);
        }
    }, [currentNodeId, setNodeData, setProfile]);

    return null; // Logic only, no UI
}
