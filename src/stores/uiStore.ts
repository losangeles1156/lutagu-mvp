import { create } from 'zustand';

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    actions?: any[];
    isLoading?: boolean;
    feedback?: { score: number; reason?: string };
}

interface UIState {
    // Bottom Sheet
    isBottomSheetOpen: boolean;
    isMobile: boolean;

    // Chat UI
    isChatOpen: boolean;
    chatDisplayMode: 'mini' | 'split' | 'full';
    messages: ChatMessage[];
    pendingChatInput: string | null;
    pendingChatAutoSend: boolean;
    agentConversationId: string | null;



    // Tabs
    activeTab: 'explore' | 'trips' | 'me';
    nodeActiveTab: string;

    // Modals
    isOnboardingOpen: boolean;
    isSubscriptionModalOpen: boolean;
    isTripGuardActive: boolean;
    tripGuardSummary: string | null;
    tripGuardSubscriptionId: string | null;

    // Demo Mode
    isDemoMode: boolean;
    activeDemoId: string | null;

    // Intent Selector
    selectedNeed: string | null;

    // Actions
    setBottomSheetOpen: (isOpen: boolean) => void;
    setIsMobile: (isMobile: boolean) => void;
    setChatOpen: (isOpen: boolean) => void;
    setChatDisplayMode: (mode: 'mini' | 'split' | 'full') => void;

    // Chat Actions
    setAgentConversationId: (id: string | null) => void;
    resetAgentConversation: () => void;
    addMessage: (message: ChatMessage) => void;
    updateLastMessage: (updates: Partial<ChatMessage>) => void;
    clearMessages: () => void;
    setPendingChat: (payload: { input: string | null; autoSend?: boolean }) => void;

    setActiveTab: (tab: 'explore' | 'trips' | 'me') => void;
    setNodeActiveTab: (tab: string) => void;

    setIsOnboardingOpen: (isOpen: boolean) => void;
    setSubscriptionModalOpen: (isOpen: boolean) => void;
    setTripGuardActive: (isActive: boolean) => void;
    setTripGuardSummary: (summary: string | null) => void;
    setTripGuardSubscriptionId: (id: string | null) => void;

    setDemoMode: (isDemo: boolean, demoId?: string) => void;
    setSelectedNeed: (need: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
    isBottomSheetOpen: false,
    isMobile: false,

    isChatOpen: false,
    chatDisplayMode: 'split',
    messages: [],
    pendingChatInput: null,
    pendingChatAutoSend: false,
    agentConversationId: null,

    activeTab: 'explore',
    nodeActiveTab: 'lutagu',

    isOnboardingOpen: false,
    isSubscriptionModalOpen: false,
    isTripGuardActive: false,
    tripGuardSummary: null,
    tripGuardSubscriptionId: null,

    isDemoMode: false,
    activeDemoId: null,
    selectedNeed: null,

    setBottomSheetOpen: (isOpen) => set({ isBottomSheetOpen: isOpen }),
    setIsMobile: (isMobile) => set({ isMobile }),
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
    clearMessages: () => set({ messages: [] }),
    setPendingChat: ({ input, autoSend }) => set({ pendingChatInput: input, pendingChatAutoSend: autoSend ?? false }),

    setActiveTab: (tab) => set({ activeTab: tab }),
    setNodeActiveTab: (tab) => set({ nodeActiveTab: tab }),

    setIsOnboardingOpen: (isOpen) => set({ isOnboardingOpen: isOpen }),
    setSubscriptionModalOpen: (isOpen) => set({ isSubscriptionModalOpen: isOpen }),
    setTripGuardActive: (isActive) => set({ isTripGuardActive: isActive }),
    setTripGuardSummary: (summary) => set({ tripGuardSummary: summary }),
    setTripGuardSubscriptionId: (id) => set({ tripGuardSubscriptionId: id }),

    setDemoMode: (isDemo, demoId) => set({ isDemoMode: isDemo, activeDemoId: demoId || null }),
    setSelectedNeed: (need) => set({ selectedNeed: need }),
}));
