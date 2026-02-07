
import { supabaseAdmin } from '@/lib/supabase';
import { WEATHER_REGION_POLICY } from './policy';
import { generateLLMResponse } from '@/lib/ai/llmClient';
import { createHash } from 'crypto';

type WeatherSource = 'snapshot' | 'weather_cache' | 'open_meteo' | 'snapshot_fallback' | 'unknown';

export type ResolvedWeather = {
    temp: number;
    humidity: number;
    wind: number;
    condition: string;
    label: string;
    emoji: string;
    precipitationProbability: number | null;
    source: WeatherSource;
    confidence: number;
    update_time: string | null;
};

function isFreshTime(value: string | null | undefined, maxAgeMs: number) {
    if (!value) return false;
    const t = Date.parse(String(value));
    if (!Number.isFinite(t)) return false;
    return Date.now() - t < maxAgeMs;
}

function normalizeWeather(input: Partial<ResolvedWeather>): ResolvedWeather {
    return {
        temp: input.temp ?? 20,
        humidity: input.humidity ?? 50,
        wind: input.wind ?? 2,
        condition: input.condition ?? 'Unknown',
        label: input.label ?? input.condition ?? 'Unknown',
        emoji: input.emoji ?? '☁️',
        precipitationProbability: input.precipitationProbability ?? null,
        source: input.source ?? 'unknown',
        confidence: input.confidence ?? 0.3,
        update_time: input.update_time ?? null
    };
}

export async function resolveStationWeather(params: {
    stationId?: string;
    coordinates?: { lat: number; lon: number };
    snapshotWeather?: any;
    snapshotUpdatedAt?: string | null;
}): Promise<ResolvedWeather | null> {
    const snapshot = params.snapshotWeather as any;
    if (snapshot?.update_time && isFreshTime(snapshot.update_time, 3 * 60 * 60 * 1000)) {
        return normalizeWeather({
            temp: snapshot.temp,
            humidity: snapshot.humidity,
            wind: snapshot.wind,
            condition: snapshot.condition,
            label: snapshot.label,
            emoji: snapshot.emoji,
            precipitationProbability: snapshot.precipitationProbability ?? null,
            source: 'snapshot',
            confidence: 0.9,
            update_time: snapshot.update_time
        });
    }

    if (params.stationId) {
        try {
            const { data: cache } = await supabaseAdmin
                .from('weather_cache')
                .select('value, updated_at')
                .eq('station_id', params.stationId)
                .maybeSingle();

            if (cache?.value) {
                const val = cache.value as any;
                const updatedAt = cache.updated_at || val?.updated_at || val?.update_time || params.snapshotUpdatedAt || null;
                if (isFreshTime(updatedAt, 3 * 60 * 60 * 1000)) {
                    return normalizeWeather({
                        temp: val.temp,
                        humidity: val.humidity,
                        wind: val.wind,
                        condition: val.condition,
                        label: val.label || val.condition,
                        emoji: val.emoji,
                        precipitationProbability: val.precipitationProbability ?? null,
                        source: 'weather_cache',
                        confidence: 0.85,
                        update_time: updatedAt
                    });
                }
            }
        } catch {
        }
    }

    try {
        const lat = params.coordinates?.lat ?? 35.6895;
        const lon = params.coordinates?.lon ?? 139.6917;
        const live = await getLiveWeather(lat, lon);
        return normalizeWeather({
            temp: live.temp,
            humidity: live.humidity,
            wind: live.wind,
            condition: live.condition,
            label: live.label,
            emoji: live.emoji,
            precipitationProbability: live.precipitationProbability,
            source: 'open_meteo',
            confidence: 0.8,
            update_time: new Date().toISOString()
        });
    } catch {
    }

    if (params.stationId) {
        try {
            const { data: fallback } = await supabaseAdmin
                .from('transit_dynamic_snapshot')
                .select('weather_info')
                .not('weather_info', 'is', null)
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            if (fallback?.weather_info) {
                const w = fallback.weather_info as any;
                return normalizeWeather({
                    temp: w.temp,
                    humidity: w.humidity,
                    wind: w.wind,
                    condition: w.condition,
                    label: w.label,
                    emoji: w.emoji,
                    precipitationProbability: w.precipitationProbability ?? null,
                    source: 'snapshot_fallback',
                    confidence: 0.5,
                    update_time: w.update_time ?? null
                });
            }
        } catch {
        }
    }

    return null;
}

