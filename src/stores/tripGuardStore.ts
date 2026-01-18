import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Severity = 'normal' | 'delay' | 'suspended';

interface MonitoredLine {
    id: string;
    name: string; // Serialized for UI display
    operator: string;
    status: Severity; // This would normally be synced with live data
    lastUpdated: number;
}

interface TripGuardState {
    monitoredLines: MonitoredLine[];
    isMonitoring: (lineId: string) => boolean;
    addLine: (line: { id: string; name: string; operator: string }) => void;
    removeLine: (lineId: string) => void;
    updateStatus: (lineId: string, status: Severity) => void; // call this when live data comes in

    // Computed helper
    maxSeverity: () => Severity;
}

export const useTripGuardStore = create<TripGuardState>()(
    persist(
        (set, get) => ({
            monitoredLines: [],

            isMonitoring: (lineId) => get().monitoredLines.some(l => l.id === lineId),

            addLine: (line) => set((state) => {
                if (state.monitoredLines.some(l => l.id === line.id)) return state;
                return {
                    monitoredLines: [
                        ...state.monitoredLines,
                        { ...line, status: 'normal', lastUpdated: Date.now() } // Default normal until update
                    ]
                };
            }),

            removeLine: (lineId) => set((state) => ({
                monitoredLines: state.monitoredLines.filter(l => l.id !== lineId)
            })),

            updateStatus: (lineId, status) => set((state) => ({
                monitoredLines: state.monitoredLines.map(l =>
                    l.id === lineId ? { ...l, status, lastUpdated: Date.now() } : l
                )
            })),

            maxSeverity: () => {
                const lines = get().monitoredLines;
                if (lines.some(l => l.status === 'suspended')) return 'suspended';
                if (lines.some(l => l.status === 'delay')) return 'delay';
                return 'normal';
            }
        }),
        {
            name: 'lutagu-trip-guard',
        }
    )
);
