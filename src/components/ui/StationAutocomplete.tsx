'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, Loader2, MapPin } from 'lucide-react';
import type { Station } from '@/types/station';
import type { SupportedLocale } from '@/lib/l4/assistantEngine';

interface StationAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    onSelect: (station: Station) => void;
    placeholder?: string;
    locale?: SupportedLocale;
    disabled?: boolean;
    className?: string;
}

export function StationAutocomplete({
    value,
    onChange,
    onSelect,
    placeholder,
    locale = 'zh-TW',
    disabled = false,
    className = '',
}: StationAutocompleteProps) {
    const [suggestions, setSuggestions] = useState<Station[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    const abortControllerRef = useRef<AbortController | null>(null);

    // Debounced search
    const searchStations = useCallback(async (query: string) => {
        if (query.length < 1) {
            setSuggestions([]);
            return;
        }

        // Cancel previous request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setIsLoading(true);
        try {
            const res = await fetch(`/api/stations/search?q=${encodeURIComponent(query)}`, {
                signal: controller.signal
            });
            if (res.ok) {
                const data = await res.json();
                setSuggestions(data.stations || []);
            }
        } catch (e) {
            if (e instanceof Error && e.name === 'AbortError') {
                // Ignore abort errors
                return;
            }
            console.error('Station search failed:', e);
        } finally {
            // Only clear loading if this is the active request
            if (abortControllerRef.current === controller) {
                setIsLoading(false);
                abortControllerRef.current = null;
            }
        }
    }, []);

    // Handle input change with debounce
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        onChange(newValue);
        setShowDropdown(true);
        setHighlightedIndex(-1);

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            searchStations(newValue);
        }, 300);
    };

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!showDropdown) return;

        switch (e.key) {
            case 'ArrowDown':
                if (suggestions.length === 0) return;
                e.preventDefault();
                setHighlightedIndex(prev =>
                    prev < suggestions.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                if (suggestions.length === 0) return;
                e.preventDefault();
                setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
                break;
            case 'Enter':
                e.preventDefault();
                if (suggestions.length > 0) {
                    if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
                        handleSelect(suggestions[highlightedIndex]);
                        return;
                    }
                    handleSelect(suggestions[0]);
                    return;
                }
                if (value.trim().length > 0 && !isLoading) {
                    void (async () => {
                        setIsLoading(true);
                        try {
                            const res = await fetch(`/api/stations/search?q=${encodeURIComponent(value.trim())}`);
                            if (!res.ok) return;
                            const data = await res.json();
                            const stations = (data?.stations || []) as Station[];
                            if (stations.length > 0) {
                                handleSelect(stations[0]);
                            }
                        } catch {
                        } finally {
                            setIsLoading(false);
                        }
                    })();
                }
                break;
            case 'Escape':
                setShowDropdown(false);
                setHighlightedIndex(-1);
                break;
        }
    };

    // Handle selection
    const handleSelect = (station: Station) => {
        onChange(getDisplayName(station));
        onSelect(station);
        setShowDropdown(false);
        setHighlightedIndex(-1);
    };

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent | TouchEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(e.target as Node) &&
                inputRef.current &&
                !inputRef.current.contains(e.target as Node)
            ) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside, { passive: true });
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, []);

    // Get display name based on locale
    const getDisplayName = (station: Station) => {
        if (locale === 'zh-TW') return station.name['zh-TW'] || station.name.ja || station.name.en || station.id;
        if (locale === 'ja') return station.name.ja || station.name['zh-TW'] || station.name.en || station.id;
        if (locale === 'en') return station.name.en || station.name.ja || station.name['zh-TW'] || station.id;
        return station.name.ja || station.name.en || station.id;
    };

    const defaultPlaceholder = locale === 'zh-TW'
        ? '搜尋車站...'
        : locale === 'ja'
            ? '駅を検索...'
            : 'Search stations...';

    return (
        <div className={`relative w-full ${className}`}>
            <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => value.length > 0 && setShowDropdown(true)}
                    placeholder={placeholder || defaultPlaceholder}
                    disabled={disabled}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border border-slate-200 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition-all disabled:opacity-50"
                />
            </div>

            {showDropdown && suggestions.length > 0 && (
                <div
                    ref={dropdownRef}
                    className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden max-h-64 overflow-y-auto"
                >
                    {suggestions.map((station, idx) => (
                        <button
                            key={station.id}
                            onClick={() => handleSelect(station)}
                            className={`w-full px-4 py-3 text-left flex items-start gap-3 transition-colors ${idx === highlightedIndex
                                ? 'bg-indigo-50'
                                : 'hover:bg-slate-50'
                                }`}
                        >
                            <MapPin size={16} className="text-indigo-600 mt-0.5 shrink-0" />
                            <div className="min-w-0 flex-1">
                                <div className="text-sm font-black text-slate-900 truncate">
                                    {getDisplayName(station)}
                                </div>
                                <div className="text-[11px] font-bold text-slate-500 truncate">
                                    {station.operator} · {station.railway}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {showDropdown && value.length > 0 && !isLoading && suggestions.length === 0 && (
                <div className="absolute z-50 w-full mt-2 px-4 py-3 bg-white rounded-2xl shadow-xl border border-slate-100 text-sm font-bold text-slate-500">
                    {locale === 'zh-TW'
                        ? '找不到符合的車站'
                        : locale === 'ja'
                            ? '該当する駅がありません'
                            : 'No stations found'}
                </div>
            )}
        </div>
    );
}
