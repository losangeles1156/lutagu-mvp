'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Info, X, ShieldAlert } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';

interface WeatherAlert {
    title: string;
    summary: {
        ja: string;
        en: string;
        zh: string;
    };
    original_summary: string;
    updated: string;
    severity: 'info' | 'advisory' | 'warning' | 'critical';
    alert_type?: string;
    region?: string;
}

export function WeatherBanner() {
    const tWeather = useTranslations('weather');
    const locale = useLocale();
    const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
    const [isVisible, setIsVisible] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        const fetchAlerts = async () => {
            try {
                const res = await fetch('/api/weather');
                if (res.ok) {
                    const data = await res.json();
                    if (data.alerts && data.alerts.length > 0) {
                        setAlerts(data.alerts);
                        setIsVisible(true);
                    }
                }
            } catch (error) {
                console.warn('Weather fetch failed');
            }
        };

        fetchAlerts();
        // Check every 5 minutes
        const interval = setInterval(fetchAlerts, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    if (!isVisible || alerts.length === 0) return null;

    const mainAlert = alerts[0];
    const severityStyles = {
        info: 'bg-blue-600 text-white',
        advisory: 'bg-yellow-500 text-white',
        warning: 'bg-amber-500 text-white',
        critical: 'bg-rose-600 text-white'
    };

    const icons = {
        info: <Info size={16} />,
        advisory: <AlertTriangle size={16} />,
        warning: <AlertTriangle size={16} />,
        critical: <ShieldAlert size={16} className="animate-pulse" />
    };

    // Determine Language Key
    // Backend returns keys: ja, en, zh
    const langKey = locale.startsWith('zh') ? 'zh' : locale.startsWith('en') ? 'en' : 'ja';
    const displaySummary = mainAlert.summary?.[langKey] || mainAlert.summary?.ja || mainAlert.original_summary;

    return (
        <div className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 shadow-xl overflow-hidden backdrop-blur-xl border-b border-white/20
            ${mainAlert.severity === 'critical'
                ? 'bg-gradient-to-r from-rose-600/90 to-rose-700/90 text-white'
                : mainAlert.severity === 'warning'
                    ? 'bg-gradient-to-r from-amber-500/90 to-amber-600/90 text-white'
                    : mainAlert.severity === 'advisory'
                        ? 'bg-gradient-to-r from-yellow-500/90 to-yellow-600/90 text-white'
                        : 'bg-gradient-to-r from-blue-600/90 to-blue-700/90 text-white'
            }`}>
            <div className={`absolute inset-0 bg-white/5 opacity-0 transition-opacity duration-300 ${isVisible ? 'opacity-100' : ''}`} />

            <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setIsExpanded(!isExpanded)}>
                    <div className="flex-shrink-0 p-1.5 bg-white/20 rounded-lg group-hover:scale-110 transition-transform duration-300 shadow-sm border border-white/10">
                        {icons[mainAlert.severity]}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase tracking-widest opacity-80 mb-0.5">
                            {mainAlert.severity !== 'info' && mainAlert.region && mainAlert.alert_type
                                ? `${mainAlert.region} ${mainAlert.alert_type}`
                                : tWeather('jmaAlert')}
                        </span>
                        <span className="text-xs font-bold truncate max-w-[200px] drop-shadow-sm">{mainAlert.title}</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded-full hover:bg-white/30 transition-colors"
                    >
                        {isExpanded ? tWeather('collapse') : tWeather('details')}
                    </button>
                    <button onClick={() => setIsVisible(false)} className="opacity-60 hover:opacity-100">
                        <X size={16} />
                    </button>
                </div>
            </div>

            {isExpanded && (
                <div className="max-w-md mx-auto px-4 pb-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="h-px bg-white/20 mb-3" />
                    <p className="text-[11px] leading-relaxed font-medium whitespace-pre-wrap">
                        {displaySummary}
                    </p>
                    <div className="mt-2 flex justify-between items-center text-[8px] font-bold opacity-60 uppercase">
                        <span className="flex items-center gap-1">
                            Source: Japan Meteorological Agency (JMA)
                            <span className="px-1 py-0.5 bg-white/20 rounded text-[6px]">AI Translated</span>
                        </span>
                        <span>Updated: {new Date(mainAlert.updated).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Tokyo' })}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
