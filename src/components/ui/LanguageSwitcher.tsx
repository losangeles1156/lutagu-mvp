'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter, Link } from '@/navigation';
import { useSearchParams } from 'next/navigation'; // Keep this for query params
import { Globe } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { useUserStore } from '@/stores/userStore';

interface LanguageSwitcherProps {
    className?: string;
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
    const locale = useLocale();
    const tCommon = useTranslations('common');
    const router = useRouter(); // Typed router from next-intl
    const pathname = usePathname(); // Pathname WITHOUT locale
    const searchParams = useSearchParams();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const setLocale = useUserStore(s => s.setLocale);

    // Sync store locale when system locale changes
    useEffect(() => {
        const normalizedLocale = locale === 'zh' ? 'zh-TW' : locale;
        setLocale(normalizedLocale as 'zh-TW' | 'ja' | 'en');
    }, [locale, setLocale]);

    // Close dropdown when clicking outside or pressing Escape
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            // Add explicit null check and defensive logic for ref access
            const isOutsideContainer = containerRef.current && !containerRef.current.contains(target);
            const isOutsideDropdown = !dropdownRef.current || !dropdownRef.current.contains(target);

            if (isOutsideContainer && isOutsideDropdown) {
                setIsOpen(false);
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsOpen(false);
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const labels: Record<string, string> = {
        'zh': '繁體中文',
        'zh-TW': '繁體中文',
        'en': 'English',
        'ja': '日本語'
    };

    const availableLocales = ['zh-TW', 'en', 'ja'];

    // Handler for changing locale
    const handleLocaleChange = (newLocale: string) => {
        setIsOpen(false);
        // Build query object from search params
        const queryObj: Record<string, string> = {};
        searchParams.forEach((value, key) => {
            queryObj[key] = value;
        });
        // Use next-intl router with pathname object format
        // @ts-ignore - next-intl typing issue
        router.replace({ pathname, query: queryObj }, { locale: newLocale });
    };

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "glass-effect rounded-2xl p-3.5 hover:bg-white transition-all active:scale-90 shadow-xl shadow-black/5 flex items-center justify-center text-gray-500",
                    className
                )}
                aria-label={tCommon('languageSwitcherLabel')}
            >
                <Globe size={22} className={isOpen ? 'rotate-12 text-indigo-600' : ''} aria-hidden="true" />
            </button>

            {isOpen && typeof document !== 'undefined' && createPortal(
                <div
                    ref={dropdownRef}
                    className="fixed right-4 top-20 w-40 bg-white/90 backdrop-blur-2xl rounded-[24px] shadow-2xl border border-black/[0.05] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300 z-[100000]"
                    style={{ top: containerRef.current ? containerRef.current.getBoundingClientRect().bottom + 8 : 80, right: containerRef.current ? window.innerWidth - containerRef.current.getBoundingClientRect().right : 16 }}
                >
                    <div className="p-1">
                        {availableLocales.map((l) => (
                            <Link
                                key={l}
                                href={{
                                    pathname: pathname,
                                    query: Object.fromEntries(searchParams.entries())
                                }}
                                locale={l as "zh-TW" | "zh" | "en" | "ja"}
                                onClick={() => setIsOpen(false)}
                                className={`w-full px-4 py-3 text-xs font-black text-left rounded-xl transition-all duration-300 flex items-center justify-between ${locale === l
                                    ? 'text-indigo-600 bg-indigo-50 shadow-inner'
                                    : 'text-gray-500 hover:bg-black/[0.03] hover:text-gray-900'
                                    }`}
                            >
                                <span>{labels[l] || l}</span>
                                {locale === l && <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full shadow-[0_0_8px_rgba(79,70,229,0.4)]" />}
                            </Link>
                        ))}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
