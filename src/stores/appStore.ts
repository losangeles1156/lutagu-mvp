import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
    currentNodeId: string | null;
    currentZone: 'core' | 'buffer' | 'outer';

    isBottomSheetOpen: boolean;
    isChatOpen: boolean;
    messages: Array<{ role: 'user' | 'assistant'; content: string; actions?: any[] }>;
    mapCenter: { lat: number; lon: number } | null;
    isTripGuardActive: boolean;
    isSubscriptionModalOpen: boolean;

    locale: 'zh-TW' | 'ja' | 'en';
    accessibilityMode: boolean;

    setCurrentNode: (id: string | null) => void;
    setZone: (zone: 'core' | 'buffer' | 'outer') => void;
    setBottomSheetOpen: (isOpen: boolean) => void;
    setChatOpen: (isOpen: boolean) => void;
    addMessage: (message: { role: 'user' | 'assistant'; content: string; actions?: any[] }) => void;
    setMapCenter: (center: { lat: number; lon: number } | null) => void;
    setTripGuardActive: (isActive: boolean) => void;
    setSubscriptionModalOpen: (isOpen: boolean) => void;
    setLocale: (locale: 'zh-TW' | 'ja' | 'en') => void;
    toggleAccessibility: () => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            currentNodeId: null,
            currentZone: 'outer',
            isBottomSheetOpen: false,
            isChatOpen: false,
            messages: [],
            mapCenter: null,
            isTripGuardActive: false,
            isSubscriptionModalOpen: false,
            locale: 'zh-TW',
            accessibilityMode: false,

            setCurrentNode: (id) => set({ currentNodeId: id }),
            setZone: (zone) => set({ currentZone: zone }),
            setBottomSheetOpen: (isOpen) => set({ isBottomSheetOpen: isOpen }),
            setChatOpen: (isOpen) => set({ isChatOpen: isOpen }),
            addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
            setMapCenter: (center) => set({ mapCenter: center }),
            setTripGuardActive: (isActive) => set({ isTripGuardActive: isActive }),
            setSubscriptionModalOpen: (isOpen) => set({ isSubscriptionModalOpen: isOpen }),
            setLocale: (locale) => set({ locale }),
            toggleAccessibility: () => set((state) => ({ accessibilityMode: !state.accessibilityMode })),
        }),
        {
            name: 'bambigo-storage',
            partialize: (state) => ({
                locale: state.locale,
                accessibilityMode: state.accessibilityMode
            }),
        }
    )
);
