'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Cloud, Sun, CloudRain, CloudSnow, Wind, Droplets, AlertTriangle, ShieldAlert, ExternalLink, Umbrella } from 'lucide-react';

import { StationUIProfile, WeatherInfo } from '@/lib/types/stationStandard';

interface WeatherData {
    temp: number;
    condition: string;
    label: string;
    emoji: string;
    wind: number;
    humidity: number;
    precipitationProbability: number | null;
}

interface JMAAlert {
    title: string;
    summary: string;
    severity: 'info' | 'advisory' | 'warning' | 'critical';
    alert_type?: string;
    region?: string;
}

interface SmartWeatherCardProps {
    onAdviceUpdate?: (advice: string) => void;
    initialData?: WeatherInfo;
}

export function SmartWeatherCard({ onAdviceUpdate, initialData }: SmartWeatherCardProps) {
    const tL2 = useTranslations('l2');
    const locale = useLocale();

    const onAdviceUpdateRef = useRef(onAdviceUpdate);

    useEffect(() => {
        onAdviceUpdateRef.current = onAdviceUpdate;
    }, [onAdviceUpdate]);

    // Initialize with prop data if available to avoid loading state
    const [weather, setWeather] = useState<WeatherData | null>(() => {
        if (initialData) {
            // Map simple WeatherInfo to rich WeatherData
            // Note: We won't have humidity/precip initially, so default them
            const code = initialData.iconCode ? parseInt(initialData.iconCode) : 0;
            let emoji = '☁️';
            if (code <= 1) emoji = '☀️';
            else if (code >= 51) emoji = '🌧️';

            return {
                temp: initialData.temp,
                condition: initialData.condition,
                label: initialData.condition, // Simple label init
                emoji: emoji,
                wind: initialData.windSpeed,
                humidity: 0, // Hidden until hydrated
                precipitationProbability: null
            };
        }
        return null;
    });

    const [advice, setAdvice] = useState<string | null>(null);
    const [alert, setAlert] = useState<JMAAlert | null>(null);
    const [jmaLink, setJmaLink] = useState<string | null>(null);
    const [loading, setLoading] = useState(!initialData); // Only load if no initial data

    useEffect(() => {
        let isMounted = true;

        async function fetchAll() {
            // If we didn't have initial data, we show loading. 
            // If we did, we still fetch in background to update/hydrate details.
            if (!initialData) setLoading(true);

            try {
                // 1. Fetch Live Weather (Full Data)
                const liveRes = await fetch('/api/weather/live');
                if (!liveRes.ok) throw new Error('Live fetch failed');
                const liveData = await liveRes.json();

                if (isMounted) {
                    setWeather(liveData);
                }

                // 2. Fetch JMA Alerts
                let currentAlert: JMAAlert | null = null;
                try {
                    const alertRes = await fetch('/api/weather');
                    if (alertRes.ok) {
                        const alertData = await alertRes.json();
                        if (alertData.alerts && alertData.alerts.length > 0) {
                            currentAlert = alertData.alerts[0];
                            if (isMounted) setAlert(currentAlert);
                        }
                    }
                } catch (e) { }

                // 3. Fetch AI Advice
                const isEmergency = currentAlert && (currentAlert.severity === 'warning' || currentAlert.severity === 'critical');
                const adviceParams = new URLSearchParams({
                    temp: String(liveData.temp),
                    condition: liveData.condition || liveData.label,
                    wind: String(liveData.wind),
                    humidity: String(liveData.humidity),
                    precipProb: String(liveData.precipitationProbability ?? ''),
                    locale: locale,
                    ...(isEmergency && { emergency: 'true', jmaSummary: currentAlert?.summary || '' })
                });

                const adviceRes = await fetch(`/api/weather/advice?${adviceParams}`);
                if (adviceRes.ok) {
                    const adviceData = await adviceRes.json();
                    if (isMounted) {
                        setAdvice(adviceData.advice);
                        if (adviceData.jma_link) setJmaLink(adviceData.jma_link);
                        onAdviceUpdateRef.current?.(adviceData.advice);
                    }
                }
            } catch (e) {
                console.warn('[SmartWeatherCard] Error:', e);
            } finally {
                if (isMounted) setLoading(false);
            }
        }
        fetchAll();
        return () => { isMounted = false; };
    }, [locale, initialData]);

    if (loading || !weather) {
        return (
            <div className="bg-gradient-to-br from-sky-400 to-indigo-500 rounded-3xl p-5 animate-pulse h-40" />
        );
    }

    const isEmergencyMode = alert && (alert.severity === 'warning' || alert.severity === 'critical');
    const isCritical = alert?.severity === 'critical';

    // Dynamic Gradient based on mode
    const bgGradient = isEmergencyMode
        ? isCritical
            ? 'from-rose-600 via-rose-500 to-amber-500'
            : 'from-amber-500 via-amber-400 to-yellow-400'
        : alert?.severity === 'advisory'
            ? 'from-yellow-400 via-yellow-500 to-orange-400'
            : 'from-sky-400 via-blue-500 to-indigo-600';

    return (
        <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${bgGradient} text-white shadow-xl transition-all duration-500`}>
            {/* Decorative Blur */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/5 rounded-full blur-3xl" />

            <div className="relative z-10 p-5 space-y-4">
                {/* Header Row */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {isEmergencyMode ? (
                            isCritical ? <ShieldAlert size={20} className="animate-pulse" /> : <AlertTriangle size={20} />
                        ) : (
                            <span className="text-2xl">{weather.emoji}</span>
                        )}
                        <span className="text-xs font-black uppercase tracking-widest opacity-80">
                            {/* Only show specific alert type if it's an actual warning/advisory.
                                If it's just Info (e.g. Cancellation), don't show the scary type name. */}
                            {alert && alert.severity !== 'info' && alert.alert_type && alert.region
                                ? `${alert.region} ${alert.alert_type}`
                                : isCritical ? tL2('criticalAlert')
                                    : isEmergencyMode ? tL2('warningAlert')
                                        : 'TOKYO'}
                        </span>
                    </div>
                    <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">
                        Live
                    </span>
                </div>

                {/* Main Data */}
                <div className="flex items-end justify-between">
                    <div>
                        <div className="text-5xl font-black tracking-tight">{weather.temp}°</div>
                        <div className="text-sm font-bold opacity-90 mt-1">{weather.emoji} {weather.label}</div>
                    </div>
                    <div className="text-right space-y-1 text-xs font-semibold opacity-80">
                        <div className="flex items-center gap-1 justify-end"><Wind size={12} /> {weather.wind} m/s</div>
                        <div className="flex items-center gap-1 justify-end"><Droplets size={12} /> {weather.humidity}%</div>
                        {weather.precipitationProbability !== null && (
                            <div className="flex items-center gap-1 justify-end"><Umbrella size={12} /> {weather.precipitationProbability}%</div>
                        )}
                    </div>
                </div>

                {/* AI Advice */}
                {advice && (
                    <div className="pt-3 border-t border-white/20">
                        <p className={`text-sm font-medium leading-relaxed ${isEmergencyMode ? '' : 'italic'}`}>
                            {isEmergencyMode ? '⚠️' : '💡'} {advice}
                        </p>
                        {jmaLink && (
                            <a
                                href={jmaLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold bg-white/20 hover:bg-white/30 px-2 py-1 rounded-full transition-colors"
                            >
                                <ExternalLink size={10} /> {tL2('viewJmaDetails')}
                            </a>
                        )}
                    </div>
                )}

                {/* Source Attribution */}
                <div className="pt-2 border-t border-white/10 text-[8px] font-bold opacity-50 flex justify-between uppercase">
                    <span className="flex items-center gap-2">
                        <span>Data:</span>
                        <a
                            href="https://open-meteo.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline underline-offset-2 hover:opacity-80"
                        >
                            Open-Meteo
                        </a>
                        <a
                            href="https://open-meteo.com/en/licence"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline underline-offset-2 hover:opacity-80"
                        >
                            CC BY 4.0
                        </a>
                    </span>
                    <a
                        href="https://www.jma.go.jp/jma/index.html"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-2 hover:opacity-80"
                    >
                        Alert: JMA
                    </a>
                </div>
            </div>
        </div>
    );
}
