// Ward Store - 管理行政區數據
import { create } from 'zustand';
import { fetchNodesByWard } from '@/lib/api/nodesByWard';
import { NodeDatum } from '@/lib/api/nodes';

export interface Ward {
    id: string;
    name: {
        ja: string;
        en: string;
        zh: string;
    };
    code?: string;
    prefecture?: string;
}

interface WardState {
    wards: Ward[];
    isLoading: boolean;
    error: string | null;
    // [UPDATED] Multi-selection support
    selectedWardIds: string[];

    // Detection state
    isDetecting: boolean;
    detectedWard: Ward | null;

    // Actions
    fetchWards: () => Promise<void>;
    // [UPDATED] Multi-selection actions
    toggleWardSelection: (wardId: string) => void;
    selectAllWards: () => void;
    clearWardSelection: () => void;
    setSelectedWards: (wardIds: string[]) => void;
    // Legacy single selection (for compatibility)
    setSelectedWard: (wardId: string | null) => void;
    getNodesByWard: (wardId: string) => Promise<NodeDatum[]>;
    detectWardByLocation: (lat: number, lng: number) => Promise<Ward | null>;
    clearError: () => void;
}

// 核心區列表（Fallback）
const CORE_WARDS: Ward[] = [
    { id: 'ward:taito', name: { ja: '台東区', en: 'Taito', zh: '台東區' }, code: 'Taitō', prefecture: 'Tokyo' },
    { id: 'ward:chiyoda', name: { ja: '千代田区', en: 'Chiyoda', zh: '千代田區' }, code: 'Chiyoda', prefecture: 'Tokyo' },
    { id: 'ward:chuo', name: { ja: '中央区', en: 'Chuo', zh: '中央區' }, code: 'Chūō', prefecture: 'Tokyo' },
    { id: 'ward:minato', name: { ja: '港区', en: 'Minato', zh: '港區' }, code: 'Minato', prefecture: 'Tokyo' },
    { id: 'ward:shinjuku', name: { ja: '新宿区', en: 'Shinjuku', zh: '新宿區' }, code: 'Shinjuku', prefecture: 'Tokyo' },
    { id: 'ward:bunkyo', name: { ja: '文京区', en: 'Bunkyo', zh: '文京區' }, code: 'Bunkyō', prefecture: 'Tokyo' },
    { id: 'ward:sumida', name: { ja: '墨田区', en: 'Sumida', zh: '墨田區' }, code: 'Sumida', prefecture: 'Tokyo' },
    { id: 'ward:koto', name: { ja: '江東区', en: 'Koto', zh: '江東區' }, code: 'Kōtō', prefecture: 'Tokyo' },
    { id: 'ward:shinagawa', name: { ja: '品川区', en: 'Shinagawa', zh: '品川區' }, code: 'Shinagawa', prefecture: 'Tokyo' },
    { id: 'ward:nakano', name: { ja: '中野区', en: 'Nakano', zh: '中野區' }, code: 'Nakano', prefecture: 'Tokyo' },
    { id: 'ward:kita', name: { ja: '北区', en: 'Kita', zh: '北區' }, code: 'Kita', prefecture: 'Tokyo' },
    // New wards
    { id: 'ward:ota', name: { ja: '大田区', en: 'Ota', zh: '大田區' }, code: 'Ōta', prefecture: 'Tokyo' },
    { id: 'ward:setagaya', name: { ja: '世田谷区', en: 'Setagaya', zh: '世田谷區' }, code: 'Setagaya', prefecture: 'Tokyo' },
];

export const useWardStore = create<WardState>((set, get) => ({
    wards: [],
    isLoading: false,
    error: null,
    selectedWardIds: [], // [UPDATED] Array for multi-selection
    isDetecting: false,
    detectedWard: null,

    fetchWards: async () => {
        set({ isLoading: true, error: null });
        try {
            // 嘗試從後台 API 獲取核心 9 區
            let wards: Ward[] = [];

            try {
                const response = await fetch('/api/admin/nodes/wards?core=true');
                if (response.ok) {
                    const data = await response.json();
                    wards = data.wards || [];
                }
            } catch (e) {
                console.warn('[wardStore] API fetch failed, using fallback');
            }

            // 如果 API 失敗，使用硬編碼的核心區
            if (wards.length === 0) {
                wards = CORE_WARDS;
            }

            set({ wards, isLoading: false });
        } catch (error) {
            console.error('[wardStore] Failed to fetch wards:', error);
            // 使用 Fallback
            set({ wards: CORE_WARDS, isLoading: false });
        }
    },

    // [NEW] Toggle ward selection (for multi-select)
    toggleWardSelection: (wardId: string) => {
        const current = get().selectedWardIds;
        if (current.includes(wardId)) {
            // Deselect
            set({ selectedWardIds: current.filter(id => id !== wardId) });
        } else {
            // Select (add to array)
            set({ selectedWardIds: [...current, wardId] });
        }
    },

    // [NEW] Select all wards
    selectAllWards: () => {
        const allIds = get().wards.map(w => w.id);
        set({ selectedWardIds: allIds });
    },

    // [NEW] Clear all selections
    clearWardSelection: () => {
        set({ selectedWardIds: [] });
    },

    // [NEW] Set specific wards (bulk update)
    setSelectedWards: (wardIds: string[]) => {
        set({ selectedWardIds: wardIds });
    },

    // Legacy single selection (for backward compatibility)
    setSelectedWard: (wardId: string | null) => {
        if (wardId) {
            set({ selectedWardIds: [wardId] });
        } else {
            set({ selectedWardIds: [] });
        }
    },

    getNodesByWard: async (wardId: string) => {
        try {
            return await fetchNodesByWard(wardId);
        } catch (error) {
            console.error('[wardStore] Failed to fetch ward nodes:', error);
            return [];
        }
    },

    detectWardByLocation: async (lat: number, lng: number) => {
        set({ isDetecting: true, error: null });
        try {
            // Call API to detect ward
            const response = await fetch(`/api/wards/detect?lat=${lat}&lng=${lng}`);
            if (!response.ok) {
                throw new Error('Failed to detect ward');
            }

            const data = await response.json();
            const ward = data.ward as Ward;

            set({ detectedWard: ward, isDetecting: false });
            return ward;
        } catch (error: any) {
            console.error('[wardStore] Failed to detect ward:', error);
            set({ error: error.message, isDetecting: false });
            return null;
        }
    },

    clearError: () => {
        set({ error: null });
    }
}));
