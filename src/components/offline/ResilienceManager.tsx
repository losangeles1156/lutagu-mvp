'use client';

import { useEffect } from 'react';
import { OfflineDataManager } from '@/lib/offline/OfflineDataManager';

export function ResilienceManager() {
    useEffect(() => {
        // [Phase 13.4] Silent Prefetch for Web Resilience
        // Wait for main thread to settle
        requestIdleCallback(() => {
            OfflineDataManager.initSilentPrefetch();
        });
    }, []);

    return null; // Headless component
}
