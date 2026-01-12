import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
    currentNodeId: string | null;
    currentZone: 'core' | 'buffer' | 'outer';

    agentUserId: string;
    agentConversationId: string | null;

    isBottomSheetOpen: boolean;
    isChatOpen: boolean;
    chatDisplayMode: 'mini' | 'split' | 'full';
    messages: Array<{
        role: 'user' | 'assistant';
        content: string;
        actions?: any[];
        isLoading?: boolean;
        feedback?: { score: number; reason?: string };
    }>;
    mapCenter: { lat: number; lon: number } | null;
    isTripGuardActive: boolean;
    tripGuardSummary: string | null;
    tripGuardSubscriptionId: string | null;
    isSubscriptionModalOpen: boolean;
    isLineBound: boolean;
    isMobile: boolean;

    locale: 'zh-TW' | 'ja' | 'en';
    accessibilityMode: boolean;
    userProfile: 'general' | 'wheelchair' | 'stroller';
    activeTab: 'explore' | 'trips' | 'me';

    onboardingSeenVersion: number;
    isOnboardingOpen: boolean;
    pendingChatInput: string | null;
    pendingChatAutoSend: boolean;

    isDemoMode: boolean;
    activeDemoId: string | null;
    setDemoMode: (isDemo: boolean, demoId?: string) => void;

    setCurrentNode: (id: string | null) => void;
    setZone: (zone: 'core' | 'buffer' | 'outer') => void;
    setBottomSheetOpen: (isOpen: boolean) => void;
    setIsOnboardingOpen: (isOpen: boolean) => void;
    setChatOpen: (isOpen: boolean) => void;
    setChatDisplayMode: (mode: 'mini' | 'split' | 'full') => void;
    setAgentConversationId: (id: string | null) => void;
    resetAgentConversation: () => void;
    addMessage: (message: {
        role: 'user' | 'assistant';
        content: string;
        actions?: any[];
        isLoading?: boolean;
    }) => void;
    updateLastMessage: (updates: Partial<{
        content: string;
        isLoading: boolean;
        actions?: any[];
    }>) => void;
    setMapCenter: (center: { lat: number; lon: number } | null) => void;
    setTripGuardActive: (isActive: boolean) => void;
    setTripGuardSummary: (summary: string | null) => void;
    setTripGuardSubscriptionId: (id: string | null) => void;
    setSubscriptionModalOpen: (isOpen: boolean) => void;
    setLineBound: (isBound: boolean) => void;
    setIsMobile: (isMobile: boolean) => void;
    setLocale: (locale: 'zh-TW' | 'ja' | 'en') => void;
    clearMessages: () => void;
    toggleAccessibility: () => void;
    setUserProfile: (profile: 'general' | 'wheelchair' | 'stroller') => void;
    setActiveTab: (tab: 'explore' | 'trips' | 'me') => void;
    userContext: string[];
    setUserContext: (context: string[]) => void;

    setOnboardingSeenVersion: (version: number) => void;
    setPendingChat: (payload: { input: string | null; autoSend?: boolean }) => void;

    // Intent Selector State (for Dify selected_need)
    selectedNeed: string | null;
    setSelectedNeed: (need: string | null) => void;

    // Node Tab State (for L1-L4 tab switching via URL)
    nodeActiveTab: string;
    setNodeActiveTab: (tab: string) => void;

    // Route State
    routeStart: { lat: number; lon: number; name?: string; id?: string } | null;
    routeEnd: { lat: number; lon: number; name?: string; id?: string } | null;
    routePath: [number, number][] | null;
    routeSummary: { total_distance_meters: number; estimated_duration_minutes: number } | null;
    isRouteCalculating: boolean;

    setRouteStart: (point: { lat: number; lon: number; name?: string; id?: string } | null) => void;
    setRouteEnd: (point: { lat: number; lon: number; name?: string; id?: string } | null) => void;
    setRoutePath: (path: [number, number][] | null) => void;
    setRouteSummary: (summary: { total_distance_meters: number; estimated_duration_minutes: number } | null) => void;
    setIsRouteCalculating: (isCalculating: boolean) => void;
    clearRoute: () => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            currentNodeId: null,
            currentZone: 'outer',

            // [FIX] Initialize with empty string to avoid hydration mismatch
            // The actual UUID will be generated on first client-side access
            agentUserId: '',
            agentConversationId: null,

            isBottomSheetOpen: false,
            isChatOpen: false,
            chatDisplayMode: 'split',
            messages: [],
            mapCenter: null,
            isTripGuardActive: false,
            tripGuardSummary: null,
            tripGuardSubscriptionId: null,
            isSubscriptionModalOpen: false,
            isLineBound: false,
            isMobile: false,
            locale: 'zh-TW',
            accessibilityMode: false,
            userProfile: 'general',
            activeTab: 'explore',
            userContext: [],

            onboardingSeenVersion: 0,
            isOnboardingOpen: false,
            pendingChatInput: null,
            pendingChatAutoSend: false,
            isDemoMode: false,
            activeDemoId: null,

            // Intent Selector State
            selectedNeed: null,

            // Node Tab State
            nodeActiveTab: 'lutagu',

            // Route State Initial Values
            routeStart: null,
            routeEnd: null,
            routePath: null,
            routeSummary: null,
            isRouteCalculating: false,

            setCurrentNode: (id) => set({ currentNodeId: id }),
            setZone: (zone) => set({ currentZone: zone }),
            setBottomSheetOpen: (isOpen) => set({ isBottomSheetOpen: isOpen }),
            setIsOnboardingOpen: (isOpen) => set({ isOnboardingOpen: isOpen }),
            setChatOpen: (isOpen) => set({ isChatOpen: isOpen }),
            setChatDisplayMode: (mode) => set({ chatDisplayMode: mode }),
            setAgentConversationId: (id) => set({ agentConversationId: id }),
            resetAgentConversation: () => set({ agentConversationId: null }),
            addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
            updateLastMessage: (updates) => set((state) => {
                if (state.messages.length === 0) return state;
                const updatedMessages = [...state.messages];
                const lastIndex = updatedMessages.length - 1;
                updatedMessages[lastIndex] = { ...updatedMessages[lastIndex], ...updates };
                return { messages: updatedMessages };
            }),
            setMapCenter: (center) => set({ mapCenter: center }),
            setTripGuardActive: (isActive) => set({ isTripGuardActive: isActive }),
            setTripGuardSummary: (summary) => set({ tripGuardSummary: summary }),
            setTripGuardSubscriptionId: (id) => set({ tripGuardSubscriptionId: id }),
            setSubscriptionModalOpen: (isOpen) => set({ isSubscriptionModalOpen: isOpen }),
            setLineBound: (isBound) => set({ isLineBound: isBound }),
            setIsMobile: (isMobile) => set({ isMobile }),
            setLocale: (locale) => set({ locale }),
            clearMessages: () => set({ messages: [] }),
            toggleAccessibility: () => set((state) => ({ accessibilityMode: !state.accessibilityMode })),
            setUserProfile: (profile) => set({ userProfile: profile }),
            setActiveTab: (tab) => set({ activeTab: tab }),
            setUserContext: (context) => set({ userContext: context }),

            setOnboardingSeenVersion: (version) => set({ onboardingSeenVersion: version }),
            setPendingChat: ({ input, autoSend }) =>
                set({
                    pendingChatInput: input,
                    pendingChatAutoSend: autoSend ?? false
                }),

            // Demo Mode State
            setDemoMode: (isDemo, demoId) => set({ isDemoMode: isDemo, activeDemoId: demoId || null }),

            // Intent Selector Action
            setSelectedNeed: (need) => set({ selectedNeed: need }),

            // Node Tab Action
            setNodeActiveTab: (tab) => set({ nodeActiveTab: tab }),

            // Route Actions
            setRouteStart: (point) => set({ routeStart: point }),
            setRouteEnd: (point) => set({ routeEnd: point }),
            setRoutePath: (path) => set({ routePath: path }),
            setRouteSummary: (summary) => set({ routeSummary: summary }),
            setIsRouteCalculating: (isCalculating) => set({ isRouteCalculating: isCalculating }),
            clearRoute: () => set({
                routeStart: null,
                routeEnd: null,
                routePath: null,
                routeSummary: null,
                isRouteCalculating: false
            }),
        }),
        {
            name: 'lutagu-storage',
            partialize: (state) => ({
                agentUserId: state.agentUserId,
                locale: state.locale,
                accessibilityMode: state.accessibilityMode,
                userContext: state.userContext,
                onboardingSeenVersion: state.onboardingSeenVersion
            }),
        }
    )
);
