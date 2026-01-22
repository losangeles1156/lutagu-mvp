import { create } from 'zustand';

interface RoutePoint {
    lat: number;
    lon: number;
    name?: string;
    id?: string;
}

interface RouteState {
    routeStart: RoutePoint | null;
    routeEnd: RoutePoint | null;
    routePath: [number, number][] | null;
    routeSummary: { total_distance_meters: number; estimated_duration_minutes: number } | null;
    isRouteCalculating: boolean;

    setRouteStart: (point: RoutePoint | null) => void;
    setRouteEnd: (point: RoutePoint | null) => void;
    setRoutePath: (path: [number, number][] | null) => void;
    setRouteSummary: (summary: { total_distance_meters: number; estimated_duration_minutes: number } | null) => void;
    setIsRouteCalculating: (isCalculating: boolean) => void;
    clearRoute: () => void;
}

export const useRouteStore = create<RouteState>((set) => ({
    routeStart: null,
    routeEnd: null,
    routePath: null,
    routeSummary: null,
    isRouteCalculating: false,

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
}));
