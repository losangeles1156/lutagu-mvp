import { create } from 'zustand';

interface MapState {
    mapCenter: { lat: number; lon: number } | null;
    currentZone: 'core' | 'buffer' | 'outer';
    isLineBound: boolean;
    isMobile: boolean; // Device state often tied to map layout

    setMapCenter: (center: { lat: number; lon: number } | null) => void;
    setZone: (zone: 'core' | 'buffer' | 'outer') => void;
    setLineBound: (isBound: boolean) => void;
    setIsMobile: (isMobile: boolean) => void;
}

export const useMapStore = create<MapState>((set) => ({
    mapCenter: null,
    currentZone: 'outer',
    isLineBound: false,
    isMobile: false,

    setMapCenter: (center) => set({ mapCenter: center }),
    setZone: (zone) => set({ currentZone: zone }),
    setLineBound: (isBound) => set({ isLineBound: isBound }),
    setIsMobile: (isMobile) => set({ isMobile }),
}));
