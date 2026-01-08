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

// 完整 23 區 + 成田機場
const CORE_WARDS: Ward[] = [
    // 成田機場 (優先)
    { id: 'ward:airport', name: { ja: '成田空港', en: 'Narita Airport', zh: '成田機場' }, code: 'NRT', prefecture: 'Chiba' },
    // 23 特別區（按照 50 音順序）
    { id: 'ward:adachi', name: { ja: '足立区', en: 'Adachi', zh: '足立區' }, code: 'Adachi', prefecture: 'Tokyo' },
    { id: 'ward:arakawa', name: { ja: '荒川区', en: 'Arakawa', zh: '荒川區' }, code: 'Arakawa', prefecture: 'Tokyo' },
    { id: 'ward:itabashi', name: { ja: '板橋区', en: 'Itabashi', zh: '板橋區' }, code: 'Itabashi', prefecture: 'Tokyo' },
    { id: 'ward:edogawa', name: { ja: '江戸川区', en: 'Edogawa', zh: '江戶川區' }, code: 'Edogawa', prefecture: 'Tokyo' },
    { id: 'ward:ota', name: { ja: '大田区', en: 'Ota', zh: '大田區' }, code: 'Ōta', prefecture: 'Tokyo' },
    { id: 'ward:katsushika', name: { ja: '葛飾区', en: 'Katsushika', zh: '葛飾區' }, code: 'Katsushika', prefecture: 'Tokyo' },
    { id: 'ward:kita', name: { ja: '北区', en: 'Kita', zh: '北區' }, code: 'Kita', prefecture: 'Tokyo' },
    { id: 'ward:koto', name: { ja: '江東区', en: 'Koto', zh: '江東區' }, code: 'Kōtō', prefecture: 'Tokyo' },
    { id: 'ward:shinagawa', name: { ja: '品川区', en: 'Shinagawa', zh: '品川區' }, code: 'Shinagawa', prefecture: 'Tokyo' },
    { id: 'ward:shibuya', name: { ja: '渋谷区', en: 'Shibuya', zh: '澀谷區' }, code: 'Shibuya', prefecture: 'Tokyo' },
    { id: 'ward:shinjuku', name: { ja: '新宿区', en: 'Shinjuku', zh: '新宿區' }, code: 'Shinjuku', prefecture: 'Tokyo' },
    { id: 'ward:suginami', name: { ja: '杉並区', en: 'Suginami', zh: '杉並區' }, code: 'Suginami', prefecture: 'Tokyo' },
    { id: 'ward:sumida', name: { ja: '墨田区', en: 'Sumida', zh: '墨田區' }, code: 'Sumida', prefecture: 'Tokyo' },
    { id: 'ward:setagaya', name: { ja: '世田谷区', en: 'Setagaya', zh: '世田谷區' }, code: 'Setagaya', prefecture: 'Tokyo' },
    { id: 'ward:taito', name: { ja: '台東区', en: 'Taito', zh: '台東區' }, code: 'Taitō', prefecture: 'Tokyo' },
    { id: 'ward:chiyoda', name: { ja: '千代田区', en: 'Chiyoda', zh: '千代田區' }, code: 'Chiyoda', prefecture: 'Tokyo' },
    { id: 'ward:chuo', name: { ja: '中央区', en: 'Chuo', zh: '中央區' }, code: 'Chūō', prefecture: 'Tokyo' },
    { id: 'ward:toshima', name: { ja: '豊島区', en: 'Toshima', zh: '豊島區' }, code: 'Toshima', prefecture: 'Tokyo' },
    { id: 'ward:nakano', name: { ja: '中野区', en: 'Nakano', zh: '中野區' }, code: 'Nakano', prefecture: 'Tokyo' },
    { id: 'ward:nerima', name: { ja: '練馬区', en: 'Nerima', zh: '練馬區' }, code: 'Nerima', prefecture: 'Tokyo' },
    { id: 'ward:bunkyo', name: { ja: '文京区', en: 'Bunkyo', zh: '文京區' }, code: 'Bunkyō', prefecture: 'Tokyo' },
    { id: 'ward:minato', name: { ja: '港区', en: 'Minato', zh: '港區' }, code: 'Minato', prefecture: 'Tokyo' },
    { id: 'ward:meguro', name: { ja: '目黒区', en: 'Meguro', zh: '目黑區' }, code: 'Meguro', prefecture: 'Tokyo' },
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
