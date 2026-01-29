import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useEffect, useState } from 'react';

interface UserState {
    // Identity
    agentUserId: string;

    // Preferences
    locale: 'zh-TW' | 'ja' | 'en';
    accessibilityMode: boolean;
    userProfile: 'general' | 'wheelchair' | 'stroller';
    userContext: string[];
    onboardingSeenVersion: number;

    // TripGuard
    isTripGuardActive: boolean;
    isLineBound: boolean;
    tripGuardSubscriptionId: string | null;
    tripGuardSummary: string | null;

    // Actions
    setLocale: (locale: 'zh-TW' | 'ja' | 'en') => void;
    toggleAccessibility: () => void;
    setUserProfile: (profile: 'general' | 'wheelchair' | 'stroller') => void;
    setUserContext: (context: string[]) => void;
    setOnboardingSeenVersion: (version: number) => void;

    setTripGuardActive: (isActive: boolean) => void;
    setLineBound: (isBound: boolean) => void;
    setTripGuardSubscriptionId: (id: string | null) => void;
    setTripGuardSummary: (summary: string | null) => void;
}

export const useUserStore = create<UserState>()(
    persist(
        (set) => ({
            agentUserId: crypto.randomUUID(), // Init on client side or via hydrator
            locale: 'zh-TW',
            accessibilityMode: false,
            userProfile: 'general',
            userContext: [],
            onboardingSeenVersion: 0,

            isTripGuardActive: false,
            isLineBound: false,
            tripGuardSubscriptionId: null,
            tripGuardSummary: null,

            setLocale: (locale) => set({ locale }),
            toggleAccessibility: () => set((state) => ({ accessibilityMode: !state.accessibilityMode })),
            setUserProfile: (profile) => set({ userProfile: profile }),
            setUserContext: (context) => set({ userContext: context }),
            setOnboardingSeenVersion: (version) => set({ onboardingSeenVersion: version }),

            setTripGuardActive: (isActive) => set({ isTripGuardActive: isActive }),
            setLineBound: (isBound) => set({ isLineBound: isBound }),
            setTripGuardSubscriptionId: (id) => set({ tripGuardSubscriptionId: id }),
            setTripGuardSummary: (summary) => set({ tripGuardSummary: summary }),
        }),
        {
            name: 'lutagu-user-storage',
            partialize: (state) => ({
                agentUserId: state.agentUserId,
                locale: state.locale,
                accessibilityMode: state.accessibilityMode,
                userContext: state.userContext,
                onboardingSeenVersion: state.onboardingSeenVersion,
                isTripGuardActive: state.isTripGuardActive,
                isLineBound: state.isLineBound,
                tripGuardSubscriptionId: state.tripGuardSubscriptionId,
                tripGuardSummary: state.tripGuardSummary
            }),
        }
    )
);

// 導出一個方便檢查水合狀態的 hook
export const useUserStoreHydrated = () => {
    const [hydrated, setHydrated] = useState(false);
    useEffect(() => {
        const unsub = useUserStore.persist.onFinishHydration(() => setHydrated(true));
        // Check if already hydrated
        if (useUserStore.persist.hasHydrated()) setHydrated(true);
        return () => unsub();
    }, []);
    return hydrated;
};

if (typeof window !== 'undefined') {
    (window as any).__LUTAGU_USER_STORE__ = useUserStore;
}
