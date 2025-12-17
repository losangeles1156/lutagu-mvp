'use client';

import { useAppStore } from '@/stores/appStore';

export function TripGuardStatus() {
    const { isTripGuardActive, setSubscriptionModalOpen } = useAppStore();

    return (
        <button
            onClick={() => setSubscriptionModalOpen(true)}
            className={`
                relative p-2 rounded-full shadow-sm backdrop-blur transition-all duration-300
                ${isTripGuardActive ? 'bg-emerald-100 text-emerald-600' : 'bg-white/90 text-gray-400'}
            `}
        >
            {/* Shield Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={isTripGuardActive ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>

            {/* Pulse Effect if Active */}
            {isTripGuardActive && (
                <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
            )}
        </button>
    );
}
