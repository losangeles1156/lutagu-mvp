'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Cloud, Sun, CloudRain, CloudSnow, Wind, Droplets, AlertTriangle, ShieldAlert, ExternalLink, Umbrella, Loader2 } from 'lucide-react';

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
}

export function SmartWeatherCard({ onAdviceUpdate }: SmartWeatherCardProps) {
    const tL2 = useTranslations('l2');
    const locale = useLocale();
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [advice, setAdvice] = useState<string | null>(null);
    const [alert, setAlert] = useState<JMAAlert | null>(null);
    const [jmaLink, setJmaLink] = useState<string | null>(null);
    // Progressive loading states
    const [weatherLoading, setWeatherLoading] = useState(true);
    const [adviceLoading, setAdviceLoading] = useState(false);

    // Refs to prevent stale closure issues
    const onAdviceUpdateRef = useRef(onAdviceUpdate);
    onAdviceUpdateRef.current = onAdviceUpdate;

    // Memoized advice fetcher (non-blocking)
    const fetchAdvice = useCallback(async (weatherData: WeatherData, currentAlert: JMAAlert | null) => {
        setAdviceLoading(true);
        try {
            const isEmergency = currentAlert && (currentAlert.severity === 'warning' || currentAlert.severity === 'critical');
            const adviceParams = new URLSearchParams({
                temp: String(weatherData.temp),
                condition: weatherData.condition || weatherData.label,
                wind: String(weatherData.wind),
                humidity: String(weatherData.humidity),
                precipProb: String(weatherData.precipitationProbability ?? ''),
                locale: locale,
                ...(isEmergency && { emergency: 'true', jmaSummary: currentAlert?.summary || '' })
            });

            const adviceRes = await fetch(`/api/weather/advice?${adviceParams}`);
            if (adviceRes.ok) {
                const adviceData = await adviceRes.json();
                setAdvice(adviceData.advice);
                if (adviceData.jma_link) setJmaLink(adviceData.jma_link);
                onAdviceUpdateRef.current?.(adviceData.advice);
            }
        } catch (e) {
            console.warn('[SmartWeatherCard] Advice fetch error:', e);
        } finally {
            setAdviceLoading(false);
        }
    }, [locale]);

    useEffect(() => {
        let isMounted = true;

        async function fetchWeatherAndAlerts() {
            setWeatherLoading(true);
            try {
                // Parallel fetch: Weather + Alerts at the same time
                const [liveRes, alertRes] = await Promise.all([
                    fetch('/api/weather/live'),
                    fetch('/api/weather').catch(() => null) // Don't fail if alerts fail
                ]);

                if (!isMounted) return;

                if (!liveRes.ok) throw new Error('Live fetch failed');
                const liveData = await liveRes.json();
                setWeather(liveData);

                // Process alerts
                let currentAlert: JMAAlert | null = null;
                if (alertRes?.ok) {
                    try {
                        const alertData = await alertRes.json();
                        if (alertData.alerts && alertData.alerts.length > 0) {
                            currentAlert = alertData.alerts[0];
                            setAlert(currentAlert);
                        }
                    } catch (e) {
                        // Ignore alert parsing errors
                    }
                }

                // Weather is loaded - show UI immediately
                setWeatherLoading(false);

                // Then fetch AI advice asynchronously (non-blocking)
                if (isMounted) {
                    fetchAdvice(liveData, currentAlert);
                }
            } catch (e) {
                console.warn('[SmartWeatherCard] Weather fetch error:', e);
                if (isMounted) setWeatherLoading(false);
            }
        }

        fetchWeatherAndAlerts();

        return () => { isMounted = false; };
    }, [locale, fetchAdvice]);

    if (weatherLoading || !weather) {
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

                {/* AI Advice - Progressive Loading */}
                <div className="pt-3 border-t border-white/20 min-h-[60px]">
                    {adviceLoading ? (
                        <div className="flex items-center gap-2 text-sm text-white/70">
                            <Loader2 size={14} className="animate-spin" />
                            <span className="italic">{tL2('loadingAdvice') || 'Loading advice...'}</span>
                        </div>
                    ) : advice ? (
                        <>
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
                        </>
                    ) : null}
                </div>

                {/* Source Attribution */}
                <div className="pt-2 border-t border-white/10 text-[8px] font-bold opacity-50 flex justify-between uppercase">
                    <span>Data: Open-Meteo</span>
                    <span>Alert: JMA</span>
                </div>
            </div>
        </div>
    );
}
