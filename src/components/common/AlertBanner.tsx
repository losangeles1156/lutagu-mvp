'use client';

import React from 'react';
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AlertBannerProps {
    severity: 'yellow' | 'orange' | 'red';
    message: string;
    operatorName?: string;
    lineName?: string;
    onClose?: () => void;
    className?: string;
}

const SEVERITY_CONFIG = {
    yellow: {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        text: 'text-yellow-800',
        icon: <Info className="w-5 h-5 text-yellow-600" />,
    },
    orange: {
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        text: 'text-orange-800',
        icon: <AlertTriangle className="w-5 h-5 text-orange-600" />,
    },
    red: {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-800',
        icon: <AlertCircle className="w-5 h-5 text-red-600" />,
    },
};

export const AlertBanner: React.FC<AlertBannerProps> = ({
    severity,
    message,
    operatorName,
    lineName,
    onClose,
    className,
}) => {
    const config = SEVERITY_CONFIG[severity];

    return (
        <div
            className={cn(
                'relative flex items-start gap-3 p-4 border rounded-lg shadow-sm animate-in fade-in slide-in-from-top-2 duration-300',
                config.bg,
                config.border,
                config.text,
                className
            )}
        >
            <div className="flex-shrink-0 mt-0.5">{config.icon}</div>
            <div className="flex-grow flex flex-col gap-1">
                {(operatorName || lineName) && (
                    <div className="text-xs font-bold uppercase tracking-wider opacity-80">
                        {operatorName} {lineName && `• ${lineName}`}
                    </div>
                )}
                <div className="text-sm font-medium leading-relaxed">{message}</div>
            </div>
            {onClose && (
                <button
                    onClick={onClose}
                    className="flex-shrink-0 p-1 rounded-full hover:bg-black/5 transition-colors"
                    aria-label="Close"
                >
                    <X className="w-4 h-4 opacity-60" />
                </button>
            )}
        </div>
    );
};

export default AlertBanner;
