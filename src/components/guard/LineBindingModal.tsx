'use client';

import { useState } from 'react';

import { X, MessageCircle, ShieldCheck, BellRing } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function LineBindingModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const tTripGuard = useTranslations('tripGuard');
    const [isBinding, setIsBinding] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    if (!isOpen) return null;

    const handleBind = () => {
        setIsBinding(true);
        // Mocking the OAuth/Binding process
        setTimeout(() => {
            setIsBinding(false);
            setIsSuccess(true);
            setTimeout(() => {
                onClose();
            }, 2000);
        }, 1500);
    };

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-8 text-center">
                    {!isSuccess ? (
                        <>
                            <div className="w-20 h-20 bg-green-50 rounded-[32px] flex items-center justify-center mx-auto mb-6 text-green-500 shadow-inner">
                                <MessageCircle size={40} fill="currentColor" className="text-green-500" aria-hidden="true" />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">{tTripGuard('bindTitle')}</h2>
                            <p className="text-gray-500 text-sm font-medium leading-relaxed mb-8">
                                {tTripGuard('bindDescription')}
                            </p>

                            <div className="space-y-3 mb-8">
                                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-black/[0.02]">
                                    <BellRing className="text-indigo-600" size={20} aria-hidden="true" />
                                    <span className="text-xs font-bold text-gray-700">{tTripGuard('bindBenefitRealtime')}</span>
                                </div>
                                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-black/[0.02]">
                                    <ShieldCheck className="text-indigo-600" size={20} aria-hidden="true" />
                                    <span className="text-xs font-bold text-gray-700">{tTripGuard('bindBenefitMonitor')}</span>
                                </div>
                            </div>

                            <button
                                onClick={handleBind}
                                disabled={isBinding}
                                className={`w-full py-4 rounded-full font-black text-sm transition-all shadow-lg active:scale-95 ${isBinding ? 'bg-gray-100 text-gray-400' : 'bg-[#06C755] text-white hover:bg-[#05b34d] shadow-green-100'
                                    }`}
                                aria-busy={isBinding}
                            >
                                {isBinding ? tTripGuard('bindCtaLoading') : tTripGuard('bindCta')}
                            </button>
                        </>
                    ) : (
                        <div className="py-10 animate-in fade-in zoom-in duration-500">
                            <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 text-white shadow-xl shadow-green-100">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 mb-2">{tTripGuard('bindSuccessTitle')}</h2>
                            <p className="text-gray-500 text-sm font-bold">{tTripGuard('bindSuccessBody')}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
