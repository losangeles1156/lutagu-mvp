'use client';

import { useState } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useUserStore } from '@/stores/userStore';
import { LineBindingModal } from './LineBindingModal';
import { Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function TripGuardStatus() {
    const tTripGuard = useTranslations('tripGuard');
    const setSubscriptionModalOpen = useUIStore(s => s.setSubscriptionModalOpen);
    const isTripGuardActive = useUserStore(s => s.isTripGuardActive);
    const isLineBound = useUserStore(s => s.isLineBound);
    const setLineBound = useUserStore(s => s.setLineBound);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    const handleClick = () => {
        if (!isTripGuardActive) {
            setSubscriptionModalOpen(true);
            return;
        }

        if (!isLineBound) {
            setIsModalOpen(true);
        } else {
            setShowPreview(!showPreview);
        }
    };

    return (
        <div className="flex flex-col items-end gap-3 pointer-events-auto">
            {isTripGuardActive && isLineBound && showPreview && (
                <div className="bg-white/95 backdrop-blur-xl p-4 rounded-3xl shadow-2xl border border-rose-100 w-64 animate-in slide-in-from-right-4 duration-500">
                    <div className="flex items-center gap-2 mb-2 text-rose-600">
                        <ShieldAlert size={16} aria-hidden="true" />
                        <span className="text-[10px] font-black uppercase tracking-widest">{tTripGuard('anomalyBadge')}</span>
                    </div>
                    <h4 className="font-bold text-sm text-gray-900 mb-1">{tTripGuard('anomalyTitleSample')}</h4>
                    <p className="text-[11px] text-gray-500 font-medium leading-relaxed mb-3">
                        {tTripGuard('anomalyBodySample')}
                    </p>
                    <div className="bg-rose-50 p-2 rounded-xl text-[10px] font-bold text-rose-700 border border-rose-100">
                        ✨ {tTripGuard('anomalyAdviceSample')}
                    </div>
                </div>
            )}

            <button
                onClick={handleClick}
                className={`
                    relative w-12 h-12 rounded-2xl shadow-xl backdrop-blur transition-all duration-500 flex items-center justify-center
                    ${isTripGuardActive && isLineBound
                        ? 'bg-indigo-600 text-white shadow-indigo-200'
                        : isTripGuardActive
                            ? 'bg-amber-100 text-amber-600'
                            : 'bg-white/90 text-gray-400 hover:text-gray-600'}
                `}
                aria-label={
                    isTripGuardActive
                        ? isLineBound
                            ? tTripGuard('statusActiveBound')
                            : tTripGuard('statusActiveUnbound')
                        : tTripGuard('statusInactive')
                }
            >
                {isTripGuardActive && isLineBound ? <ShieldCheck size={24} aria-hidden="true" /> : isTripGuardActive ? <ShieldAlert size={24} aria-hidden="true" /> : <Shield size={24} aria-hidden="true" />}

                {/* Status Glow */}
                {isTripGuardActive && (
                    <span className="absolute -inset-1 rounded-2xl bg-indigo-500/20 animate-pulse -z-10" />
                )}

                {/* LINE Status Dot */}
                {isTripGuardActive && (
                    <span className={`absolute top-0 right-0 -mt-1 -mr-1 flex h-4 w-4 border-2 border-white rounded-full ${isLineBound ? 'bg-green-500' : 'bg-amber-500'}`}>
                        {isLineBound && <span className="animate-ping absolute inset-0 rounded-full bg-green-400 opacity-75" />}
                    </span>
                )}
            </button>

            <LineBindingModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setLineBound(true);
                }}
            />
        </div>
    );
}