// Helper to translate/summarize alert using AI with Caching

// Helper to translate/summarize alert using AI with Caching
// (Kept for internal use or fallback, but main path uses pre-computed cache)
async function getTranslatedAlert(title: string, summary: string, updated: string, severity: string) {
    // ... Legacy AI logic if needed, but we rely on cron now ...
    return {
        ja: summary,
        en: 'Details available in Japanese.',
        zh: '詳細內容僅提供日文。'
    };
}

/**
 * Fetches latest weather alerts from Supabase Cache (Populated by Cron).
 * Zero-latency implementation.
 */
export async function fetchWeatherAlerts(locale: string = 'zh') {
    try {
        console.log('[WeatherService] Reading alerts from Cache...');

        // 1. Read from 'l2_cache' with fixed key
        const { data } = await supabaseAdmin
            .from('l2_cache')
            .select('value, updated_at')
            .eq('key', 'weather:alerts:global')
            .maybeSingle();

        if (!data || !data.value) {
            console.warn('[WeatherService] Cache Empty. Returning empty list.');
            return [];
        }

        // Optional: Check staleness?
        // Since Cron runs hourly, data > 2 hours old might be stale.
        // But better to show stale data than nothing or blocking.
        // We just return it.

        const cachedAlerts = data.value as any[];

        // 2. Filter/Map for Locale
        return cachedAlerts.map(entry => {
            let displaySummary = entry.summary.zh;
            if (locale === 'en') displaySummary = entry.summary.en;
            if (locale === 'ja') displaySummary = entry.summary.ja;

            return {
                title: entry.title,
                summary: displaySummary,
                severity: entry.severity,
                region: entry.region,
                updated: entry.updated
            };
        });

    } catch (error: any) {
        console.error('Weather Service Cache Read Error:', error.message);
        return [];
    }
}

// Open-Meteo Live Weather Fetch
export async function getLiveWeather(lat: number = 35.6895, lon: number = 139.6917) {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Asia%2FTokyo`;

        const res = await fetch(url, { next: { revalidate: 300 } });
        if (!res.ok) throw new Error('OpenMeteo Failed');

        const data = await res.json();
        const current = data.current;

        if (!current) throw new Error('No current weather data');

        const code = current.weather_code;
        const condition = getWeatherLabel(code);
        const emoji = getWeatherEmoji(code);

        return {
            temp: current.temperature_2m,
            humidity: current.relative_humidity_2m,
            wind: current.wind_speed_10m,
            condition,
            label: condition, // Compat
            emoji,
            precipitationProbability: 0 // Not in basic current api
        };
    } catch (e) {
        console.warn('Live Weather Warning:', e);
        return {
            temp: 20,
            humidity: 50,
            wind: 2,
            condition: 'Unknown',
            label: 'Unknown',
            emoji: '☁️',
            precipitationProbability: 0
        };
    }
}

function getWeatherLabel(code: number): string {
    if (code === 0) return 'Clear';
    if (code >= 1 && code <= 3) return 'Cloudy';
    if (code >= 45 && code <= 48) return 'Fog';
    if (code >= 51 && code <= 67) return 'Rain';
    if (code >= 71 && code <= 77) return 'Snow';
    if (code >= 80 && code <= 82) return 'Showers';
    if (code >= 95) return 'Thunderstorm';
    return 'Unknown';
}

function getWeatherEmoji(code: number): string {
    if (code === 0) return '☀️';
    if (code >= 1 && code <= 3) return '☁️';
    if (code >= 45 && code <= 48) return '🌫️';
    if (code >= 51 && code <= 67) return '🌧️';
    if (code >= 71 && code <= 77) return '❄️';
    if (code >= 80 && code <= 82) return '🌦️';
    if (code >= 95) return '⚡️';
    return '🌥️';
}
