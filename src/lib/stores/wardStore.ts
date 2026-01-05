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
    selectedWardId: string | null;
    
    // Detection state
    isDetecting: boolean;
    detectedWard: Ward | null;
    
    // Actions
    fetchWards: () => Promise<void>;
    setSelectedWard: (wardId: string | null) => void;
    getNodesByWard: (wardId: string) => Promise<NodeDatum[]>;
    detectWardByLocation: (lat: number, lng: number) => Promise<Ward | null>;
    clearError: () => void;
}

// 核心 9 區列表（Fallback）
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
];

export const useWardStore = create<WardState>((set, get) => ({
    wards: [],
    isLoading: false,
    error: null,
    selectedWardId: null,
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

            // 如果 API 失敗，使用硬編碼的核心 9 區
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

    setSelectedWard: (wardId: string | null) => {
        set({ selectedWardId: wardId });
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
            // 調用後台 API 進行地理圍欄檢測
            const response = await fetch('/api/admin/nodes/detect-ward', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lat, lng }),
            });
            
            if (response.ok) {
                const data = await response.json();
                const ward: Ward = data.ward;
                set({ isDetecting: false, detectedWard: ward });
                return ward;
            }
            
            // 如果 API 調用失敗，使用簡單的距離計算作為 fallback
            const wards = get().wards.length > 0 ? get().wards : CORE_WARDS;
            const matchedWard = findNearestWard(wards, lat, lng);
            set({ isDetecting: false, detectedWard: matchedWard });
            return matchedWard;
        } catch (error) {
            console.error('[wardStore] Failed to detect ward:', error);
            set({ error: '無法檢測所在區域', isDetecting: false });
            return null;
        }
    },

    clearError: () => {
        set({ error: null });
    },
}));

// 簡單的距離計算輔助函數
function findNearestWard(wards: Ward[], lat: number, lng: number): Ward | null {
    if ( wards.length === 0) return null;
    
    // 東京主要區域的中心點坐標
    const wardCenters: Record<string, { lat: number; lng: number }> = {
        'ward:taito': { lat: 35.7148, lng: 139.7807 },
        'ward:chiyoda': { lat: 35.6938, lng: 139.7536 },
        'ward:chuo': { lat: 35.6852, lng: 139.7738 },
        'ward:minato': { lat: 35.6585, lng: 139.7454 },
        'ward:shinjuku': { lat: 35.6938, lng: 139.7037 },
        'ward:bunkyo': { lat: 35.7148, lng: 139.7536 },
        'ward:sumida': { lat: 35.7100, lng: 139.8100 },
        'ward:koto': { lat: 35.6700, lng: 139.8200 },
        'ward:shinagawa': { lat: 35.6285, lng: 139.7278 },
    };

    let nearestWard: Ward | null = null;
    let minDistance = Infinity;

    for (const ward of wards) {
        const center = wardCenters[ward.id];
        if (center) {
            const distance = Math.sqrt(
                Math.pow(lat - center.lat, 2) + Math.pow(lng - center.lng, 2)
            );
            if (distance < minDistance) {
                minDistance = distance;
                nearestWard = ward;
            }
        }
    }

    return nearestWard;
}
