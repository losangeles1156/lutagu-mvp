'use client';

import React, { useMemo } from 'react';
import { useFavorites } from '@/hooks/useFavorites';
import { useAlerts } from '@/hooks/useAlerts';
import { AlertBanner } from '@/components/common/AlertBanner';

export const GlobalAlertList: React.FC = () => {
    const { favorites } = useFavorites();
    const favoriteIds = useMemo(() => Array.from(favorites).sort(), [favorites]);
    const { alerts } = useAlerts(favoriteIds);

    if (!alerts || alerts.length === 0) return null;

    return (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-xl px-4 flex flex-col gap-2 pointer-events-none">
            {alerts.map((alert) => (
                <AlertBanner
                    key={alert.id}
                    className="pointer-events-auto"
                    severity={alert.severity}
                    message={alert.text_ja || alert.text_en}
                    operatorName={alert.operator?.split(':').pop()}
                    lineName={alert.railway?.split(':').pop()}
                />
            ))}
        </div>
    );
};
