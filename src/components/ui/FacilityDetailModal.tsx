'use client';

import { useState, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, MapPin, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface FacilityItem {
    id: string;
    category: string;
    subCategory: string;
    location: string;
    attributes?: Record<string, any>;
}

interface FacilityDetailModalProps {
    facility: FacilityItem | null;
    onClose: () => void;
}

const CATEGORY_CONFIG: Record<string, { icon: string; i18nKey: string; color: string }> = {
    toilet: { icon: '🚻', i18nKey: 'categories.toilet', color: 'bg-blue-500' },
    locker: { icon: '🧳', i18nKey: 'categories.locker', color: 'bg-orange-500' },
    elevator: { icon: '🛗', i18nKey: 'categories.elevator', color: 'bg-green-500' },
    accessibility: { icon: '♿', i18nKey: 'categories.accessibility', color: 'bg-indigo-500' },
    wifi: { icon: '📶', i18nKey: 'categories.wifi', color: 'bg-purple-500' },
    charging: { icon: '⚡', i18nKey: 'categories.charging', color: 'bg-yellow-500' },
    accommodation: { icon: '🏨', i18nKey: 'categories.accommodation', color: 'bg-pink-500' },
    dining: { icon: '🍽️', i18nKey: 'categories.dining', color: 'bg-red-500' },
    shopping: { icon: '🛍️', i18nKey: 'categories.shopping', color: 'bg-emerald-500' },
    leisure: { icon: '🎭', i18nKey: 'categories.leisure', color: 'bg-cyan-500' },
    religion: { icon: '⛩️', i18nKey: 'categories.religion', color: 'bg-amber-500' },
    transport: { icon: '🚃', i18nKey: 'categories.transport', color: 'bg-slate-500' },
};

export function FacilityDetailModal({ facility, onClose }: FacilityDetailModalProps) {
    const tL3 = useTranslations('l3');
    const titleId = useId();
    const descId = useId();
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const dialogRef = useRef<HTMLDivElement>(null);

    const isOpen = Boolean(facility);

    const config = facility
        ? (CATEGORY_CONFIG[facility.category] || { icon: '📍', i18nKey: '', color: 'bg-gray-500' })
        : { icon: '📍', i18nKey: '', color: 'bg-gray-500' };
    const attrs = facility?.attributes || {};

    const categoryLabel = facility && config.i18nKey ? tL3(config.i18nKey as any) : facility?.category || '';

    useEffect(() => {
        if (!isOpen) return;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        closeButtonRef.current?.focus();

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
                return;
            }

            if (e.key !== 'Tab') return;
            const root = dialogRef.current;
            if (!root) return;
            const focusable = Array.from(
                root.querySelectorAll<HTMLElement>(
                    'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
                )
            ).filter((el) => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));

            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const active = document.activeElement as HTMLElement | null;

            if (e.shiftKey) {
                if (!active || active === first) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (active === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = prevOverflow;
        };
    }, [isOpen, onClose]);

    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    if (!facility || !mounted) return null;

    return createPortal(
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-300">
                <div
                    ref={dialogRef}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={titleId}
                    aria-describedby={descId}
                    className="bg-white rounded-t-[32px] shadow-2xl max-h-[70vh] overflow-auto outline-none"
                >
                    {/* Header */}
                    <div className={`${config.color} p-6 rounded-t-[32px] relative overflow-hidden`}>
                        <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                        <button
                            ref={closeButtonRef}
                            onClick={onClose}
                            aria-label={tL3('modal.close')}
                            className="absolute top-4 right-4 p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors focus:outline-none focus:ring-2 focus:ring-white/80 focus:ring-offset-2 focus:ring-offset-black/10"
                        >
                            <X size={20} className="text-white" />
                        </button>
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-3xl">
                                {config.icon}
                            </div>
                            <div className="text-white">
                                <h3 id={titleId} className="font-black text-xl">{categoryLabel}</h3>
                                <p id={descId} className="text-white/80 text-sm font-medium">
                                    {facility.subCategory === 'station_toilet' ? tL3('stationToilet') :
                                        facility.subCategory === 'coin_locker' ? tL3('coinLocker') :
                                            facility.subCategory === 'elevator' ? tL3('elevator') : facility.subCategory}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-5">
                        {/* Location */}
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-gray-100 rounded-xl text-gray-600">
                                <MapPin size={20} />
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{tL3('modal.location')}</h4>
                                <p className="text-sm font-bold text-gray-900">{facility.location}</p>
                            </div>
                        </div>

                        {/* Attributes */}
                        {Object.keys(attrs).length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">{tL3('modal.attributes')}</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    {attrs.wheelchair_accessible && (
                                        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl">
                                            <span className="text-lg">♿</span>
                                            <span className="text-xs font-bold text-blue-700">{tL3('wheelchairFriendly')}</span>
                                        </div>
                                    )}
                                    {attrs.has_washlet && (
                                        <div className="flex items-center gap-2 p-3 bg-indigo-50 rounded-xl">
                                            <span className="text-lg">🚿</span>
                                            <span className="text-xs font-bold text-indigo-700">{tL3('has_washlet')}</span>
                                        </div>
                                    )}
                                    {attrs.sizes && (
                                        <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-xl">
                                            <span className="text-lg">📦</span>
                                            <span className="text-xs font-bold text-orange-700">{tL3('modal.sizes', { sizes: attrs.sizes.join(', ') })}</span>
                                        </div>
                                    )}
                                    {attrs.count && (
                                        <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl">
                                            <span className="text-lg">🔢</span>
                                            <span className="text-xs font-bold text-emerald-700">{tL3('modal.count', { count: attrs.count })}</span>
                                        </div>
                                    )}
                                    {attrs.hours && (
                                        <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl col-span-2">
                                            <Clock size={18} className="text-amber-600" />
                                            <span className="text-xs font-bold text-amber-700">{tL3('modal.hours', { hours: attrs.hours })}</span>
                                        </div>
                                    )}
                                    {attrs.name && (
                                        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl col-span-2">
                                            <span className="text-lg">🏷️</span>
                                            <span className="text-xs font-bold text-gray-700">{attrs.name}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Note */}
                        {attrs.note && (
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <p className="text-sm text-gray-600 italic">💡 {attrs.note}</p>
                            </div>
                        )}

                        {/* AI Chat Prompt */}
                        <button className="w-full p-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2">
                            ✨ {tL3('modal.askLutagu')}
                        </button>
                    </div>
                </div>
            </div>
        </>,
        document.body
    );
}
