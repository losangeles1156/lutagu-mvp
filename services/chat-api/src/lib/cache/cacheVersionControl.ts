
import { clearAllCaches } from './cacheService';

const CACHE_VERSION_KEY = 'lutagu_cache_version';
const CURRENT_VERSION = 'v6';

/**
 * 強制清除系統快取 (版本 v6)
 * 解決地理座標漂移與行政區歸屬錯誤。
 */
export function enforceCacheVersion(): void {
    if (typeof window === 'undefined') return;

    const storedVersion = localStorage.getItem(CACHE_VERSION_KEY);

    if (storedVersion !== CURRENT_VERSION) {
        console.log(`[Cache] Version mismatch: ${storedVersion} -> ${CURRENT_VERSION}. Forcing cleanup...`);
        
        // 1. 清除應用程式內的 Memory Cache
        clearAllCaches();

        // 2. 清除 localStorage 中的舊資料
        // 我們保留一些必要的 User Preferences，但清除節點相關的快取
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (
                key.startsWith('node:') || 
                key.startsWith('ward:') || 
                key.startsWith('l1:') ||
                key.includes('cache') ||
                key === 'selected_wards'
            )) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => localStorage.removeItem(key));

        // 3. 更新版本號
        localStorage.setItem(CACHE_VERSION_KEY, CURRENT_VERSION);
        
        console.log(`[Cache] Cleanup complete. System version is now ${CURRENT_VERSION}.`);
    }
}
