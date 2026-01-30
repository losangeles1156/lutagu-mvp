'use client';

import { useEffect } from 'react';
import { OfflineDataManager } from '@/lib/offline/OfflineDataManager';

export function ResilienceManager() {
    useEffect(() => {
        const runPrefetch = () => {
            OfflineDataManager.initSilentPrefetch();
        };

        if (typeof requestIdleCallback === 'function') {
            requestIdleCallback(runPrefetch);
            return;
        }

        const timeoutId = window.setTimeout(runPrefetch, 0);
        return () => window.clearTimeout(timeoutId);
    }, []);

    return null; // Headless component
}
