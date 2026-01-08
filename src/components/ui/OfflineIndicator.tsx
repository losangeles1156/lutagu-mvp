'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { WifiOff, Wifi } from 'lucide-react';

export function OfflineIndicator() {
    const tChat = useTranslations('chat');
    const [isOnline, setIsOnline] = useState(true);
    const [showIndicator, setShowIndicator] = useState(false);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            // Show "back online" briefly, then hide
            setShowIndicator(true);
            setTimeout(() => setShowIndicator(false), 3000);
        };

        const handleOffline = () => {
            setIsOnline(false);
            setShowIndicator(true);
        };

        // Initial check
        if (typeof window !== 'undefined') {
            setIsOnline(navigator.onLine);
        }

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (!showIndicator) return null;

    return (
        <div
            role="status"
            aria-live="polite"
            className={`
                fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999]
                px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2
                transition-all duration-300 animate-in fade-in slide-in-from-top-4
                ${isOnline
                    ? 'bg-emerald-500 text-white'
                    : 'bg-rose-500 text-white'
                }
            `}
        >
            {isOnline ? (
                <>
                    <Wifi size={16} aria-hidden="true" />
                    <span className="text-sm font-bold">{tChat('backOnline')}</span>
                </>
            ) : (
                <>
                    <WifiOff size={16} aria-hidden="true" />
                    <span className="text-sm font-bold">{tChat('offlineBadge')}</span>
                </>
            )}
        </div>
    );
}
