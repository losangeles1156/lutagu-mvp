'use client';

import { useTripGuardStore } from '@/stores/tripGuardStore';
import { AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';

export function DisruptionBanner() {
    const monitoredLines = useTripGuardStore(state => state.monitoredLines);
    const maxSeverity = useTripGuardStore(state => state.maxSeverity());
    const tGuard = useTranslations('tripGuard');
    const tL2 = useTranslations('l2');

    // Logic: Only show if there are monitored lines AND status is NOT normal
    const hasIssues = maxSeverity !== 'normal' && monitoredLines.length > 0;

    if (!hasIssues) return null;

    const issues = monitoredLines.filter(l => l.status !== 'normal');

    // Map status to i18n key
    const getStatusLabel = (status: string) => {
        const statusMap: Record<string, string> = {
            'delay': tL2('status.delay'),
            'suspended': tL2('status.suspended'),
            'normal': tL2('status.normal')
        };
        return statusMap[status] || status;
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-rose-600 text-white overflow-hidden relative z-50 shadow-md"
            >
                <div className="px-4 py-3 flex items-start gap-3">
                    <div className="mt-0.5 animate-pulse">
                        <AlertTriangle size={20} className="fill-white/20 stroke-white" />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                            {tGuard('anomalyBadge')}
                        </h4>
                        <ul className="mt-1 space-y-1">
                            {issues.map(line => (
                                <li key={line.id} className="text-xs font-medium flex items-center gap-2">
                                    <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px]">{line.operator}</span>
                                    <span>{line.name}</span>
                                    <span className="font-bold bg-white text-rose-600 px-1.5 rounded-sm text-[10px] uppercase">
                                        {getStatusLabel(line.status)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
