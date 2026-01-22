'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { useNodeStore } from '@/stores/nodeStore';
import { useUIStore } from '@/stores/uiStore';
import { useUserStore } from '@/stores/userStore';
import { useUIStateMachine } from '@/stores/uiStateMachine';
import { fetchNodeConfig, findFallbackNodeForId } from '@/lib/api/nodes';
import type { NodeProfile } from '@/lib/api/nodes';
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
    const [didHandleParams, setDidHandleParams] = useState(false);
    const [hadDeepLink, setHadDeepLink] = useState(false);

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
        const rawSearch = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const getParam = (key: string) => searchParams.get(key) ?? rawSearch?.get(key);

        const tab = getParam('tab');
        const node = getParam('node');
        const sheet = getParam('sheet');
        const q = getParam('q');
        const nodeTab = getParam('nodeTab');
        const demo = getParam('demo');
        const hasDeepLink = Boolean(tab || node || sheet || q || nodeTab || demo);

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
        setHadDeepLink(hasDeepLink);
        setDidHandleParams(true);
        if (changed) router.replace(window.location.pathname);
    }, [router, searchParams, setActiveTab, setBottomSheetOpen, setCurrentNode, setChatOpen, setPendingChat, setNodeActiveTab, setDemoMode, transitionTo]);

    // 2. Onboarding check
    useEffect(() => {
        if (!didHandleParams) return;
        if (hadDeepLink) return;
        if (isBottomSheetOpen) return;
        if (onboardingSeenVersion >= ONBOARDING_VERSION) return;
        setIsOnboardingOpen(true);
    }, [didHandleParams, hadDeepLink, isBottomSheetOpen, onboardingSeenVersion, setIsOnboardingOpen, ONBOARDING_VERSION]);

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
            const fallbackNode = findFallbackNodeForId(currentNodeId);
            const fallbackProfile: NodeProfile = {
                node_id: currentNodeId,
                category_counts: {
                    medical: 0,
                    shopping: 0,
                    dining: 0,
                    leisure: 0,
                    education: 0,
                    finance: 0
                },
                vibe_tags: [],
                l3_facilities: [],
                l4_cards: [],
                l2_status: {
                    congestion: 2,
                    line_status: [
                        { line: 'Transit', status: 'normal' }
                    ],
                    weather: { temp: 20, condition: 'Clear' }
                }
            };

            if (fallbackNode) {
                setNodeData(fallbackNode);
                setProfile(fallbackProfile);
            }

            fetchNodeConfig(currentNodeId)
                .then(({ node, profile }) => {
                    if (seq !== nodeRequestSeqRef.current) return;
                    setNodeData(node || fallbackNode || null);
                    setProfile(profile || fallbackProfile || null);
                })
                .catch(() => {
                    if (seq !== nodeRequestSeqRef.current) return;
                    if (!fallbackNode) {
                        setNodeData(null);
                        setProfile(null);
                        return;
                    }
                    setNodeData(fallbackNode);
                    if (typeof window !== 'undefined') {
                        void (async () => {
                            try {
                                const res = await fetch(`/api/l2/status?station_id=${encodeURIComponent(currentNodeId)}`);
                                if (seq !== nodeRequestSeqRef.current) return;
                                if (res.ok) {
                                    const l2 = await res.json();
                                    setProfile({ ...fallbackProfile, l2_status: l2 });
                                    return;
                                }
                            } catch {
                            }
                            if (seq === nodeRequestSeqRef.current) {
                                setProfile(fallbackProfile);
                            }
                        })();
                        return;
                    }
                    setProfile(fallbackProfile);
                });
        } else {
            nodeRequestSeqRef.current += 1;
            setNodeData(null);
            setProfile(null);
        }
    }, [currentNodeId, setNodeData, setProfile]);

    return null; // Logic only, no UI
}
