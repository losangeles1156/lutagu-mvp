'use client';

import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useTranslations } from 'next-intl';
import { WifiOff, Wifi } from 'lucide-react';
import { useState, useEffect } from 'react';

/**
 * Global Offline Indicator
 * Supports both "Offline" and "Back Online" states with localization.
 */
export function OfflineIndicator() {
    const isOnline = useNetworkStatus();
    const tChat = useTranslations('chat');
    const [showIndicator, setShowIndicator] = useState(false);
    const [wasOffline, setWasOffline] = useState(false);

    useEffect(() => {
        if (!isOnline) {
            setShowIndicator(true);
            setWasOffline(true);
        } else if (wasOffline) {
            // We just came back online
            setShowIndicator(true);
            const timer = setTimeout(() => {
                setShowIndicator(false);
                setWasOffline(false);
            }, 3000);
            return () => clearTimeout(timer);
        } else {
            setShowIndicator(false);
        }
    }, [isOnline, wasOffline]);

    if (!showIndicator) return null;

    return (
        <div
            role="status"
            aria-live="polite"
            className={`
                fixed top-6 left-1/2 transform -translate-x-1/2 z-[9999]
                px-6 py-3 rounded-full shadow-2xl flex items-center gap-3
                transition-all duration-500 animate-in fade-in zoom-in slide-in-from-top-8
                ${isOnline
                    ? 'bg-emerald-500 text-white border border-emerald-400'
                    : 'bg-rose-500 text-white border border-rose-400'
                }
            `}
        >
            {isOnline ? (
                <>
                    <Wifi size={18} className="animate-pulse" />
                    <span className="text-sm font-black tracking-tight">{tChat('backOnline')}</span>
                </>
            ) : (
                <>
                    <WifiOff size={18} />
                    <span className="text-sm font-black tracking-tight">{tChat('offlineBadge')}</span>
                </>
            )}
        </div>
    );
}
