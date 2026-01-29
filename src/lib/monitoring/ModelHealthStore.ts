import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ModelFailure {
    modelName: string;
    timestamp: number;
    error: string;
    task: string;
}

interface ModelHealthState {
    lastDeepSeekFailure: ModelFailure | null;
    isDeepSeekHealthy: boolean;

    // Actions
    reportFailure: (failure: ModelFailure) => void;
    clearFailure: () => void;
}

/**
 * 管理模型健康狀態，用於管理員通知
 */
export const useModelHealthStore = create<ModelHealthState>()(
    persist(
        (set) => ({
            lastDeepSeekFailure: null,
            isDeepSeekHealthy: true,

            reportFailure: (failure) => set({
                lastDeepSeekFailure: failure,
                isDeepSeekHealthy: false
            }),

            clearFailure: () => set({
                lastDeepSeekFailure: null,
                isDeepSeekHealthy: true
            })
        }),
        {
            name: 'lutagu-model-health'
        }
    )
);
