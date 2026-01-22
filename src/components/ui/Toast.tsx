'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextValue {
    showToast: (message: string, type?: ToastType) => void;
}

let toastCount = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = `toast-${++toastCount}`;
        setToasts(prev => [...prev, { id, message, type }]);

        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    }, []);

    useEffect(() => {
        setGlobalToast(showToast);
        return () => {
            setGlobalToast(() => undefined);
        };
    }, [showToast]);

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    const getIcon = (type: ToastType) => {
        switch (type) {
            case 'success': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
            case 'error': return <AlertCircle className="w-5 h-5 text-rose-500" />;
            default: return <Info className="w-5 h-5 text-indigo-500" />;
        }
    };

    const getBgColor = (type: ToastType) => {
        switch (type) {
            case 'success': return 'bg-emerald-50 border-emerald-100';
            case 'error': return 'bg-rose-50 border-rose-100';
            default: return 'bg-indigo-50 border-indigo-100';
        }
    };

    return (
        <>
            {children}
            <AnimatePresence>
                {toasts.map(toast => (
                    <motion.div
                        key={toast.id}
                        initial={{ opacity: 0, y: 50, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] max-w-sm w-full px-4"
                    >
                        <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-xl ${getBgColor(toast.type)}`}>
                            {getIcon(toast.type)}
                            <span className="flex-1 text-sm font-bold text-slate-700">{toast.message}</span>
                            <button
                                onClick={() => removeToast(toast.id)}
                                className="p-1 hover:bg-white/50 rounded-lg transition-colors"
                            >
                                <X className="w-4 h-4 text-slate-400" />
                            </button>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </>
    );
}

// Simple hook for showing toast
let globalShowToast: ((message: string, type?: ToastType) => void) | null = null;

export function setGlobalToast(showFn: (message: string, type?: ToastType) => void) {
    globalShowToast = showFn;
}

export function useToast() {
    return globalShowToast;
}
