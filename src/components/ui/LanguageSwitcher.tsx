'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/navigation';
import { useSearchParams } from 'next/navigation'; // Keep this for query params
import { Globe } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
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
    const setLocale = useUserStore(s => s.setLocale);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleChange = (newLocale: string) => {
        if (newLocale === locale) {
            setIsOpen(false);
            return;
        }

        // Update zustand store immediately for in-place UI updates
        setLocale(newLocale as 'zh-TW' | 'ja' | 'en');

        // Build new search params, updating any locale-prefixed paths in 'next' parameter
        const newParams = new URLSearchParams(searchParams.toString());
        const nextParam = newParams.get('next');
        if (nextParam) {
            // Update locale prefix in the 'next' path if it exists
            // Matches paths like /zh/..., /en/..., /ja/..., /zh-TW/...
            const updatedNext = nextParam.replace(
                /^\/(?:zh-TW|zh|en|ja|ar)(\/|$)/,
                `/${newLocale}$1`
            );
            newParams.set('next', updatedNext);
        }

        const queryString = newParams.toString();
        const url = queryString ? `${pathname}?${queryString}` : pathname;

        // "replace" to switch language in-place (no history push usually preferred for lang switch, or push is fine)
        // router.replace takes the PATH (without locale) and adds the new locale prefix automatically
        router.replace(url, { locale: newLocale as any, scroll: false });
        setIsOpen(false);
    };

    const labels: Record<string, string> = {
        'zh': '繁體中文',
        'zh-TW': '繁體中文',
        'en': 'English',
        'ja': '日本語'
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

            {isOpen && (
                <div className="fixed right-4 top-20 w-40 bg-white/90 backdrop-blur-2xl rounded-[24px] shadow-2xl border border-black/[0.05] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300 z-[9999]">
                    <div className="p-1">
                        {['zh', 'en', 'ja'].map((l) => (
                            <button
                                key={l}
                                onClick={() => handleChange(l)}
                                className={`w-full px-4 py-3 text-xs font-black text-left rounded-xl transition-all duration-300 flex items-center justify-between ${locale === l
                                    ? 'text-indigo-600 bg-indigo-50 shadow-inner'
                                    : 'text-gray-500 hover:bg-black/[0.03] hover:text-gray-900'
                                    }`}
                            >
                                <span>{labels[l]}</span>
                                {locale === l && <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full shadow-[0_0_8px_rgba(79,70,229,0.4)]" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
