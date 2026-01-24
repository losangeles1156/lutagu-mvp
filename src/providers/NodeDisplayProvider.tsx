'use client';

import React, { createContext, useContext, useReducer, useCallback, ReactNode, useEffect } from 'react';

// Types
import { NodeDatum } from '@/lib/api/nodes';

export interface HubMember {
    member_id: string;
    member_name: { [locale: string]: string };
    operator: string;
    line_name: string | null;
    transfer_type: string;
    walking_seconds: number | null;
    sort_order: number;
}

export interface HubDetails {
    member_count: number;
    transfer_type: string;
    transfer_complexity: string;
    walking_distance_meters: number | null;
    indoor_connection_notes: string | null;
    members: HubMember[];
}

// State
interface NodeDisplayState {
    nodes: NodeDatum[];
    hubDetails: Record<string, HubDetails>;
    loading: boolean;
    error: string | null;
    lastUpdated: number;
    refreshKey: number;
}

// Actions
type NodeDisplayAction =
    | { type: 'SET_NODES'; nodes: NodeDatum[]; hubDetails: Record<string, HubDetails> }
    | { type: 'SET_LOADING'; loading: boolean }
    | { type: 'SET_ERROR'; error: string | null }
    | { type: 'REFRESH' }
    | { type: 'RESET' };

// Initial state
const initialState: NodeDisplayState = {
    nodes: [],
    hubDetails: {},
    loading: false,
    error: null,
    lastUpdated: 0,
    refreshKey: 0
};

// Reducer
function nodeDisplayReducer(state: NodeDisplayState, action: NodeDisplayAction): NodeDisplayState {
    switch (action.type) {
        case 'SET_NODES':
            return {
                ...state,
                nodes: action.nodes,
                hubDetails: action.hubDetails,
                loading: false,
                error: null,
                lastUpdated: Date.now()
            };
        case 'SET_LOADING':
            return { ...state, loading: action.loading };
        case 'SET_ERROR':
            return { ...state, error: action.error, loading: false };
        case 'REFRESH':
            return { ...state, refreshKey: state.refreshKey + 1 };
        case 'RESET':
            return initialState;
        default:
            return state;
    }
}

// Context
interface NodeDisplayContextValue {
    state: NodeDisplayState;
    setNodes: (nodes: NodeDatum[], hubDetails: Record<string, HubDetails>) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    refresh: () => void;
    reset: () => void;
}

const NodeDisplayContext = createContext<NodeDisplayContextValue | null>(null);

// Provider component
export function NodeDisplayProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(nodeDisplayReducer, initialState);

    useEffect(() => {
        if (process.env.NODE_ENV !== 'development') return;
        if (typeof window === 'undefined') return;

        try {
            const key = '__lutagu_dev_sw_cleanup_done__';
            if (window.sessionStorage.getItem(key) === '1') return;
            window.sessionStorage.setItem(key, '1');
        } catch {
        }

        const hasSw = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;

        const run = async () => {
            let didWork = false;
            if (hasSw) {
                try {
                    const regs = await navigator.serviceWorker.getRegistrations();
                    if (regs.length > 0) didWork = true;
                    await Promise.all(regs.map(r => r.unregister().catch(() => false)));
                } catch {
                }
            }

            if ('caches' in window) {
                try {
                    const keys = await caches.keys();
                    if (keys.length > 0) didWork = true;
                    await Promise.all(keys.map(k => caches.delete(k).catch(() => false)));
                } catch {
                }
            }

            if (didWork) {
                window.location.reload();
            }
        };

        void run();
    }, []);

    const setNodes = useCallback((nodes: NodeDatum[], hubDetails: Record<string, HubDetails>) => {
        dispatch({ type: 'SET_NODES', nodes, hubDetails });
    }, []);

    const setLoading = useCallback((loading: boolean) => {
        dispatch({ type: 'SET_LOADING', loading });
    }, []);

    const setError = useCallback((error: string | null) => {
        dispatch({ type: 'SET_ERROR', error });
    }, []);

    const refresh = useCallback(() => {
        dispatch({ type: 'REFRESH' });
    }, []);

    const reset = useCallback(() => {
        dispatch({ type: 'RESET' });
    }, []);

    const value: NodeDisplayContextValue = {
        state,
        setNodes,
        setLoading,
        setError,
        refresh,
        reset
    };

    return (
        <NodeDisplayContext.Provider value={value}>
            {children}
        </NodeDisplayContext.Provider>
    );
}

// Hook for consuming the context
export function useNodeDisplay() {
    const context = useContext(NodeDisplayContext);
    if (!context) {
        throw new Error('useNodeDisplay must be used within a NodeDisplayProvider');
    }
    return context;
}

// Selector hooks for performance optimization
export function useNodes() {
    const { state } = useNodeDisplay();
    return state.nodes;
}

export function useHubDetails() {
    const { state } = useNodeDisplay();
    return state.hubDetails;
}

export function useNodeLoading() {
    const { state } = useNodeDisplay();
    return state.loading;
}

export function useNodeError() {
    const { state } = useNodeDisplay();
    return state.error;
}

export function useNodeRefreshKey() {
    const { state } = useNodeDisplay();
    return state.refreshKey;
}
